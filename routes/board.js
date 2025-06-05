const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const router = express.Router();
const multer = require('multer'); // 파일 업로드를 위해 multer 추가
const fs = require('fs'); // 파일 시스템 모듈 추가 (uploads 폴더 생성용)

// 데이터베이스 경로 설정
const dbPath = path.join(__dirname, '../db/board.db'); // 또는 database.sqlite
const db = new sqlite3.Database(dbPath);

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 정확한 uploads 폴더 경로 설정 (프로젝트 루트/public/uploads)
        const uploadPath = path.join(__dirname, '../public/uploads');

        // uploads 폴더가 없으면 생성
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath); // 정확한 경로 전달
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // 고유한 파일명 생성
    }
});
const upload = multer({ storage: storage });

// 미들웨어: 로그인 여부 확인
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        req.userId = req.session.user.id;
        req.username = req.session.user.username;
        req.userName = req.session.user.name; // 작성자 이름으로 사용할 수 있도록 추가
        next();
    } else {
        res.redirect('/user/login?message=로그인이 필요합니다.');
    }
}

async function getAllChildPostIds(db, parentId) {
    const childIds = [];

    async function recurse(currentId) {
        const rows = await new Promise((resolve, reject) => {
            db.all('SELECT id FROM posts WHERE parent_id = ?', [currentId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        for (const row of rows) {
            childIds.push(row.id);
            await recurse(row.id); // 재귀적으로 하위 댓글 탐색
        }
    }

    await recurse(parentId);
    return childIds;
}


// 게시글 목록
// 게시글 목록 (수정된 부분)
router.get('/', isAuthenticated, (req, res) => {
    const currentUserId = req.userId; // 로그인된 사용자의 ID
    const isAdmin = req.session.user && req.session.user.isAdmin === 1; // 세션에서 isAdmin 정보 가져오기

    // SQL 쿼리 수정: 답글이 원글 아래에 오도록 정렬 순서 변경
    const sql = `
        SELECT id, title, author, created_at, parent_id, user_id
        FROM posts
        ORDER BY
            CASE WHEN parent_id IS NULL THEN id ELSE parent_id END ASC, -- 원글의 ID 또는 답글의 parent_id를 기준으로 묶음 정렬
            parent_id IS NOT NULL ASC, -- 답글은 원글 뒤로 정렬 (원글이 먼저, 답글이 나중)
            created_at ASC; -- 같은 묶음 내에서 생성 시간 기준으로 오름차순 (오래된 글이 먼저)
    `;

    db.all(sql, [], (err, posts) => {
        if (err) {
            console.error('게시글 불러오기 오류:', err.message);
            return res.status(500).send('게시글을 불러오는 데 실패했습니다.');
        }

        const postsWithStatus = posts.map(post => ({
            ...post,
            isAuthor: (post.user_id === currentUserId),
            // isAnonPost: (post.author === '익명') // 이 정보는 EJS에서 직접 계산해도 됩니다.
        }));

        // EJS 템플릿으로 posts와 isAdmin 정보를 전달
        res.render('board', { posts: postsWithStatus, user: req.session.user }); // user 객체 전체를 전달하여 isAdmin 및 기타 정보 활용
    });
});

// 새 글 작성 페이지
router.get('/new', isAuthenticated, (req, res) => {
    res.render('post', { post: null, parentId: null, file: null }); // file: null 추가 (views/post.ejs 에서 사용)
});

// 파일 다운로드 라우터
router.get('/download/:fileId', (req, res) => {
    const fileId = req.params.fileId;

    db.get('SELECT filename, filepath FROM files WHERE id = ?', [fileId], (err, file) => {
        if (err) {
            console.error('파일 정보 조회 오류 (다운로드):', err.message);
            return res.status(500).send('파일을 찾을 수 없습니다.');
        }
        if (!file) {
            return res.status(404).send('파일 정보를 찾을 수 없습니다.');
        }

        const actualFilePath = path.join(__dirname, '../public', file.filepath); // 실제 서버 내 파일 경로
        const originalFilename = file.filename; // 원본 파일명 (예: "내문서.hwp")

        // 파일이 실제로 존재하는지 확인
        if (fs.existsSync(actualFilePath)) {
            // 한글 파일명 깨짐 방지를 위한 Content-Disposition 헤더 설정
            // RFC 5987에 따른 UTF-8 인코딩 (브라우저 호환성 높음)
            const encodedFilename = encodeURIComponent(originalFilename);
            const contentDisposition = `attachment; filename*=UTF-8''${encodedFilename}`;

            res.setHeader('Content-Disposition', contentDisposition);
            res.setHeader('Content-Type', 'application/octet-stream'); // 모든 파일 타입에 대해 통칭
            // 또는 특정 파일 타입에 따라 Content-Type 설정 (예: hwp는 'application/x-hwp')
            // mime-types 패키지 등을 사용하면 더 정확한 MIME 타입을 알 수 있습니다.
            // const mime = require('mime-types');
            // res.setHeader('Content-Type', mime.lookup(originalFilename) || 'application/octet-stream');


            // 파일 전송
            res.sendFile(actualFilePath, (sendErr) => {
                if (sendErr) {
                    console.error('파일 전송 오류:', sendErr.message);
                    // 이미 헤더가 전송되었을 수 있으므로 별도의 응답은 하지 않음
                }
            });
        } else {
            console.error('실제 파일이 존재하지 않습니다:', actualFilePath);
            res.status(404).send('다운로드할 파일을 찾을 수 없습니다. (파일 없음)');
        }
    });
});

// 새 글 작성 처리 (user_id 저장)
router.post('/new', isAuthenticated, upload.single('file'), (req, res) => {
    const { title, content, parent_id } = req.body;
    const author = req.userName; // 로그인된 사용자의 이름을 작성자로 사용
    const userId = req.userId;   // 로그인된 사용자의 ID를 저장
    const file = req.file;       // Multer가 처리한 파일 정보

    // user_id는 NOT NULL 제약조건이 있으므로 반드시 존재해야 함
    if (!userId) {
        // 이 경우는 isAuthenticated 미들웨어에서 처리되어야 하지만, 혹시 모를 상황 대비
        console.error('User ID not found for new post.');
        if (file) { // 에러 발생 시 업로드된 파일 삭제
            fs.unlink(file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file on user_id missing:', unlinkErr.message);
            });
        }
        return res.status(401).send('로그인이 필요합니다. (사용자 ID 없음)');
    }

    // 1. posts 테이블에 게시글 정보 삽입
    db.run(
        'INSERT INTO posts (title, content, parent_id, author, user_id) VALUES (?, ?, ?, ?, ?)',
        [title, content, parent_id || null, author, userId], // parent_id가 null일 수 있으므로 || null
        function (err) {
            if (err) {
                console.error('글 작성 실패 (posts 테이블):', err.message);
                // 글 저장 실패 시, 이미 업로드된 파일이 있다면 삭제
                if (file) {
                    fs.unlink(file.path, (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting uploaded file after post DB error:', unlinkErr.message);
                    });
                }
                return res.status(500).send('게시글 작성 실패');
            }

            const postId = this.lastID; // 방금 삽입된 게시글의 ID

            // 2. 파일이 첨부되었다면 files 테이블에 파일 정보 삽입
            if (file) {
                // filepath는 웹에서 접근할 수 있는 public 경로를 저장
                const filepathForDB = '/uploads/' + path.basename(file.path); // Multer가 저장한 파일명 사용
                db.run(
                    'INSERT INTO files (post_id, filename, filepath) VALUES (?, ?, ?)',
                    [postId, file.originalname, filepathForDB],
                    (fileErr) => {
                        if (fileErr) {
                            console.error('파일 정보 저장 실패 (files 테이블):', fileErr.message);
                            // 파일 정보 DB 저장 실패 시, 업로드된 파일 삭제 (선택 사항)
                            fs.unlink(file.path, (unlinkErr) => {
                                if (unlinkErr) console.error('Error deleting uploaded file after file DB error:', unlinkErr.message);
                            });
                            // 이 경우 게시글은 이미 저장되었지만, 파일 정보가 누락될 수 있음
                            // 사용자에게는 게시글은 작성되었으나 파일 저장에 문제가 있었다는 메시지 전달 고려
                        }
                        res.redirect('/board'); // 파일 저장 성공/실패와 무관하게 게시판으로 리다이렉트
                    }
                );
            } else {
                // 파일이 없는 경우 바로 게시판으로 리다이렉트
                res.redirect('/board');
            }
        }
    );
});
// 게시글 상세 보기 (MODIFIED)
router.get('/view/:id', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const currentUserId = req.userId; // 로그인된 사용자의 ID

    db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, post) => {
        if (err) {
            console.error('게시글 상세 보기 오류:', err.message);
            return res.status(500).send('게시글을 불러오는 데 실패했습니다.');
        }
        if (!post) {
            return res.status(404).send('게시글을 찾을 수 없습니다.');
        }

        // 해당 게시글에 연결된 파일 정보 가져오기
        db.get('SELECT id, filename, filepath FROM files WHERE post_id = ?', [postId], (fileErr, file) => {
            if (fileErr) {
                console.error('파일 정보 불러오기 실패:', fileErr.message);
                file = null;
            }

            // 게시글 작성자와 현재 로그인한 사용자가 동일한지 확인하여 post 객체에 isAuthor 속성 추가
            const postWithAuthorStatus = {
                ...post,
                isAuthor: (post.user_id === currentUserId) // <-- Add isAuthor directly to the post object
            };

            // EJS 템플릿으로 수정된 post 객체와 user 객체를 전달
            res.render('detail', {
                post: postWithAuthorStatus, // <-- Use the modified post object
                file: file,
                user: req.session.user // <-- Pass the user object for isAdmin/isAnonPost in EJS
            });
        });
    });
});

