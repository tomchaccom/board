var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const boardRouter = require('./routes/board');

const productRouter = require('./routes/product'); // 새로 추가
const cartRouter = require('./routes/cart');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
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
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user; // 세션에 저장된 사용자 정보를 res.locals.user에 할당
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/user',userRouter);
app.use('/board', boardRouter);
app.get('/login', (req,res)=> {
  res.redirect('/user/login');
});
app.use('/product', productRouter); // 제품 라우터 연결
app.use('/cart', cartRouter);       // 장바구니 라우터 연결
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

