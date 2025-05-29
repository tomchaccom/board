const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../db/board.db'); // DB 경로 수정
const db = new sqlite3.Database(dbPath);

// 제품 목록 페이지
router.get('/', (req, res) => {
    db.all("SELECT * FROM products", (err, products) => {
        if (err) {
            console.error('제품 목록 DB 오류:', err.message);
            return res.status(500).send('제품을 불러오는 중 오류가 발생했습니다.');
        }
        res.render('product', { title: '상품 목록', products: products }); // title 변수 추가
    });
});

// 제품 상세 페이지
router.get('/:id', (req, res) => {
    const productId = parseInt(req.params.id);
    db.get("SELECT * FROM products WHERE id = ?", [productId], (err, product) => {
        if (err) {
            console.error('제품 상세 DB 오류:', err.message);
            return res.status(500).send('제품 정보를 불러오는 중 오류가 발생했습니다.');
        }
        if (!product) {
            return res.status(404).send('제품을 찾을 수 없습니다.');
        }
        // !!! 여기를 추가합니다. !!!
        console.log("product_detail.ejs로 전달되는 이미지 경로:", product.image);

        res.render('product_detail', { title: product.name, product: product }); // title 변수 추가
    });
});

module.exports = router;