var express = require('express');
var router = express.Router();
var path = require('path');
var sqlite3 = require('sqlite3').verbose();

// DB 파일 경로 (필요에 따라 경로 조정)
var dbPath = path.resolve(__dirname, '../db/board.db');
var db = new sqlite3.Database(dbPath);

router.get('/', function(req, res, next) {
  db.all('SELECT * FROM products LIMIT 4', [], (err, products) => {
    if (err) {
      console.error('DB 조회 오류:', err.message);
      return next(err);
    }
    res.render('index', { title: '명성 라면', products: products });
  });
});
module.exports = router;
