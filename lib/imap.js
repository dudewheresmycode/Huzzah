var CONFIG = require('../config.json');

// var WebSocket = require('ws');
// var http = require('http');
var express = require('express');
var Imap = require('imap');
var jwt = require('jsonwebtoken');
var _ = require('lodash');

var router = express.Router();
var DEBUG = false;

function debugFunc(s){
  console.log("DEBUG", s);
}

function optionBuilder(params){
  var config = {}; //Object.assign({}, params);

  config.user = params.imap.username.length > 0 ? params.imap.username : params.imap.defaults.username;
  config.password = params.password;
  config.host = params.imap.host.length > 0 ? params.imap.host : params.imap.defaults.host;
  config.port = parseInt(params.imap.port ? params.imap.port : params.imap.defaults.port) || 143;
  config.tls = params.imap.security=='starttls' || params.imap.security=='ssl'; //config.tls;
  config.autotls = 'always';
  config.ssl = params.imap.security=='ssl';
  // config.tls = params.imap.security=='TLS'; //config.tls;
  config.tlsOptions = { rejectUnauthorized: false };

  if(DEBUG) config.debug = debugFunc;
  console.log(params);
  console.log(config);
  return config;
}

router.post("/test", function(req,res){
  var config = optionBuilder(req.body);


  var imap = new Imap(config);

  var connected = false;
  imap.once('ready', function() {
    console.log("Connected!\n");
    connected = true;
    imap.end();
    res.json({connected:connected});
  });

  imap.once('error', function(err) {
    console.log("Error", err);
    res.json({connected:false, error:err.message});
  });

  imap.once('end', function() {
    console.log('Connection ended');
  });

  imap.connect();


});
router.get("/logout", function(req,res){
  req.session.destroy(function(){
    res.redirect("/");
  });
});
router.post("/login", function(req,res){

  var config = optionBuilder(req.body);

  var imap = new Imap(config);

  var connected = false;
  imap.once('ready', function() {
    console.log("Connected!\n");
    connected = true;
    console.log("OK CONFIG", config);
    res.json({connected:true});
    imap.end();
  });

  imap.once('error', function(err) {
    console.log("Error", err);
    res.json({connected:false, error:err.message});
  });

  imap.once('end', function() {
    console.log('Connection ended');
    // res.json({connected:connected});
    // res.json({connected:false});
  });

  imap.connect();

})

var imapStore = {
  sent: function(account, messageData, callback){
    var config = optionBuilder(account);
    var imap = new Imap(config);
    imap.once('ready', function(err) {
      imap.append(messageData, {mailbox:"Sent Mail"}, function(err){
        imap.end();
        callback(err);
      });
    });
    imap.once('error', function(err) {
      console.log("Error", err);
    });
    imap.connect();

  }
};


// module.exports.ImapSocket = socket;
module.exports.ImapRouter = router;
module.exports.ImapOptionBuilder = optionBuilder;
module.exports.ImapStore = imapStore;
