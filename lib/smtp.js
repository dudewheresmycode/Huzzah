var CONFIG = require('../config.json');

// var WebSocket = require('ws');
var util = require('util');
var express = require('express');
var nodemailer = require('nodemailer');
var SMTPConnection = require('nodemailer/lib/smtp-connection');
var MailComposer = require('nodemailer/lib/mail-composer');
var jwt = require('jsonwebtoken');
var _ = require('lodash');
var ImapStore = require('./imap.js').ImapStore;
var MultipartRequest = require('./multipart-request.js');


var router = express.Router();


router.post("/test", function(req,res){

  var connection = new SMTPConnection(connect_opts(req.body));
  connection.on('error',function(e){
    var msg = "Unable to connect.";
    if(e.errno=="ECONNREFUSED"){
      msg = "Connection refused by server.";
    }
    console.log(e);
    // connection.off('error');
    // connection.quit();
    // res.json({connected:false, error:e.message});
  });

  connection.connect(function(err){
    if(err){ res.json({success:false, error:err}); return; }
    connection.login(auth_opts(req.body), function(err,ot){
      if(err){ res.json({success:false, error:err.message}); return; }
      console.log(err,ot);
      connection.quit();
      res.json({connected:true});
    });
  });

});




router.post("/send", function(req,res){
  MultipartRequest(req, function(err, mail_opts){
    var mailObj = new MailComposer(mail_opts);
    // console.log(mailObj);
    mailObj.compile().build(function(err, message){
      // send mail with defined transport object
      var opts = connect_opts(req.account);
      opts.auth = auth_opts(req.account).credentials;
      let transporter = nodemailer.createTransport(opts);

      transporter.sendMail(mailObj.mail, (error, info) => {
        if (error) {
          res.json({success:false, error: error});
          return console.log(error);
        }
        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@blurdybloop.com>
        console.log('Message sent: %s', info.messageId);
        ImapStore.sent(req.account, message, function(err){
          res.json({success:!err, error:err});
        });
      });
    });

  })

});

function auth_opts(account){
  var auth = {};
  auth.credentials = {};
  auth.credentials.user = account.smtp.username.length>0 ? account.smtp.username : account.smtp.defaults.username;
  auth.credentials.pass = account.password;
  return auth;
}

function connect_opts(account){
  var options = {};
  options.host = account.smtp.host ? account.smtp.host : account.smtp.defaults.host;
  if(options.host.length==0){ res.json({success:false, error:"Host not found"}); return; }

  options.port = (account.smtp.port ? account.smtp.port : account.smtp.defaults.port) || 465;

  options.secure = account.smtp.security=='ssl';
  options.ignoreTLS = account.smtp.security=='none';
  options.opportunisticTLS = true; //req.body.security=='none';
  options.requireTLS = account.smtp.security=='starttls';
  options.tls = { rejectUnauthorized: false };
  // options.auth = auth_opts(account);
  return options;

}

module.exports.SmtpRouter = router;
