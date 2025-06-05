// app.js

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const multer = require('multer'); // multer 모듈 추가 (필요 없으면 삭제해도 됨, notice.js에서 사용)

// ensureLoggedIn 미들웨어 불러오기
const { ensureLoggedIn } = require('./middleware/authMiddleware');

// 라우터 모듈 불러오기
const boardRouter = require('./routes/board');
const productRouter = require('./routes/product');
const cartRouter = require('./routes/cart');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const userRouter = require('./routes/user');
const noticeRoutes = require('./routes/notice');



var app = express();

// view engine setup (가장 먼저 설정)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// --- 미들웨어 설정 시작 ---
// 미들웨어는 요청 처리 순서에 따라 중요합니다.

// 정적 파일 서비스 (public 디렉토리)
app.use(express.static(path.join(__dirname, 'public')));

// uploads 디렉토리를 정적으로 서비스하도록 추가
// 주의: 이 경로는 'public' 내부가 아닌 프로젝트 루트의 'uploads'여야 합니다.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(logger('dev')); // 개발 로그
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.urlencoded({ extended: false })); // URL-encoded 요청 본문 파싱
app.use(cookieParser()); // 쿠키 파싱

// 세션 미들웨어 (쿠키 파싱 후)
app.use(session({
  secret: 'secret-key', // 실제 운영 환경에서는 강력하고 복잡한 키를 사용하세요.
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60 * 60 * 1000, secure: false } // HTTPS 사용 시 secure: true
}));

// 모든 EJS 뷰에서 req.session.user를 'user' 변수로 사용 가능하도록 설정
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// --- 라우터 연결 시작 ---
// 일반적인 라우터 (로그인 필요 없는 기본 경로들)를 먼저 연결합니다.

app.use('/', indexRouter);
app.use('/users', usersRouter); // 이 라우터가 실제로 사용되는지 확인 (보통 userRouter가 다 담당)
app.use('/user', userRouter);

// 공지사항 라우터는 일반 라우터로, 특정 미들웨어 적용 전에 위치
app.use('/notice', noticeRoutes);

app.use('/product', productRouter); // 상품 라우터
app.use('/products', productRouter); // 상품 라우터

// '/login' 리다이렉트 (필요 없으면 제거 가능)
app.get('/login', (req, res) => {
  res.redirect('/user/login');
});

// --- 로그인 또는 특정 권한이 필요한 라우터 (ensureLoggedIn 미들웨어 적용) ---

// 장바구니
app.use('/cart', ensureLoggedIn, cartRouter); // 미들웨어와 라우터를 한 줄에 연결

// 마이페이지 (userRouter 내에 /mypage 라우터가 정의되어 있어야 함)
app.use('/mypage', ensureLoggedIn, userRouter);

// 게시판의 특정 경로 (로그인이 필요)
// app.use('/board/new', ensureLoggedIn); // 이것들을 제거하고 아래 boardRouter 안에서 처리하는 것을 추천
// app.use('/board/create', ensureLoggedIn);
// app.use('/board/edit/:id', ensureLoggedIn);
// app.use('/board/delete/:id', ensureLoggedIn);
// app.use('/board/reply/:id', ensureLoggedIn);

// 일반적인 게시판 라우터 (로그인 필요 없는 목록/상세 보기 포함)
// 만약 boardRouter 내에서 `router.get('/new', isAuthenticated, ...)` 처럼 미들웨어를 사용한다면
// app.use('/board', boardRouter); 만 있어도 됩니다.
// 현재는 `app.use('/board/new', ensureLoggedIn)` 방식이 있으니 이대로 둡니다.
app.use('/board', boardRouter);


// --- 에러 핸들링 미들웨어 (가장 마지막에 위치) ---

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;