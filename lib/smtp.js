var CONFIG = require('../config.json');

// var WebSocket = require('ws');
var util = require('util');
var express = require('express');
const nodemailer = require('nodemailer');
const SMTPConnection = require('nodemailer/lib/smtp-connection');
const MailComposer = require('nodemailer/lib/mail-composer');

var jwt = require('jsonwebtoken');
var _ = require('lodash');

var ImapStore = require('./imap.js').ImapStore;

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

// parse multipart
var Busboy = require('busboy');

router.post("/send", function(req,res){
  var busboy = new Busboy({ headers: req.headers });
  var fields = {};
  var attachments = [];
  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    var filepass = Buffer.alloc(0);
    file.on('data', function(data) { filepass = Buffer.concat([filepass, data]); });
    file.on('end', function() {
      attachments.push({filename:filename, content: filepass, contentType:mimetype});
    });
  });
  busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) { fields[fieldname] = val; });
  busboy.on('error', function(err) { console.log('Error parsing form!', err); res.json({success:false}); });
  busboy.on('finish', function() {
    console.log('Done parsing form!');

    var opts = connect_opts(req.account);
    opts.auth = auth_opts(req.account).credentials;
    let transporter = nodemailer.createTransport(opts);

    // setup email data with unicode symbols
    var mail_opts = {
      to: fields.to, // list of receivers
      text: fields.body_text, // plain text body
      html: fields.body_html // html body
    };

    mail_opts.from = req.account.name ? util.format('"%s" <%s>', req.account.name, req.account.email) : req.account.email;

    mail_opts.subject = fields.subject || '[No Subject]';

    if(fields.cc.length > 0){ mail_opts.cc = fields.cc; }
    if(fields.bcc.length > 0){ mail_opts.bcc = fields.bcc; }

    if(attachments.length > 0){
      mail_opts.attachments = attachments;
    }
    var mailObj = new MailComposer(mail_opts);
    // console.log(mailObj);
    mailObj.compile().build(function(err, message){
      // send mail with defined transport object
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

  });
  req.pipe(busboy);


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
