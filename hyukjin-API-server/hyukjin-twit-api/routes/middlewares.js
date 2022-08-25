const jwt = require('jsonwebtoken');
const RateLimit = require('express-rate-limit');
const Domain = require('../models/domain');
const url = require('url');

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.status(403).send('로그인 필요');
  }
};

exports.isNotLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    next();
  } else {
    res.redirect('/');
  }
};

exports.verifyToken = (req, res, next) => {
  try {
    req.decoded = jwt.verify(req.headers.authorization, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') { // 유효기간 초과
      return res.status(419).json({
        code: 419,
        message: '토큰이 만료되었습니다',
      });
    }
    return res.status(401).json({
      code: 401,
      message: '유효하지 않은 토큰입니다',
    });
  }
};

exports.tokenApiLimiter =  RateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10,
  delayMs: 0,
  handler(req, res) {
    res.status(this.statusCode).json({
      code: this.statusCode, // 기본값 429
      message: '1분에 한 번만 요청할 수 있습니다.',
    });
  },
});
exports.freeApiLimiter =  RateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10,
  delayMs: 0,
  handler(req, res) {
    res.status(this.statusCode).json({
      code: this.statusCode, // 기본값 429
      message: '1분에 열번만 요청할 수 있습니다.',
    });
  },
});

exports.apiLimiter =  RateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10,
  delayMs: 0,
  handler(req, res) {
    res.status(this.statusCode).json({
      code: this.statusCode, // 기본값 429
      message: '1분에 열번만 요청할 수 있습니다.',
    });
  },
});
const freeApiLimiter =  RateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10,
  delayMs: 0,
  handler(req, res) {
    res.status(this.statusCode).json({
      code: this.statusCode, // 기본값 429
      message: ' free 등급은 1분에 열번만 요청할 수 있습니다.',
    });
  },
});

const premiumApiLimiter =  RateLimit({
  windowMs: 60 * 1000, // 1분
  max: 20,
  delayMs: 0,
  handler(req, res) {
    res.status(this.statusCode).json({
      code: this.statusCode, // 기본값 429
      message: 'premium 등급은 1분에 이십번만 요청할 수 있습니다.',
    });
  },
});

exports.checkType = async (req, res, next) => {
  try{
    const domain = await Domain.findOne({
      where: { host: url.parse(req.get('origin')).host },
    });
    if (domain) {
      if(domain.type == 'free'){
        freeApiLimiter(req,res,next);
      } else{
        premiumApiLimiter(req,res,next);    
      }
    } else {
      res.end('no such domain')
    } 
  } catch(e){
    next(e);
  }

}


exports.deprecated = (req, res) => {
  res.status(410).json({
    code: 410,
    message: '새로운 버전이 나왔습니다. 새로운 버전을 사용하세요.',
  });
};


