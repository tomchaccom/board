// routes/notice.js (전체 코드 - 기존 내용을 대체)

const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer'); // multer 모듈 추가
const fs = require('fs'); // 파일 시스템 모듈 추가

const dbPath = path.join(__dirname, '../db/board.db');
const db = new sqlite3.Database(dbPath);

// dbHelper 함수들 (비동기 처리 위함)
const runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const getAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const allAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};


// ----------------------------------------------------
// Multer 설정 (파일 업로드)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/notices');
        // uploads/notices 디렉토리가 없으면 생성
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir); // 파일이 저장될 경로
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${file.fieldname}${ext}`); // 고유한 파일 이름 생성
    }
});
const upload = multer({ storage: storage });
// ----------------------------------------------------


// 미들웨어: 로그인 및 관리자 여부 확인
function isAuthenticated(req, res, next) {
    if (req.session.user && req.session.user.isAdmin) {
        next(); // 로그인되어 있고 관리자이면 다음 미들웨어로
    } else if (req.session.user && !req.session.user.isAdmin) {
        // 일반 사용자인데 관리자 페이지에 접근 시
        res.status(403).send('관리자만 접근할 수 있는 페이지입니다.');
    } else {
        // 로그인되지 않은 경우
        res.redirect('/user/login?message=로그인이 필요합니다.');
    }
}
// 공지사항 작성 페이지 (관리자만 접근 가능)
router.get('/create', isAuthenticated, (req, res) => {
    res.render('notice/create');
});

// 공지사항 작성 처리 (관리자만 접근 가능, 파일 첨부 포함)
// 'noticeFile'은 폼에서 파일 입력 필드의 name 속성입니다.
router.post('/create', isAuthenticated, upload.single('noticeFile'), async (req, res) => {
    const { title, content } = req.body;
    const author = req.session.user.name || '관리자'; // 로그인된 관리자의 이름 사용

    if (!title || !content) {
        return res.status(400).send('제목과 내용을 모두 입력해주세요.');
    }

    try {
        // 공지사항 내용 먼저 삽입
        const result = await runAsync(
            'INSERT INTO notices (title, content, author) VALUES (?, ?, ?)',
            [title, content, author]
        );
        const noticeId = result.lastID; // 새로 삽입된 공지사항의 ID

        // 파일이 첨부된 경우 파일 정보 저장
        if (req.file) {
            const filename = req.file.originalname;
            const filepath = `/uploads/notices/${req.file.filename}`; // 웹에서 접근할 수 있는 경로
            await runAsync(
                'INSERT INTO notice_files (notice_id, filename, filepath) VALUES (?, ?, ?)',
                [noticeId, filename, filepath]
            );
            console.log(`파일 '${filename}'이 공지사항 ${noticeId}에 첨부되었습니다.`);
        }

        res.redirect('/notice'); // 공지사항 목록으로 리다이렉트
    } catch (err) {
        console.error('공지사항 작성 오류:', err.message);
        res.status(500).send('공지사항 작성에 실패했습니다.');
    }
});


// 공지사항 목록 조회
router.get('/', async (req, res) => {
    try {
        const notices = await allAsync('SELECT * FROM notices ORDER BY created_at DESC');
        res.render('notice/list', { notices: notices });
    } catch (err) {
        console.error('공지사항 목록 조회 오류:', err.message);
        res.status(500).send('공지사항을 불러오는 데 실패했습니다.');
    }
});

// 공지사항 상세 조회
router.get('/:id', async (req, res) => {
    const noticeId = req.params.id;
    try {
        // 조회수 증가
        await runAsync('UPDATE notices SET views = views + 1 WHERE id = ?', [noticeId]);

        const notice = await getAsync('SELECT * FROM notices WHERE id = ?', [noticeId]);
        if (!notice) {
            return res.status(404).send('공지사항을 찾을 수 없습니다.');
        }

        // 해당 공지사항에 첨부된 파일 정보도 가져오기
        const files = await allAsync('SELECT * FROM notice_files WHERE notice_id = ?', [noticeId]);
        notice.files = files; // notice 객체에 파일 정보 추가

        res.render('notice/detail', { notice: notice });
    } catch (err) {
        console.error('공지사항 상세 조회 오류:', err.message);
        res.status(500).send('공지사항을 불러오는 데 실패했습니다.');
    }
});



// 공지사항 수정 페이지 (관리자만 접근 가능)
router.get('/edit/:id', isAuthenticated, async (req, res) => {
    const noticeId = req.params.id;
    try {
        const notice = await getAsync('SELECT * FROM notices WHERE id = ?', [noticeId]);
        if (!notice) {
            return res.status(404).send('공지사항을 찾을 수 없습니다.');
        }
        // 수정 페이지에도 현재 첨부된 파일 목록을 보여주기 위해 파일 정보도 가져옴
        const files = await allAsync('SELECT * FROM notice_files WHERE notice_id = ?', [noticeId]);
        notice.files = files;
        res.render('notice/edit', { notice: notice });
    } catch (err) {
        console.error('공지사항 수정 페이지 로드 오류:', err.message);
        res.status(500).send('공지사항을 불러오는 데 실패했습니다.');
    }
});

// 공지사항 수정 처리 (관리자만 접근 가능, 파일 첨부 및 기존 파일 삭제 처리 포함)
router.post('/edit/:id', isAuthenticated, upload.single('noticeFile'), async (req, res) => {
    const noticeId = req.params.id;
    const { title, content, delete_file_ids } = req.body; // delete_file_ids는 삭제할 파일 ID 배열

    if (!title || !content) {
        return res.status(400).send('제목과 내용을 모두 입력해주세요.');
    }

    try {
        // 공지사항 내용 업데이트
        await runAsync(
            'UPDATE notices SET title = ?, content = ? WHERE id = ?',
            [title, content, noticeId]
        );

        // 기존 파일 삭제 처리
        if (delete_file_ids) {
            const idsToDelete = Array.isArray(delete_file_ids) ? delete_file_ids : [delete_file_ids];
            for (const fileId of idsToDelete) {
                const fileToDelete = await getAsync('SELECT * FROM notice_files WHERE id = ? AND notice_id = ?', [fileId, noticeId]);
                if (fileToDelete) {
                    // 서버에서 파일 삭제 (선택 사항이지만, 공간 낭비 방지를 위해 권장)
                    const filePathOnDisk = path.join(__dirname, '..', fileToDelete.filepath);
                    if (fs.existsSync(filePathOnDisk)) {
                        fs.unlinkSync(filePathOnDisk);
                        console.log(`서버에서 파일 삭제됨: ${filePathOnDisk}`);
                    }
                    // DB에서 파일 정보 삭제
                    await runAsync('DELETE FROM notice_files WHERE id = ?', [fileId]);
                    console.log(`DB에서 파일 ${fileId} 삭제됨`);
                }
            }
        }

        // 새 파일이 첨부된 경우 파일 정보 저장
        if (req.file) {
            const filename = req.file.originalname;
            const filepath = `/uploads/notices/${req.file.filename}`; // 웹에서 접근할 수 있는 경로
            await runAsync(
                'INSERT INTO notice_files (notice_id, filename, filepath) VALUES (?, ?, ?)',
                [noticeId, filename, filepath]
            );
            console.log(`새 파일 '${filename}'이 공지사항 ${noticeId}에 첨부되었습니다.`);
        }

        res.redirect(`/notice/${noticeId}`); // 수정된 공지사항 상세 페이지로 리다이렉트
    } catch (err) {
        console.error('공지사항 수정 오류:', err.message);
        res.status(500).send('공지사항 수정에 실패했습니다.');
    }
});


// 공지사항 삭제 처리 (관리자만 접근 가능)
router.post('/delete/:id', isAuthenticated, async (req, res) => {
    const noticeId = req.params.id;
    try {
        // 공지사항에 연결된 모든 파일 정보 가져오기
        const filesToDelete = await allAsync('SELECT * FROM notice_files WHERE notice_id = ?', [noticeId]);

        // 서버에서 물리적 파일 삭제
        for (const file of filesToDelete) {
            const filePathOnDisk = path.join(__dirname, '..', file.filepath);
            if (fs.existsSync(filePathOnDisk)) {
                fs.unlinkSync(filePathOnDisk);
                console.log(`서버에서 파일 삭제됨: ${filePathOnDisk}`);
            }
        }
        // DB에서 notice_files 레코드는 FOREIGN KEY ON DELETE CASCADE에 의해 자동으로 삭제됩니다.
        // 또는 명시적으로 삭제해도 됩니다: await runAsync('DELETE FROM notice_files WHERE notice_id = ?', [noticeId]);

        // 공지사항 삭제 (notice_files가 cascade 설정되어 있다면 파일 레코드도 함께 삭제됨)
        await runAsync('DELETE FROM notices WHERE id = ?', [noticeId]);

        console.log(`공지사항 ${noticeId} 삭제 완료.`);
        res.redirect('/notice');
    } catch (err) {
        console.error('공지사항 삭제 오류:', err.message);
        res.status(500).send('공지사항 삭제에 실패했습니다.');
    }
});


// 첨부 파일 다운로드 라우터 (파일 ID로 다운로드)
router.get('/download/:fileId', async (req, res) => {
    const fileId = req.params.fileId;
    try {
        const file = await getAsync('SELECT * FROM notice_files WHERE id = ?', [fileId]);
        if (!file) {
            return res.status(404).send('파일을 찾을 수 없습니다.');
        }

        const filePathOnDisk = path.join(__dirname, '..', file.filepath);

        // 파일 존재 여부 확인
        if (fs.existsSync(filePathOnDisk)) {
            // 파일 다운로드
            res.download(filePathOnDisk, file.filename, (err) => {
                if (err) {
                    console.error('파일 다운로드 오류:', err.message);
                    res.status(500).send('파일 다운로드 중 오류가 발생했습니다.');
                }
            });
        } else {
            res.status(404).send('저장된 파일을 찾을 수 없습니다.');
        }
    } catch (err) {
        console.error('파일 정보 조회 오류:', err.message);
        res.status(500).send('파일 다운로드에 실패했습니다.');
    }
});


module.exports = router;