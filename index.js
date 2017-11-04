var CONFIG = require('./config.json');

var express = require('express');
var bodyParser = require('body-parser');

var session = require('express-session')
var cookieParser = require('cookie-parser');
var http = require('http');
var _ = require('lodash');

var FileStore = require('session-file-store')(session);

var app = express();
var port = process.argv[2] || 3130;

var server = http.createServer(app);

// static files
app.use(express.static(__dirname+'/public/'));
// compiled files
app.use("/dist", express.static(__dirname+'/dist/'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

// parse cookie
app.use(cookieParser());

var sessionParse = session({
  store: new FileStore({
    path: './db/sessions'
  }),
  secret: CONFIG.session_secret,
  resave: false,
  saveUninitialized: false
});

app.use(sessionParse)

// serialize session
app.use(require('./lib/session.js'));

app.get("/session", function(req,res){
  res.json({session:!!req.account, account:_.omit(req.account,['password'])});
});


app.use("/smtp", require('./lib/smtp.js').SmtpRouter);
app.use("/imap", require('./lib/imap.js').ImapRouter);
app.use("/accounts", require('./lib/accounts.js'));


var wss = require('./lib/imap-socket.js')(server, sessionParse);

server.listen(port,function(){
  console.log("Server running at localhost:%s", port);
});
