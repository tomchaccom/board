const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'board.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err.message);
    } else {
        console.log('데이터베이스 연결 성공:', dbPath);
        db.serialize(() => {
            // posts 테이블 (기존)
            db.run(`
                CREATE TABLE IF NOT EXISTS posts (
                                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                     parent_id INTEGER DEFAULT 0,
                                                     title TEXT NOT NULL,
                                                     content TEXT NOT NULL,
                                                     author TEXT DEFAULT '익명',
                                                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                     depth INTEGER DEFAULT 0,
                                                     order_in_group INTEGER DEFAULT 0
                );
            `, (err) => {
                if (err) console.error('Error creating posts table:', err.message);
                else console.log('Posts table created or already exists.');
            });

            // users 테이블 (회원 관리용)
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                     username TEXT UNIQUE NOT NULL,
                                                     password TEXT NOT NULL,
                                                     email TEXT UNIQUE
                );
            `, (err) => {
                if (err) console.error('Error creating users table:', err.message);
                else console.log('Users table created or already exists.');
            });

            // products 테이블
            db.run(`
                CREATE TABLE IF NOT EXISTS products (
                                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                        name TEXT NOT NULL,
                                                        price INTEGER NOT NULL,
                                                        image TEXT,
                                                        description TEXT
                );
            `, (err) => {
                if (err) console.error('Error creating products table:', err.message);
                else {
                    console.log('Products table created or already exists.');
                    // 더미 상품 데이터 삽입 (테이블이 비어있을 때만)
                    db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
                        if (err) {
                            console.error('Error checking products table count:', err.message);
                            // count 체크 실패 시에도 DB를 닫아야 합니다.
                            db.close((closeErr) => {
                                if (closeErr) console.error('Error closing database after count error:', closeErr.message);
                                else console.log('Database connection closed after count error.');
                            });
                            return;
                        }
                        if (row.count === 0) {
                            const stmt = db.prepare("INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)");
                            stmt.run('불닭볶음면', 1800, '/images/1.jpg', '매운맛의 정석, 스트레스 해소에 최고!');
                            stmt.run('간짬뽕', 1500, '/images/2.jpg', '얼큰하고 시원한 국물, 해장으로도 일품!');
                            stmt.run('신라면', 1400, '/images/3.jpg', '국민 라면의 대명사, 언제 먹어도 맛있는 매콤함!');
                            stmt.run('진짬뽕', 2000, '/images/4.jpg', '푸짐한 건더기와 진한 해물맛, 든든한 한 끼!');
                            stmt.run('육개장 사발면', 1200, '/images/5.jpg', '간단하고 얼큰한 맛, 야식으로 최고!');
                            stmt.run('짜파게티', 1600, '/images/6.jpg', '일요일은 내가 짜파게티 요리사!');
                            stmt.finalize(() => {
                                console.log('Dummy products inserted.');
                                // 상품 데이터 삽입 완료 후 DB 연결 닫기
                                db.close((closeErr) => {
                                    if (closeErr) console.error('Error closing database after product insert:', closeErr.message);
                                    else console.log('Database connection closed.');
                                });
                            });
                        } else {
                            console.log('Products table already contains data.');
                            // 상품 데이터가 이미 있다면 바로 DB 연결 닫기
                            db.close((closeErr) => {
                                if (closeErr) console.error('Error closing database when products exist:', closeErr.message);
                                else console.log('Database connection closed.');
                            });
                        }
                    });
                }
            });

            // cart_items 테이블 (장바구니 아이템, 사용자 ID와 상품 ID 연결)
            db.run(`
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
            `, (err) => {
                if (err) console.error('Error creating cart_items table:', err.message);
                else console.log('Cart_items table created or already exists.');
                // Note: db.close() for cart_items table is now handled by the products table logic
                //       to ensure it's closed only after all potential inserts.
                //       If you only had cart_items to handle, you'd put db.close() here.
            });
            // db.close()는 이제 products 테이블 삽입 로직에서만 호출됩니다.
            // 모든 db.run/db.get 작업이 순차적으로 실행되므로, 마지막 비동기 작업 후 닫는 것이 중요합니다.
        });
    }
});

module.exports = db;