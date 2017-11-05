var CONFIG = require('../config.json');

var express = require('express');
var bodyParser = require('body-parser');

var session = require('express-session')
var cookieParser = require('cookie-parser');
var http = require('http');
var path = require('path');
var _ = require('lodash');

var FileStore = require('session-file-store')(session);

module.exports = function(port, callback){

  var rootDir = path.resolve('./');
  var libDir = path.resolve('./lib');

  console.log("rootDir: %s", rootDir);
  console.log("libDir: %s", libDir);

  var app = express();

  var server = http.createServer(app);

  // static files
  app.use(express.static(path.join(rootDir,'public')));
  // compiled files
  app.use("/dist", express.static(path.join(rootDir,'dist')));

  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }))
  // parse application/json
  app.use(bodyParser.json())

  // parse cookie
  app.use(cookieParser());

  var sessionParse = session({
    store: new FileStore({
      path: path.join(rootDir,'db/sessions')
    }),
    secret: CONFIG.session_secret,
    resave: false,
    saveUninitialized: false
  });

  app.use(sessionParse)

  // serialize session
  app.use(require(path.join(libDir, 'session.js')));

  app.get("/session", function(req,res){
    res.json({session:!!req.account, account:_.omit(req.account,['password'])});
  });


  app.use("/smtp", require(path.join(libDir, 'smtp.js')).SmtpRouter);
  app.use("/imap", require(path.join(libDir, 'imap.js')).ImapRouter);
  app.use("/accounts", require(path.join(libDir, 'accounts.js')));


  var wss = require(path.join(libDir, 'imap-socket.js'))(server, sessionParse);

  server.listen(port,function(){
    console.log("Server running at localhost:%s", port);
    callback();
  });

}