// ... rest of your code ...


// 게시글 수정 페이지
router.get('/edit/:id', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const currentUserId = req.userId;

    db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, post) => {
        if (err) {
            console.error('게시글 불러오기 오류 (수정 페이지):', err.message);
            return res.status(500).send('게시글을 불러오는 데 실패했습니다.');
        }
        if (!post) {
            return res.status(404).send('게시글을 찾을 수 없습니다.');
        }

        // 권한 확인: 로그인한 사용자가 게시글 작성자인지 확인
        if (post.user_id !== currentUserId) {
            return res.status(403).send('수정 권한이 없습니다.');
        }

        // 해당 게시글에 연결된 파일 정보 가져오기
        db.get('SELECT filename, filepath FROM files WHERE post_id = ?', [postId], (fileErr, file) => {
            if (fileErr) {
                console.error('파일 정보 불러오기 실패 (수정 페이지):', fileErr.message);
                file = null;
            }
            res.render('post', { post: post, parentId: post.parent_id, file: file }); // file 정보 전달
        });
    });
});

// 게시글 수정 처리 (권한 확인)
router.post('/edit/:id', isAuthenticated, upload.single('file'), (req, res) => {
    const postId = req.params.id;
    const { title, content } = req.body;
    const currentUserId = req.userId;
    const newFile = req.file; // 새로 업로드된 파일 정보

    db.get('SELECT user_id FROM posts WHERE id = ?', [postId], (err, post) => {
        if (err || !post) {
            console.error(err ? '게시글 찾기 오류 (수정 처리):' + err.message : '수정할 게시글을 찾을 수 없음');
            if (newFile) fs.unlink(newFile.path, (unlinkErr) => { if (unlinkErr) console.error('Error deleting new file on post not found:', unlinkErr.message); });
            return res.status(404).send('게시글을 찾을 수 없거나 오류가 발생했습니다.');
        }

        // 권한 확인: 로그인한 사용자가 게시글 작성자인지 확인
        if (post.user_id !== currentUserId) {
            if (newFile) fs.unlink(newFile.path, (unlinkErr) => { if (unlinkErr) console.error('Error deleting new file on unauthorized edit:', unlinkErr.message); });
            return res.status(403).send('수정 권한이 없습니다.');
        }

        // 게시글 내용 업데이트
        db.run('UPDATE posts SET title = ?, content = ? WHERE id = ?', [title, content, postId], (updateErr) => {
            if (updateErr) {
                console.error('글 수정 실패 (posts 테이블):', updateErr.message);
                if (newFile) fs.unlink(newFile.path, (unlinkErr) => { if (unlinkErr) console.error('Error deleting new file on post update error:', unlinkErr.message); });
                return res.status(500).send('글 수정 실패');
            }

            // 파일 처리 로직
            if (newFile) { // 새 파일이 업로드된 경우
                // 기존 파일이 있다면 삭제
                db.get('SELECT id, filepath FROM files WHERE post_id = ?', [postId], (getOldFileErr, oldFile) => {
                    if (getOldFileErr) {
                        console.error('기존 파일 조회 실패:', getOldFileErr.message);
                    }
                    if (oldFile && fs.existsSync(path.join(__dirname, '../public', oldFile.filepath))) {
                        fs.unlink(path.join(__dirname, '../public', oldFile.filepath), (unlinkErr) => {
                            if (unlinkErr) console.error('기존 파일 삭제 실패:', unlinkErr.message);
                        });
                        db.run('DELETE FROM files WHERE id = ?', [oldFile.id], (deleteOldFileErr) => {
                            if (deleteOldFileErr) console.error('기존 파일 DB 기록 삭제 실패:', deleteOldFileErr.message);
                        });
                    }

                    // 새 파일 정보 저장
                    const newFilepathForDB = '/uploads/' + path.basename(newFile.path);
                    db.run(
                        'INSERT INTO files (post_id, filename, filepath) VALUES (?, ?, ?)',
                        [postId, newFile.originalname, newFilepathForDB],
                        (insertFileErr) => {
                            if (insertFileErr) {
                                console.error('새 파일 정보 저장 실패:', insertFileErr.message);
                                // DB 저장 실패 시, 업로드된 새 파일 삭제 (선택 사항)
                                fs.unlink(newFile.path, (unlinkErr) => {
                                    if (unlinkErr) console.error('Error deleting new file after file DB insert error:', unlinkErr.message);
                                });
                            }
                            res.redirect('/board/view/' + postId);
                        }
                    );
                });
            } else {
                // 새 파일이 없는 경우, 게시글 보기 페이지로 리다이렉트
                res.redirect('/board/view/' + postId);
            }
        });
    });
});

