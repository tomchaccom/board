const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../db/board.db'); // DB 경로 수정
const db = new sqlite3.Database(dbPath);

// 장바구니 추가
router.post('/add', (req, res) => {
    const { productId, productName, productPrice } = req.body;
    const userId = 1; // 임시 사용자 ID (로그인 기능 구현 시 실제 사용자 ID로 대체)

    db.get("SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?",
        [userId, productId], (err, item) => {
            if (err) {
                console.error('장바구니 확인 DB 오류:', err.message);
                return res.status(500).json({ success: false, message: '장바구니 추가 중 오류가 발생했습니다.' });
            }

            if (item) {
                // 이미 있으면 수량 증가
                db.run("UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?",
                    [item.id], (err) => {
                        if (err) {
                            console.error('장바구니 수량 업데이트 DB 오류:', err.message);
                            return res.status(500).json({ success: false, message: '장바구니 수량 업데이트 중 오류가 발생했습니다.' });
                        }
                        console.log(`장바구니 상품 ${productName} 수량 증가 (ID: ${productId})`);
                        res.redirect('/cart');
                    });
            } else {
                // 없으면 새로 추가
                db.run("INSERT INTO cart_items (user_id, product_id, product_name, product_price, quantity) VALUES (?, ?, ?, ?, ?)",
                    [userId, productId, productName, parseInt(productPrice), 1], (err) => {
                        if (err) {
                            console.error('장바구니 새 상품 추가 DB 오류:', err.message);
                            return res.status(500).json({ success: false, message: '장바구니 새 상품 추가 중 오류가 발생했습니다.' });
                        }
                        console.log(`장바구니에 새 상품 추가됨: ${productName} (ID: ${productId})`);
                        res.redirect('/cart');
                    });
            }
        });
});

// 장바구니 페이지 표시
router.get('/', (req, res) => {
    const userId = 1; // 임시 사용자 ID
    db.all("SELECT * FROM cart_items WHERE user_id = ?", [userId], (err, cartItems) => {
        if (err) {
            console.error('장바구니 목록 DB 오류:', err.message);
            return res.status(500).send('장바구니를 불러오는 중 오류가 발생했습니다.');
        }

        const totalPrice = cartItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
        // 클라이언트 측에서 cartItems라는 이름으로 받도록 변경
        res.render('cart', { title: '장바구니', cartItems: cartItems, totalPrice: totalPrice });
    });
});

// 장바구니에서 상품 삭제
router.post('/remove/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const userId = 1; // 임시 사용자 ID
    db.run("DELETE FROM cart_items WHERE id = ? AND user_id = ?", [itemId, userId], (err) => {
        if (err) {
            console.error('장바구니 상품 삭제 DB 오류:', err.message);
            return res.status(500).json({ success: false, message: '장바구니 상품 삭제 중 오류가 발생했습니다.' });
        }
        console.log(`장바구니 항목 삭제됨 (ID: ${itemId})`);
        res.json({ success: true, message: '상품이 장바구니에서 삭제되었습니다.' }); // JSON 응답
    });
});

// 장바구니 상품 수량 업데이트
router.post('/update-quantity/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const newQuantity = parseInt(req.body.quantity);
    const userId = 1; // 임시 사용자 ID

    if (isNaN(newQuantity) || newQuantity < 1) {
        return res.status(400).json({ success: false, message: '유효하지 않은 수량입니다.' });
    }

    db.run("UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?",
        [newQuantity, itemId, userId], (err) => {
            if (err) {
                console.error('장바구니 수량 업데이트 DB 오류:', err.message);
                return res.status(500).json({ success: false, message: '장바구니 수량 업데이트 중 오류가 발생했습니다.' });
            }
            console.log(`장바구니 항목 ${itemId} 수량 업데이트됨: ${newQuantity}`);
            res.json({ success: true, message: '상품 수량이 업데이트되었습니다.' }); // JSON 응답
        });
});

// 결제 관련 페이지 (안내 메시지 출력)
router.get('/checkout', (req, res) => {
    res.render('checkout', { title: '결제 페이지' }); // checkout.ejs 뷰로 렌더링
});

module.exports = router;