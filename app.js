// app.js

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');

// 1. ensureLoggedIn 미들웨어 불러오기 (새로 추가)
const { ensureLoggedIn } = require('./middleware/authMiddleware'); // authMiddleware.js 경로 확인

const boardRouter = require('./routes/board');
const productRouter = require('./routes/product');
const cartRouter = require('./routes/cart');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users'); // 이 라우터가 실제로 사용되는지 확인 필요. 보통은 user 라우터가 회원 관련 모든 것을 담당.
const userRouter = require('./routes/user');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'secret-key', // 실제 운영 환경에서는 더 복잡하고 안전한 키를 사용하세요.
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60 * 60 * 1000 } // 세션 유효 시간 1시간 설정 (밀리초)
}));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// 2. 이 부분은 제거하거나 주석 처리합니다. 각 라우터에서 명시적으로 user 정보를 EJS로 넘겨주세요.
/*
app.use((req, res, next) => {
  res.locals.user = req.session.user; // 세션에 저장된 사용자 정보를 res.locals.user에 할당
  next();
});
*/

// 라우터 연결 (로그인이 필요 없는 기본 라우터 먼저 연결)
app.use('/', indexRouter);
app.use('/users', usersRouter); // 이 라우터가 실제로 사용되는지 확인
app.use('/user', userRouter); // user 관련 라우터 (로그인, 회원가입 등)

app.get('/login', (req,res)=> { // 이 부분은 이제 필요 없습니다. /user/login으로 직접 리다이렉트됩니다.
  res.redirect('/user/login');
});

// 3. 로그인 필요 라우터에 미들웨어 적용 (중요! 해당 라우터 파일의 app.use()보다 먼저 와야 함)
// 장바구니
app.use('/cart', ensureLoggedIn); // 먼저 ensureLoggedIn 미들웨어 적용
app.use('/cart', cartRouter);       // 그 다음에 cart 라우터 연결

// 마이페이지 (userRouter에 마이페이지 관련 GET/POST 라우터가 있다고 가정)
app.use('/mypage', ensureLoggedIn); // 먼저 ensureLoggedIn 미들웨어 적용
app.use('/mypage', userRouter);     // 그 다음에 userRouter 연결 (userRouter 내에 /mypage가 정의되어 있어야 함)


// 게시판 (글쓰기, 수정, 삭제, 답글 기능에만 로그인 필요)
// boardRouter는 전체적으로 게시글 목록, 상세보기를 담당하므로, 부분적으로 미들웨어를 적용합니다.
// 이 부분은 boardRouter를 연결하기 전에 개별 경로에 미들웨어를 적용하는 방식이 좋습니다.
app.use('/board/new', ensureLoggedIn); // 새 글 작성 폼
app.use('/board/create', ensureLoggedIn); // 새 글/답글 POST 처리
app.use('/board/edit/:id', ensureLoggedIn); // 글 수정 폼 및 POST 처리
app.use('/board/delete/:id', ensureLoggedIn); // 글 삭제
app.use('/board/reply/:id', ensureLoggedIn); // 답글 작성 폼

// 이제 일반적인 게시판 라우터 연결 (로그인 필요 없는 목록/상세 보기 포함)
app.use('/board', boardRouter);

// 제품 라우터 연결 (로그인 필요 없음)
app.use('/product', productRouter);


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