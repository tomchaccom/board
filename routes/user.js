const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../db/board.db');
const db = new sqlite3.Database(dbPath);

// 회원가입 페이지
router.get('/register', (req, res) => {
    res.render('register');
});

// 회원가입 처리
// 회원가입 처리
router.post('/register', async (req, res) => {
    const {
        username,
        password,
        password_confirm, // 비밀번호 확인 필드 추가
        name,
        email,
        email_domain, // 이메일 도메인 필드 추가
        phone,
        gender,
        privacy_agree,
        inquiry_content
    } = req.body;

    // 비밀번호와 비밀번호 확인 일치 여부 검사
    if (password !== password_confirm) {
        return res.send('비밀번호가 일치하지 않습니다.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 이메일 주소 합치기
    const fullEmail = email_domain ? `${email}@${email_domain}` : email;

    // 개인정보 활용 동의는 체크박스이므로, 'Y'가 아니면 false (0)로 처리
    const isPrivacyAgreed = privacy_agree === 'Y' ? 1 : 0;

    db.run(
        `INSERT INTO users 
         (username, password, name, email, phone, gender, privacy_agree, inquiry_content) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [username, hashedPassword, name, fullEmail, phone, gender, isPrivacyAgreed, inquiry_content],
        (err) => {
            if (err) {
                console.error(err.message);
                // username UNIQUE 제약 조건 위반 시 에러 메시지 개선
                if (err.message.includes('UNIQUE constraint failed: users.username')) {
                    return res.send('이미 존재하는 아이디입니다.');
                }
                return res.send('회원가입 실패: ' + err.message); // 상세 에러 메시지
            }
            res.redirect('/user/login');
        }
    );
});
// 로그인 페이지
router.get('/login', (req, res) => {
    res.render('login');
});

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
