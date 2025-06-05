// routes/product.js
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// DB 경로 설정: routes 폴더에서 상위 폴더(..)의 db 폴더 안 board.db로 설정
const dbPath = path.join(__dirname, '../db/board.db');
const db = new sqlite3.Database(dbPath);

// 미들웨어: 로그인 여부 확인
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        req.userId = req.session.user.id;
        req.username = req.session.user.username;
        req.userName = req.session.user.name;
        req.isAdmin = req.session.user.isAdmin;
        next();
    } else {
        res.redirect('/user/login?message=로그인이 필요합니다.');
    }
}

// ==========================================================
// 상품 목록 페이지 라우트
// ==========================================================
router.get('/', isAuthenticated, (req, res) => {
    db.all("SELECT * FROM products", (err, products) => {
        if (err) {
            console.error('상품 목록 DB 오류:', err.message);
            return res.status(500).render('product_list', {
                title: '상품 목록',
                products: [],
                user: req.session.user,
                error: '상품을 불러오는 중 오류가 발생했습니다.'
            });
        }
        res.render('product_list', {
            title: '상품 목록',
            products: products,
            user: req.session.user
        });
    });
});

// ==========================================================
// 상품 상세 페이지 라우트
// ==========================================================
router.get('/:id', isAuthenticated, (req, res) => {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
        console.error('유효하지 않은 상품 ID:', req.params.id); // 이 부분 추가
        return res.status(400).send('유효하지 않은 상품 ID입니다.');
    }

    db.get("SELECT * FROM products WHERE id = ?", [productId], (err, product) => {
        if (err) {
            console.error('제품 상세 DB 오류:', err.message);
            return res.status(500).send('제품 정보를 불러오는 중 오류가 발생했습니다.');
        }
        if (!product) {
            return res.status(404).send('제품을 찾을 수 없습니다.');
        }

        // 위시리스트 상태 확인 로직 추가 (wishlists 테이블 참조)
        let isWishlisted = false;
        if (req.session.user) {
            db.get('SELECT 1 FROM wishlists WHERE user_id = ? AND product_id = ?', [req.session.user.id, productId], (wishErr, row) => {
                if (wishErr) {
                    console.error('위시리스트 상태 조회 오류:', wishErr.message);
                    // 오류 발생 시에도 일단 페이지는 렌더링하도록
                } else {
                    isWishlisted = !!row; // row가 존재하면 true (찜했음), 없으면 false (찜 안 했음)
                }
                res.render('product_detail', {
                    title: product.name,
                    product: product,
                    user: req.session.user,
                    isWishlisted: isWishlisted // 찜하기 상태 전달
                });
            });
        } else {
            // 로그인하지 않은 경우, isWishlisted는 항상 false
            res.render('product_detail', {
                title: product.name,
                product: product,
                user: req.session.user,
                isWishlisted: isWishlisted
            });
        }
    });
});

module.exports = router;