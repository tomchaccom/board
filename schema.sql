

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

CREATE TABLE IF NOT EXISTS products (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        name TEXT NOT NULL,
                                        price INTEGER NOT NULL,
                                        description TEXT,
                                        image_url TEXT, -- 상품 이미지 경로
                                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기존에 제안했던 wishlists 테이블을 다음과 같이 변경
CREATE TABLE IF NOT EXISTS wishlists (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         user_id INTEGER NOT NULL,            -- 어떤 사용자가 찜했는지 (users 테이블의 id 참조)
                                         product_id INTEGER NOT NULL,         -- 어떤 상품을 찜했는지 (products 테이블의 id 참조)
                                         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                         UNIQUE(user_id, product_id),         -- 한 사용자가 같은 상품을 두 번 찜할 수 없도록
                                         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                         FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE -- products 테이블 참조
    );