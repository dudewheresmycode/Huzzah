var CONFIG = require('../config.json');
var jwt = require('jsonwebtoken');
var express = require('express');

var router = express.Router();

router.post('/save', function(req,res){
  var token = jwt.sign(req.body, CONFIG.jwt_secret);
  req.session.token = token;
  res.json({token:token});
});

router.post('/select', function(req,res){
  // var token = jwt.sign(req.body, CONFIG.jwt_secret);
  req.session.token = req.body.token;
  res.json({success:true});
});

router.get("/logout", function(req,res){
  req.session.destroy(function(){
    res.redirect("/");
  });
});

module.exports = router;
