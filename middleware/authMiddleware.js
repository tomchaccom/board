// middleware/authMiddleware.js

const ensureLoggedIn = (req, res, next) => {
    if (!req.session.user) {
        // 로그인되어 있지 않으면 로그인 페이지로 리다이렉트하면서 메시지를 쿼리 파라미터로 전달
        return res.redirect('/user/login?message=로그인 후 이용해주세요.');
    }
    next(); // 로그인되어 있으면 다음 미들웨어 또는 라우터로 진행
};

module.exports = { ensureLoggedIn };