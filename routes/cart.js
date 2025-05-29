const express = require('express');
const router = express.Router();

// 장바구니 추가
router.post('/add', (req, res) => {
    const { productId, productName, productPrice } = req.body;

    // 세션에 장바구니 배열이 없으면 새로 생성
    if (!req.session.cart) {
        req.session.cart = [];
    }

    // 이미 장바구니에 있는 상품인지 확인
    const existingItem = req.session.cart.find(item => item.id === parseInt(productId));

    if (existingItem) {
        existingItem.quantity++; // 수량 증가
    } else {
        // 새로운 상품 추가
        req.session.cart.push({
            id: parseInt(productId),
            name: productName,
            price: parseInt(productPrice),
            quantity: 1
        });
    }

    console.log('장바구니에 추가됨:', req.session.cart);
    res.redirect('/cart'); // 장바구니 페이지로 리다이렉트
});

// 장바구니 페이지 표시
router.get('/', (req, res) => {
    const cart = req.session.cart || [];
    // 장바구니 총액 계산
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.render('cart', { cart: cart, totalPrice: totalPrice });
});

// (선택 사항) 장바구니에서 상품 삭제
router.post('/remove/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    if (req.session.cart) {
        req.session.cart = req.session.cart.filter(item => item.id !== itemId);
    }
    res.redirect('/cart');
});

// (선택 사항) 장바구니 상품 수량 업데이트
router.post('/update-quantity/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const newQuantity = parseInt(req.body.quantity);

    if (req.session.cart && newQuantity > 0) {
        const item = req.session.cart.find(i => i.id === itemId);
        if (item) {
            item.quantity = newQuantity;
        }
    }
    res.redirect('/cart');
});


// 결제 관련 페이지 (안내 메시지 출력)
router.get('/checkout', (req, res) => {
    res.send('<h1>결제 페이지</h1><p>결제 기능은 구현되지 않았습니다. 기말 과제 요구사항에 따라 안내 메시지만 출력합니다.</p><p><a href="/cart">← 장바구니로 돌아가기</a></p>');
});

module.exports = router;