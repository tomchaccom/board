// routes/order.js
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose(); // DB 연동을 위해 추가
const path = require('path'); // 경로 설정을 위해 추가

// DB 경로 설정 (cart.js와 동일하게 맞춰야 함)
const dbPath = path.resolve(__dirname, '../db/board.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the board database in order.js');
    }
});


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
            // AJAX 요청의 경우 401 반환 (프론트엔드에서 처리)
            return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
        }
    }
}

// ==========================================================
// 주문/배송지 정보 입력 페이지 (GET /order/checkout)
// ==========================================================
router.get('/checkout', isAuthenticated, (req, res) => {
    // ⭐ 중요: 장바구니 데이터를 세션이 아닌 DB에서 조회합니다.
    const userId = req.userId; // 로그인된 사용자 ID 사용

    db.all("SELECT * FROM cart_items WHERE user_id = ?", [userId], (err, cartItems) => {
        if (err) {
            console.error('장바구니 목록 DB 오류 (checkout):', err.message);
            return res.status(500).send('장바구니 정보를 불러오는 중 오류가 발생했습니다.');
        }

        const totalPrice = cartItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);

        // 사용자 정보 (로그인된 사용자 정보 사용)
        // 실제로는 DB에서 사용자 정보를 조회하거나, 로그인 시 세션에 더 많은 정보를 저장해야 합니다.
        const userAddress = req.session.user.address || "주소를 입력해주세요";
        const userPhone = req.session.user.phone || "연락처를 입력해주세요";
        const userName = req.username;

        // 만약 cartItems가 비어있으면 장바구니로 리다이렉트
        if (cartItems.length === 0) {
            return res.redirect('/cart?message=' + encodeURIComponent('주문할 상품이 장바구니에 없습니다.'));
        }

        res.render('checkout', {
            title: '주문 및 배송 정보',
            user: req.session.user,
            cartItems: cartItems, // DB에서 조회한 실제 장바구니 데이터 전달
            totalPrice: totalPrice,
            userAddress: userAddress,
            userPhone: userPhone,
            userName: userName,
            messages: [] // 메시지 배열 초기화 (오류 메시지 표시용)
        });
    });
});

// ==========================================================
// 주문 처리 (POST /order/place) - DB 저장 없이 팝업 알림 후 주문 내역 페이지로 리다이렉트
// ==========================================================
router.post('/place', isAuthenticated, (req, res) => {
    const { recipientName, address, phone, paymentMethod, notes, cartData } = req.body;
    const userId = req.userId; // 로그인된 사용자 ID

    // cartData는 클라이언트에서 JSON 문자열로 넘어오므로 파싱
    const cartItems = JSON.parse(cartData);

    // ⭐ 중요: 실제 DB 저장 로직은 여기에 추가해야 합니다.
    // orders 테이블에 주문 정보와 order_items 테이블에 상세 상품 정보 등을 저장합니다.
    // 현재는 DB에 저장하지 않고, 팝업 처리를 위해 바로 리다이렉트합니다.
    console.log('--- 주문 정보 수신 ---');
    console.log('수령인:', recipientName);
    console.log('주소:', address);
    console.log('연락처:', phone);
    console.log('결제 방법:', paymentMethod);
    console.log('요청사항:', notes);
    console.log('주문 상품:', cartItems);
    console.log('--------------------');

    // 예시: 주문 정보 가상 저장 (실제 DB에는 저장 안 함)
    // db.run("INSERT INTO orders (user_id, recipient_name, address, ...) VALUES (?, ?, ?, ...)", [...], function(err) {
    //     if (err) { /* 오류 처리 */ }
    //     const orderId = this.lastID;
    //     cartItems.forEach(item => {
    //         db.run("INSERT INTO order_items (order_id, product_id, product_name, ...) VALUES (?, ?, ?, ...)", [orderId, item.productId, item.product_name, ...]);
    //     });
    //     // 장바구니 비우기: db.run("DELETE FROM cart_items WHERE user_id = ?", [userId]);
    // });


    // 주문 처리 완료 메시지와 함께 주문 내역 페이지로 리다이렉트
    req.session.orderMessage = '결제가 성공적으로 완료되었습니다!'; // 세션에 메시지 저장
    res.redirect('/order/history'); // 주문 내역 페이지로 리다이렉트
});

// ==========================================================
// 주문 내역 페이지 (GET /order/history) - 팝업 알림 기능 포함
// ==========================================================
router.get('/history', isAuthenticated, async (req, res) => {
    // ⭐ 중요: 실제로는 DB에서 해당 사용자의 주문 내역을 가져와야 합니다.
    const userId = req.userId;

    let userOrders = [];
    // 실제 DB 연동 예시: (주문 테이블이 있다고 가정)
    // db.all("SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC", [userId], (err, orders) => {
    //     if (err) {
    //         console.error('주문 내역 조회 DB 오류 (history):', err.message);
    //         // 오류 처리
    //     } else {
    //         userOrders = orders;
    //     }
    //     // 세션에 저장된 메시지가 있다면 가져오고 삭제
    //     const orderMessage = req.session.orderMessage;
    //     delete req.session.orderMessage; // 메시지를 한 번 사용했으니 삭제

    //     res.render('order_history', {
    //         title: '나의 주문 내역',
    //         user: req.session.user,
    //         orders: userOrders, // 실제 주문 내역 데이터
    //         orderMessage: orderMessage // 팝업으로 띄울 메시지 전달
    //     });
    // });


    // 현재는 DB 저장 로직이 없으므로, 팝업 기능 시연을 위한 더미 데이터를 사용합니다.
    userOrders = [
        { id: 'ORD12345', date: '2025-06-05', total: 35000, status: '결제 완료', items: [{ name: '상품1', qty: 1 }, { name: '상품2', qty: 2 }] },
        { id: 'ORD12346', date: '2025-06-04', total: 50000, status: '배송 중', items: [{ name: '상품3', qty: 1 }] }
    ];

    // 세션에 저장된 메시지가 있다면 가져오고 삭제
    const orderMessage = req.session.orderMessage;
    delete req.session.orderMessage; // 메시지를 한 번 사용했으니 삭제

    res.render('order_history', {
        title: '나의 주문 내역',
        user: req.session.user,
        orders: userOrders, // 실제 주문 내역 데이터 (현재는 더미)
        orderMessage: orderMessage // 팝업으로 띄울 메시지 전달
    });
});

module.exports = router;