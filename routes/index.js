// routes/index.js

const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// DB 파일 경로 (다른 라우터와 동일하게 '../db/board.db'를 사용한다고 가정)
const dbPath = path.join(__dirname, '../db/board.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Index 라우터 데이터베이스 연결 오류:', err.message);
  } else {
    console.log('Index 라우터 데이터베이스 연결 성공:', dbPath);
  }
});

/* GET home page. */
router.get('/', function(req, res, next) {
  // 메인 페이지에 필요한 데이터를 가져오고, 로그인 상태 정보를 함께 전달합니다.
  // 여기서는 간단히 최신 상품 4개를 가져오는 예시를 들겠습니다.
  db.all('SELECT * FROM products ORDER BY id DESC LIMIT 4', [], (err, products) => {
    if (err) {
      console.error('메인 페이지 상품 조회 오류:', err.message);
      // 오류 발생 시에도 user 정보를 넘겨주어 네비게이션 바가 깨지지 않도록 합니다.
      return res.render('index', { products: [], user: req.session.user, title: 'My Shop' });
    }
    // 중요한 부분: req.session.user 객체를 'user'라는 이름으로 EJS 템플릿에 전달
    res.render('index', { products: products, user: req.session.user, title: 'My Shop' });
  });
});

module.exports = router;