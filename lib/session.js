var CONFIG = require('../config.json');
var jwt = require('jsonwebtoken');

var middle = function(req,res,next){
  console.log(req.session.token);
  if(req.session.token){
    jwt.verify(req.session.token, CONFIG.jwt_secret, function(err,decoded){
      if(decoded) req.account = decoded;
      next();
    });
  }else{
    next();
  }
}

module.exports = middle;