// 게시글 삭제 처리 (권한 확인 및 계단식 삭제, 재귀 하위 답글 포함)
router.post('/delete/:id', isAuthenticated, async (req, res) => {
    const postId = parseInt(req.params.id);
    const currentUserId = req.userId;
    const isAdmin = req.session.user && req.session.user.isAdmin === 1;

    db.get('SELECT user_id, author FROM posts WHERE id = ?', [postId], async (err, post) => {
        if (err || !post) {
            console.error(err ? '게시글 조회 실패:' + err.message : '삭제할 게시글이 없음');
            return res.status(404).send('게시글을 찾을 수 없거나 오류가 발생했습니다.');
        }

        const isAuthor = (post.user_id === currentUserId);
        const isAnonPost = (post.author === '익명');

        if (!isAuthor && !(isAnonPost && isAdmin)) {
            return res.status(403).send('삭제 권한이 없습니다.');
        }

        try {
            const allIdsToDelete = [postId, ...await getAllChildPostIds(db, postId)];
            const placeholders = allIdsToDelete.map(() => '?').join(',');

            db.serialize(() => {
                db.run('BEGIN TRANSACTION;');

                db.all(`SELECT filepath FROM files WHERE post_id IN (${placeholders})`, allIdsToDelete, (fileErr, files) => {
                    if (fileErr) {
                        console.error('파일 조회 오류:', fileErr.message);
                        db.run('ROLLBACK;');
                        return res.status(500).send('파일 조회 중 오류 발생');
                    }

                    files.forEach(file => {
                        const filePath = path.join(__dirname, '../public', file.filepath);
                        if (fs.existsSync(filePath)) {
                            fs.unlink(filePath, err => {
                                if (err) console.error('파일 삭제 오류:', err.message);
                            });
                        }
                    });

                    db.run(`DELETE FROM files WHERE post_id IN (${placeholders})`, allIdsToDelete, (fileDelErr) => {
                        if (fileDelErr) {
                            console.error('파일 DB 삭제 오류:', fileDelErr.message);
                        }
                    });

                    db.run(`DELETE FROM posts WHERE id IN (${placeholders})`, allIdsToDelete, (postDelErr) => {
                        if (postDelErr) {
                            console.error('게시글 삭제 오류:', postDelErr.message);
                            db.run('ROLLBACK;');
                            return res.status(500).send('게시글 삭제 실패');
                        }

                        db.run('COMMIT;', (commitErr) => {
                            if (commitErr) {
                                console.error('커밋 오류:', commitErr.message);
                                return res.status(500).send('삭제 중 커밋 실패');
                            }
                            return res.redirect('/board');
                        });
                    });
                });
            });
        } catch (e) {
            console.error('재귀 삭제 오류:', e.message);
            return res.status(500).send('게시글 삭제 중 오류 발생');
        }
    });
});

// 답글 작성 페이지
router.get('/reply/:id', isAuthenticated, (req, res) => {
    const parentId = req.params.id;
    res.render('post', { post: null, parentId: parentId, file: null }); // file: null 추가
});

module.exports = router;