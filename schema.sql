

-- 게시글 테이블
CREATE TABLE IF NOT EXISTS posts (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     title TEXT NOT NULL,
                                     content TEXT NOT NULL,
                                     parent_id INTEGER,
                                     author TEXT NOT NULL,
                                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 파일 업로드 정보 테이블 (공지사항 첨부 파일용)
CREATE TABLE IF NOT EXISTS files (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     post_id INTEGER NOT NULL,
                                     filename TEXT NOT NULL,
                                     filepath TEXT NOT NULL,
                                     FOREIGN KEY(post_id) REFERENCES posts(id));
CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     username TEXT UNIQUE NOT NULL,
                                     password TEXT NOT NULL,
                                     name TEXT NOT NULL,
                                     email TEXT,                 -- 이메일 (전체 주소)
                                     phone TEXT,                 -- 연락처
                                     gender TEXT,                -- 성별 (male/female)
                                     privacy_agree BOOLEAN NOT NULL DEFAULT 0, -- 개인정보 활용 동의 (0: 미동의, 1: 동의)
                                     inquiry_content TEXT        -- 문의내용
);