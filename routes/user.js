const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../db/board.db');
const db = new sqlite3.Database(dbPath);

// ... (기존 require 및 db 연결 코드)

// 미들웨어: 로그인 여부 확인
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        req.userId = req.session.user.id; // 로그인된 사용자의 ID를 req 객체에 추가
        req.username = req.session.user.username; // 로그인된 사용자의 username도 추가 (필요할 경우)
        next();
    } else {
        res.redirect('/user/login?message=로그인이 필요합니다.');
    }
}

// ... (나머지 라우터 코드)

// 회원가입 페이지
router.get('/register', (req, res) => {
    res.render('register');
});

// 회원가입 처리 (추가 필드 반영)
router.post('/register', async (req, res) => {
    const { username, password, name, email, phone, gender, address, sms_consent, email_consent, privacy_agree, inquiry_content } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // email_domain을 합치는 로직은 프론트엔드에서 처리하거나,
    // 여기서 email 필드에 '@'가 포함되어 있지 않으면 email_domain을 합쳐주는 로직을 추가할 수 있습니다.
    // 현재는 'email' 필드만 받아서 저장하는 것으로 가정합니다.

    db.run(
        'INSERT INTO users (username, password, name, email, phone, gender, address, sms_consent, email_consent, privacy_agree, inquiry_content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            username,
            hashedPassword,
            name,
            email,
            phone,
            gender,
            address,
            sms_consent === 'Y' ? 1 : 0, // 'Y'이면 1, 아니면 0
            email_consent === 'Y' ? 1 : 0, // 'Y'이면 1, 아니면 0
            privacy_agree === 'Y' ? 1 : 0,
            inquiry_content
        ],
        (err) => {
            if (err) {
                console.error(err.message);
                // username UNIQUE 제약 조건 위반 시 에러 메시지 개선
                if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE constraint failed: users.username')) {
                    return res.send('이미 존재하는 아이디입니다.');
                }
                return res.send('회원가입 실패');
            }
            res.redirect('/user/login');
        }
    );
});
// 로그인 페이지
// routes/user.js 파일 내
// ...

// 로그인 페이지
router.get('/login', (req, res) => {
    const message = req.query.message; // URL 쿼리 파라미터에서 message를 읽어옴
    res.render('login', { message: message }); // login.ejs로 message 변수를 넘겨줌
});

// ...

// 로그인 처리
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) {
            return res.send('존재하지 않는 사용자입니다.');
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = user;
            res.redirect('/');
        } else {
            res.send('비밀번호가 일치하지 않습니다.');
        }
    });
});

// 로그아웃
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;



// 마이페이지 (회원 정보 조회)
router.get('/mypage', isAuthenticated, (req, res) => {
    const userId = req.session.user ? req.session.user.id : null; // 로그인된 사용자 ID 사용

    if (!userId) {
        return res.redirect('/user/login'); // 로그인된 사용자 ID가 없으면 로그인 페이지로 리다이렉트
    }

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error(err.message);
            return res.send('회원 정보를 불러오는 데 실패했습니다.');
        }
        if (!user) {
            return res.send('사용자 정보를 찾을 수 없습니다.');
        }
        res.render('mypage', { user: user });
    });
});

// 회원 정보 수정 처리 (추가 필드 반영)
router.post('/mypage', isAuthenticated, async (req, res) => {
    const userId = req.session.user ? req.session.user.id : null;

    if (!userId) {
        return res.redirect('/user/login'); // 로그인된 사용자 ID가 없으면 로그인 페이지로 리다이렉트
    }

    const { name, email, phone, gender, address, sms_consent, email_consent, privacy_agree, inquiry_content } = req.body;

    db.run(
        'UPDATE users SET name = ?, email = ?, phone = ?, gender = ?, address = ?, sms_consent = ?, email_consent = ?, privacy_agree = ?, inquiry_content = ? WHERE id = ?',
        [
            name,
            email,
            phone,
            gender,
            address,
            sms_consent === 'Y' ? 1 : 0,
            email_consent === 'Y' ? 1 : 0,
            privacy_agree === 'Y' ? 1 : 0,
            inquiry_content,
            userId
        ],
        (err) => {
            if (err) {
                console.error(err.message);
                return res.send('회원 정보 수정에 실패했습니다.');
            }
            // 세션 정보도 업데이트하여 최신 상태 유지 (선택 사항)
            db.get('SELECT * FROM users WHERE id = ?', [userId], (err, updatedUser) => {
                if (updatedUser) {
                    req.session.user = updatedUser;
                }
                res.redirect('/user/mypage');
            });
        }
    );
});


