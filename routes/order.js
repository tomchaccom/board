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
// ==========================================================제공해주신 routes/order.js 파일과 이전 대화 내용을 종합해보니, checkout.ejs에서 상품 이미지가 보이지 않는 가장 큰 이유는 routes/order.js의 db.all("SELECT * FROM cart_items WHERE user_id = ?", ...) 쿼리 때문입니다.
//
// SELECT * FROM cart_items는 cart_items 테이블에 있는 컬럼만 가져옵니다. 그런데 cart_items 테이블에는 product_id, product_name, product_price, quantity는 있지만, 상품 이미지 경로(image_url)는 없습니다. image_url은 products 테이블에 있습니다.
//
// 따라서 checkout.ejs에서 <img src="/images/<%= item.product_id %>.jpg" ...> 와 같이 product_id를 직접 사용하여 이미지 경로를 구성하고 싶다면, routes/order.js에서 db.all 쿼리를 수정할 필요가 없습니다. product_id는 이미 cart_items 테이블에 있기 때문에 SELECT *로도 충분히 가져옵니다.
//
// 결론적으로, 현재 routes/order.js 코드는 product_id를 포함하여 cart_items의 모든 컬럼을 잘 가져오고 있습니다.
//
// 그렇다면 문제는 다른 곳입니다.
//
// product_id에 해당하는 이미지 파일이 /public/images/ 폴더에 실제로 존재하지 않거나, 파일명이 정확히 [product_id].jpg 형식이 아닌 경우.
// product_id 자체는 제대로 넘어가지만, 브라우저가 /images/[product_id].jpg 경로의 이미지를 찾지 못하는 경우 (예: 경로 설정 오류, 서버 정적 파일 서비스 미들웨어 설정 오류).
// 단계별 확인 및 해결 (가장 유력한 순서대로):
//
// 1. routes/order.js의 console.log 출력 확인 (필수!)
//
// 이전 답변에서 요청드렸던 console.log를 꼭 추가하고, checkout 페이지 접속 후 서버 콘솔에 출력되는 내용을 확인해주세요.
//
// JavaScript
//
// // routes/order.js (기존 코드에서 console.log만 추가)
router.get('/checkout', isAuthenticated, (req, res) => {
    const userId = req.userId;

    db.all("SELECT * FROM cart_items WHERE user_id = ?", [userId], (err, cartItems) => {
        if (err) {
            console.error('장바구니 목록 DB 오류 (checkout):', err.message);
            return res.status(500).send('장바구니 정보를 불러오는 중 오류가 발생했습니다.');
        }

        // ⭐⭐⭐ 이 줄을 추가하고 서버 콘솔에서 출력 내용을 확인합니다. ⭐⭐⭐
        console.log("DEBUG: /order/checkout - cartItems from DB:", cartItems);

        const totalPrice = cartItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);

        const userAddress = req.session.user.address || "주소를 입력해주세요";
        const userPhone = req.session.user.phone || "연락처를 입력해주세요";
        const userName = req.username;

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
            messages: []
        });
    });
});

// ... (나머지 코드 동일) ...

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