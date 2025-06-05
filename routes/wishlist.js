// routes/wishlist.js
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs'); // fs 모듈은 위시리스트에서 직접 사용될 일은 없지만, 예시로 포함

// 데이터베이스 경로 설정 (⭐ 이 부분을 실제 위시리스트/상품 DB 파일로 변경하세요!)
// 예: const dbPath = path.join(__dirname, '../db/shop.db');
const dbPath = path.join(__dirname, '../db/board.db'); // 또는 your_shop_database.sqlite 등으로 변경
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Wishlist DB 연결 실패:', err.message);
    } else {
        console.log('Wishlist DB 연결 성공');
        db.run('PRAGMA foreign_keys = ON'); // 외래 키 제약 조건 활성화 (필요시)
    }
});

// 미들웨어: 로그인 여부 확인
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        req.userId = req.session.user.id;
        req.username = req.session.user.username; // 사용자 이름도 필요할 수 있으므로 유지
        // req.userName = req.session.user.name; // user.name 필드가 없다면 제거하거나 해당 필드명으로 변경
        // req.isAdmin = req.session.user.isAdmin; // 위시리스트에서 isAdmin은 직접적으로 사용되지 않으므로 제거 (필요하면 복구)
        next();
    } else {
        // GET 요청 (페이지 접근)일 경우 로그인 페이지로 리다이렉트
        if (req.method === 'GET') {
            // 'message' 쿼리 파라미터를 사용하여 메시지 전달 (boards 라우터 방식)
            return res.redirect('/user/login?message=' + encodeURIComponent('위시리스트를 보려면 로그인이 필요합니다.'));
        } else {
            // POST, PUT, DELETE 등 API 요청일 경우 JSON 응답
            return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
        }
    }
}

// ==========================================================
// 찜 목록 조회 (GET /wishlist) - EJS 뷰 렌더링
// ==========================================================
router.get('/', isAuthenticated, (req, res) => {
    const userId = req.userId; // isAuthenticated 미들웨어에서 설정된 userId

    // 현재 사용자가 찜한 상품 ID 목록을 wishlists 테이블에서 조회
    // (⭐ 테이블명: board.js의 'posts'처럼, 여기서는 'wishlists' 또는 'wishlist'로 통일해야 함)
    // (⭐ DB 스키마: wishlists 테이블에 user_id와 product_id 컬럼이 있어야 함)
    db.all('SELECT product_id FROM wishlists WHERE user_id = ?', [userId], (err, rows) => {
        if (err) {
            console.error('찜 목록 조회 DB 오류:', err.message);
            return res.status(500).render('wishlist', {
                title: '내 위시리스트',
                products: [],
                user: req.session.user,
                // 'message' 쿼리 파라미터는 리다이렉트 시 사용되므로,
                // 렌더링 시에는 직접 'error' 또는 'message' 변수에 할당해야 합니다.
                // 여기서는 직접 전달하거나, app.js의 res.locals 미들웨어를 통해 전달하는 방식 사용
                error: '찜 목록을 불러오는 데 실패했습니다.'
            });
        }

        const productIds = rows.map(row => row.product_id);

        if (productIds.length === 0) {
            // 찜한 상품이 없을 경우 바로 렌더링
            return res.render('wishlist', {
                title: '내 위시리스트',
                products: [],
                user: req.session.user
            });
        }

        // 찜한 상품 ID들을 이용하여 products 테이블에서 상세 정보 조회
        // (⭐ DB 스키마: products 테이블에 id, name, price, image, description 컬럼이 있어야 함)
        const placeholders = productIds.map(() => '?').join(',');
        db.all(`SELECT id, name, price, image, description FROM products WHERE id IN (${placeholders})`, productIds, (err, products) => {
            if (err) {
                console.error('찜 상품 상세 정보 조회 DB 오류:', err.message);
                return res.status(500).render('wishlist', {
                    title: '내 위시리스트',
                    products: [],
                    user: req.session.user,
                    error: '찜 상품 정보를 불러오는 데 실패했습니다.'
                });
            }
            res.render('wishlist', {
                title: '내 위시리스트',
                products: products, // 찜한 상품들의 상세 정보
                user: req.session.user
            });
        });
    });
});

// ==========================================================
// 찜하기 추가 (POST /wishlist/add)
// ==========================================================
router.post('/add', isAuthenticated, (req, res) => {
    const { productId } = req.body;
    const userId = req.userId;

    if (!productId) {
        return res.status(400).json({ success: false, message: '상품 ID가 필요합니다.' });
    }

    // 이미 찜했는지 확인 (⭐ 테이블명 확인)
    db.get('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId], (err, row) => {
        if (err) {
            console.error('찜하기 확인 DB 오류:', err.message);
            return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
        }
        if (row) {
            return res.status(409).json({ success: false, message: '이미 위시리스트에 있는 상품입니다.' });
        }

        // 찜하기 추가 (⭐ 테이블명 확인)
        db.run('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)', [userId, productId], function (err) {
            if (err) {
                console.error('찜하기 추가 DB 오류:', err.message);
                return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
            }
            res.status(200).json({ success: true, message: '상품을 위시리스트에 추가했습니다!', wishlistId: this.lastID });
        });
    });
});

// ==========================================================
// 찜하기 취소 (POST /wishlist/remove)
// ==========================================================
router.post('/remove', isAuthenticated, (req, res) => {
    const { productId } = req.body;
    const userId = req.userId;

    if (!productId) {
        return res.status(400).json({ success: false, message: '상품 ID가 필요합니다.' });
    }

    // 찜하기 삭제 (⭐ 테이블명 확인)
    db.run('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId], function (err) {
        if (err) {
            console.error('찜하기 삭제 DB 오류:', err.message);
            return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: '위시리스트에서 해당 상품을 찾을 수 없습니다.' });
        }
        res.status(200).json({ success: true, message: '위시리스트에서 상품을 제거했습니다.' });
    });
});

module.exports = router;