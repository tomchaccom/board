const express = require('express');
const router = express.Router();

// 임시 제품 데이터 (데이터베이스 대신 사용)
const products = [
    { id: 1, name: '불닭볶음면', price: 1800, image: '/images/1.jpg', description: '편안하고 스타일리시한 티셔츠입니다.' },
    { id: 2, name: '간짬뽕', price: 1500, image: '/images/2.jpg', description: '어떤 상의에도 잘 어울리는 청바지입니다.' },
    { id: 3, name: '신라면', price: 1400, image: '/images/3.jpg', description: '일상생활과 운동에 모두 적합한 운동화입니다.' },
    { id: 4, name: '진짬뽕', price: 2000, image: '/images/4.jpg', description: '수납 공간이 넓고 내구성이 뛰어난 백팩입니다.' }
];

// 제품 목록 페이지
router.get('/', (req, res) => {
    res.render('product', { products: products });
});

// 제품 상세 페이지
router.get('/:id', (req, res) => {
    const productId = parseInt(req.params.id);
    const product = products.find(p => p.id === productId);

    if (!product) {
        return res.status(404).send('제품을 찾을 수 없습니다.');
    }
    res.render('product_detail', { product: product });
});

module.exports = router;