const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt'); // bcrypt 모듈 추가

// dbPath를 현재 디렉토리 (db 폴더) 기준으로 설정
// initDB.js가 db 폴더 안에 있다면, board.db도 같은 db 폴더 안에 생성됩니다.
// 다른 라우트 파일에서 '../db/board.db'로 참조하면 됩니다.
const dbPath = path.join(__dirname, 'board.db');

// 기존 데이터베이스 파일 삭제 (개발 단계에서 스키마 변경 시 유용)
if (fs.existsSync(dbPath)) {
    try {
        fs.unlinkSync(dbPath);
        console.log('기존 데이터베이스 파일 삭제 완료: ' + dbPath);
    } catch (err) {
        console.error('기존 데이터베이스 파일 삭제 오류:', err.message);
    }
}

// 데이터베이스 연결 및 초기화 함수
const initializeDatabase = async () => {
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('데이터베이스 연결 오류:', err.message);
            process.exit(1); // 오류 발생 시 프로세스 종료
        }
        console.log('새 데이터베이스 연결 성공:', dbPath);
    });

    // SQLite 비동기 작업을 Promise로 감싸는 헬퍼 함수
    const runAsync = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve(this); // `this`는 삽입된 ID를 포함
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

    try {
        // users 테이블 생성
        await runAsync(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                gender TEXT,
                address TEXT,
                sms_consent BOOLEAN DEFAULT 0,
                email_consent BOOLEAN DEFAULT 0,
                privacy_agree BOOLEAN NOT NULL DEFAULT 0,
                isAdmin BOOLEAN DEFAULT 0, -- **isAdmin 컬럼 추가됨**
                inquiry_content TEXT
            );
        `);
        console.log('Users table created or already exists.');

        // admin 사용자 삽입
        const adminUserCount = await getAsync("SELECT COUNT(*) AS count FROM users WHERE username = 'admin'");
        if (adminUserCount.count === 0) {
            const adminUsername = 'admin';
            const adminPlainPassword = 'admin123';
            const adminName = '관리자';
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(adminPlainPassword, saltRounds);

            await runAsync(
                'INSERT INTO users (username, password, name, isAdmin) VALUES (?, ?, ?, ?)',
                [adminUsername, hashedPassword, adminName, 1]
            );
            console.log(`관리자 계정 '${adminUsername}' 생성 완료.`);
        } else {
            console.log('관리자 계정 \'admin\'이 이미 존재합니다.');
        }

        // posts 테이블 생성
        await runAsync(`
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                parent_id INTEGER,
                author TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, -- 쉼표 추가
                FOREIGN KEY(parent_id) REFERENCES posts(id) ON DELETE CASCADE
            );
        `);
        console.log('Posts table created or already exists.');

        // files 테이블 생성
        await runAsync(`
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                filepath TEXT NOT NULL,
                FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
            );
        `);
        console.log('Files table created or already exists.');

        // notices 테이블 생성
        await runAsync(`
            CREATE TABLE IF NOT EXISTS notices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                author TEXT NOT NULL DEFAULT '관리자',
                views INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Notices table created or already exists.');

        // 더미 공지사항 데이터 삽입
        const noticeCount = await getAsync("SELECT COUNT(*) AS count FROM notices");
        if (noticeCount.count === 0) {
            await runAsync('INSERT INTO notices (title, content, author) VALUES (?, ?, ?)', ['쇼핑몰 오픈 기념 이벤트!', '저희 쇼핑몰이 드디어 오픈했습니다! 다양한 할인 행사가 진행 중이니 많은 관심 부탁드립니다.', '관리자']);
            await runAsync('INSERT INTO notices (title, content, author) VALUES (?, ?, ?)', ['배송 지연 안내', '일부 상품의 주문 폭주로 인해 배송이 다소 지연될 수 있습니다. 고객 여러분의 양해 부탁드립니다.', '관리자']);
            await runAsync('INSERT INTO notices (title, content, author) VALUES (?, ?, ?)', ['추석 연휴 고객센터 휴무 안내', '추석 연휴 기간 동안 고객센터 운영이 중단됩니다. 불편을 드려 죄송합니다.', '관리자']);
            console.log('Dummy notices inserted.');
        } else {
            console.log('Notices table already contains data.');
        }

        // products 테이블 생성
        await runAsync(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price INTEGER NOT NULL,
                image TEXT, -- image_url 대신 image로 컬럼명 통일
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 생성일시 추가 (선택 사항)
            );
        `);
        console.log('Products table created or already exists.');

        // 더미 상품 데이터 삽입
        const productCount = await getAsync("SELECT COUNT(*) AS count FROM products");
        if (productCount.count === 0) {
            await runAsync('INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)', ['불닭볶음면', 1800, '/images/1.jpg', '매운맛의 정석, 스트레스 해소에 최고!']);
            await runAsync('INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)', ['간짬뽕', 1500, '/images/2.jpg', '얼큰하고 시원한 국물, 해장으로도 일품!']);
            await runAsync('INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)', ['신라면', 1400, '/images/3.jpg', '국민 라면의 대명사, 언제 먹어도 맛있는 매콤함!']);
            await runAsync('INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)', ['진짬뽕', 2000, '/images/4.jpg', '푸짐한 건더기와 진한 해물맛, 든든한 한 끼!']);
            await runAsync('INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)', ['육개장 사발면', 1200, '/images/5.jpg', '간단하고 얼큰한 맛, 야식으로 최고!']);
            await runAsync('INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)', ['짜파게티', 1600, '/images/6.jpg', '일요일은 내가 짜파게티 요리사!']);
            console.log('Dummy products inserted.');
        } else {
            console.log('Products table already contains data.');
        }

        // wishlists 테이블 생성 (products 테이블을 참조)
        await runAsync(`
            CREATE TABLE IF NOT EXISTS wishlists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL, -- posts.id가 아니라 products.id를 참조
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, product_id), -- 한 사용자가 같은 상품을 두 번 찜할 수 없도록
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            );
        `);
        console.log('Wishlists table created or already exists.');

        // notice_files 테이블 생성
        await runAsync(`
            CREATE TABLE IF NOT EXISTS notice_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                notice_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                filepath TEXT NOT NULL,
                FOREIGN KEY(notice_id) REFERENCES notices(id) ON DELETE CASCADE
            );
        `);
        console.log('Notice_files table created or already exists.');

        // cart_items 테이블 생성
        await runAsync(`
            CREATE TABLE IF NOT EXISTS cart_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                product_price INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (product_id) REFERENCES products(id),
                UNIQUE(user_id, product_id)
            );
        `);
        console.log('Cart_items table created or already exists.');

    } catch (error) {
        console.error('데이터베이스 초기화 중 오류 발생:', error.message);
    } finally {
        // 모든 작업이 완료(성공 또는 실패)된 후 데이터베이스 연결 닫기
        db.close((closeErr) => {
            if (closeErr) console.error('데이터베이스 닫기 오류:', closeErr.message);
            else console.log('데이터베이스 연결 닫힘.');
        });
    }
};

// 데이터베이스 초기화 함수 호출
initializeDatabase();