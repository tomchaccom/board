

CREATE TABLE IF NOT EXISTS posts (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     title TEXT NOT NULL,
                                     content TEXT NOT NULL,
                                     parent_id INTEGER, -- 댓글/대댓글 처리용
                                     author TEXT NOT NULL,
                                     user_id INTEGER NOT NULL,
                                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                     FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                                     FOREIGN KEY(parent_id) REFERENCES posts(id) ON DELETE CASCADE  -- 🔥 이 줄이 핵심!
    );



-- files 테이블 (schema.sql 파일)
CREATE TABLE IF NOT EXISTS files (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     post_id INTEGER NOT NULL,
                                     filename TEXT NOT NULL,
                                     filepath TEXT NOT NULL,
                                     FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE -- **이 부분 확인 및 추가**
    );
-- 회원 테이블
CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     username TEXT UNIQUE NOT NULL,
                                     password TEXT NOT NULL,
                                     name TEXT NOT NULL,
                                     email TEXT,                 -- 이메일 (전체 주소)
                                     phone TEXT,                 -- 연락처
                                     gender TEXT,                -- 성별 (male/female)
                                     address TEXT,               -- 주소 (새로 추가)
                                     sms_consent BOOLEAN DEFAULT 0,  -- SMS 수신 동의 (새로 추가, 0: 미동의, 1: 동의)
                                     email_consent BOOLEAN DEFAULT 0, -- 이메일 수신 동의 (새로 추가, 0: 미동의, 1: 동의)
                                     privacy_agree BOOLEAN NOT NULL DEFAULT 0, -- 개인정보 활용 동의 (0: 미동의, 1: 동의)
                                     inquiry_content TEXT        -- 문의내용
);
-- 공지사항 테이블
CREATE TABLE IF NOT EXISTS notices (
                                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                                       title TEXT NOT NULL,
                                       content TEXT NOT NULL,
                                       author TEXT NOT NULL DEFAULT '관리자', -- 공지사항 작성자는 기본 '관리자'
                                       views INTEGER DEFAULT 0, -- 조회수
                                       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);