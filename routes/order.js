// routes/order.js
const express = require('express');
const router = express.Router();

// 미들웨어: 로그인 여부 확인 (이전과 동일)
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        req.userId = req.session.user.id;
        req.username = req.session.user.username;
        next();
    } else {
        if (req.method === 'GET') {
            return res.redirect('/user/login?message=' + encodeURIComponent('주문하려면 로그인이 필요합니다.'));
        } else {
            return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
        }
    }
}

// ==========================================================
// 주문/배송지 정보 입력 페이지 (GET /order/checkout)
// ==========================================================
router.get('/checkout', isAuthenticated, (req, res) => {
    // DB에서 장바구니 상품을 불러오는 대신, 가상의 데이터 또는 세션에서 직접 데이터를 전달 (간소화)
    // 실제 장바구니 데이터는 cartRouter에서 관리되므로, 여기서는 더미 데이터를 사용하거나
    // 실제 장바구니 라우터에서 사용된 것과 유사하게 cartItems를 가져오는 방식을 모방합니다.

    // ⭐ 실제 시나리오에서는 req.session.cart 또는 cartRouter에서 조회한 실제 장바구니 데이터를 사용해야 합니다.
    // 여기서는 DB 연동 없이 페이지 이동만 하므로, 간단한 더미 데이터를 가정합니다.
    const cartItems = req.session.cartItems || [ // 세션에 cartItems가 없다면 더미 데이터 사용
        { id: 1, productId: 1, name: '상품1', price: 10000, quantity: 1, image: '/images/1.jpg' },
        { id: 2, productId: 2, name: '상품2', price: 25000, quantity: 2, image: '/images/2.jpg' }
    ];
    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const userAddress = "서울시 강남구 테헤란로 123"; // 더미 주소
    const userPhone = "010-1234-5678"; // 더미 전화번호
    const userName = req.username; // 로그인된 사용자 이름 (세션에서)

    // 만약 cartItems가 비어있으면 장바구니로 리다이렉트 (실제 동작)
    if (cartItems.length === 0) {
        return res.redirect('/cart?message=' + encodeURIComponent('주문할 상품이 장바구니에 없습니다.'));
    }

    res.render('checkout', {
        title: '주문 및 배송 정보',
        user: req.session.user,
        cartItems: cartItems,
        totalPrice: totalPrice,
        userAddress: userAddress,
        userPhone: userPhone,
        userName: userName
    });
});

// ==========================================================
// 주문 처리 (POST /order/place) - DB 저장 없이 팝업 알림 후 리다이렉트
// ==========================================================
router.post('/place', isAuthenticated, (req, res) => {
    const { recipientName, address, phone, paymentMethod, notes } = req.body;
// 실제 DB 저장 로직은 여기에 추가하지 않습니다.
    res.send('주문 정보가 정상적으로 수신되었습니다.');
});

module.exports = router; // ★ 이게 핵심 ★