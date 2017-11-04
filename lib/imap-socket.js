
var WebSocket = require('ws');
var Imap = require('imap');
var simpleParser = require('mailparser').simpleParser;
var sessionLib = require('./session.js');
var ImapOptionBuilder = require('./imap.js').ImapOptionBuilder;

module.exports = function(server, sessionParse){

  var wss = new WebSocket.Server({ server });

  wss.on('connection', function connection(ws, req) {
    // const location = url.parse(req.url, true);
    // You might use location.query.access_token to authenticate or share sessions
    // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)
    // console.log("SOCKET CONNECTED", req.upgradeReq);
    sessionParse(req, {}, function() {
      // var sessionID = req.upgradeReq.signedCookies['connect.sid'];
      sessionLib(req, {}, function(){
        if(!req.account){
          console.log('no session!');
          ws.send(JSON.stringify({action:'session.error', data:{error:'Session error'}}));
          return;
        }

        var options = ImapOptionBuilder(req.account, false);
        console.log("SOCKET req.upgradeReq.session", options);
        options.keepalive = {
          interval: 10000,
          idleInterval: 300000, // 5 mins
          forceNoop: true
        };

        ws._imap = new Imap(options);
        ws._imap.once('ready', function() {
          console.log("Connected!\n");
          ws._imap.getBoxes(function(err,boxes){
            var mb = [];
            for(var label in boxes){
              mb.push({key:label, value:boxes[label]});
            }
            ws.send(JSON.stringify({action:'mailbox.list', data:{mailboxes:mb}}));
          });
        });

        ws._imap.on('mail', function(numNewMsgs) {
          console.log("(mail) NEW MAIL!", numNewMsgs);
          ws.send(JSON.stringify({action:'mailbox.newmail', data:{count:numNewMsgs}}));
        });
        ws._imap.on('update', function(seq,info) {
          console.log("(update) NEW MAIL!", seq,info);
          ws.send(JSON.stringify({action:'mailbox.newmail', data:{info:info}}));
        });
        ws._imap.on('alert', function(msg) {
          console.log("(update) NEW MAIL!", msg);
          ws.send(JSON.stringify({action:'mailbox.newmail', data:{msg:msg}}));
        });


        ws._imap.on('error', function(err) {
          console.log("Error", err);
        });

        ws._imap.once('end', function() {
          console.log('Connection ended');
        });

        ws._imap.connect();

      });

    });
    ws.on('message', function incoming(message) {
      var parsed = JSON.parse(message);
      console.log('received:', parsed);
      switch(parsed.action){
        case 'mailbox.getmessage':
          var omessage = {};

          ws._imap.openBox(parsed.data.mailbox, true, function(err, box){
            if (err) throw err;
            var f = ws._imap.seq.fetch(parsed.data.message, {
              // bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)','TEXT']
              bodies: [''] //get it all!
            });

            f.on('message', function(msg, seqno) {
              console.log('Message #%d', seqno);
              var prefix = '(#' + seqno + ') ';

              omessage.prefix = prefix;
              omessage.seq = seqno;

              msg.on('body', function(stream, info) {
                var buffer = '';
                stream.on('data', function(chunk) { buffer += chunk.toString('utf8'); });
                stream.once('end', function() {
                  simpleParser(buffer, (err, mail)=>{
                    omessage.data = mail;
                    ws.send(JSON.stringify({action:'mailbox.messagedata', data:{message:omessage}}));
                  });
                });

              });
              msg.once('attributes', function(attrs) {
                omessage.attrs = attrs;
                console.log(prefix + 'Attributes:', attrs);
              });
              msg.once('end', function() {
                // messages.push(message);
                console.log(prefix + 'Finished');
              });
            });
            f.once('error', function(err) {
              console.log('Fetch error: ' + err);
              ws.send(JSON.stringify({action:'mailbox.error', data:{error:err}}));
            });
            f.once('end', function() {
              console.log('Done fetching message!');

            });
          });

        break;
        case 'mailbox.open':
          var messages = [];
          ws._imap.openBox(parsed.data.mailbox, true, function(err, box){
            if (err) throw err;
            //#TODO save last seq number and fetch from last position
            var f = ws._imap.seq.fetch('1:*', {
              markSeen:false,
              bodies: ['TEXT', 'HEADER.FIELDS (FROM TO SUBJECT DATE)'],
              struct: true
            });
            f.on('message', function(msg, seqno) {
              var prefix = '(#' + seqno + ') ';
              var message = {prefix:prefix, seq:seqno};
              msg.on('body', function(stream, info) {
                var buffer = '';
                stream.on('data', function(chunk) { buffer += chunk.toString('utf8'); });
                stream.once('end', function() {
                  message.headers = Imap.parseHeader(buffer);
                });
              });
              msg.once('attributes', function(attrs) {
                message.attrs = attrs;
              });
              msg.once('end', function() {
                messages.push(message);
              });
            });
            f.once('error', function(err) {
              console.log('Fetch error: ' + err);
              ws.send(JSON.stringify({action:'mailbox.error', data:{error:err}}));
            });
            f.once('end', function() {
              console.log('Done fetching all messages!');
              ws.send(JSON.stringify({action:'mailbox.messages', data:{messages:messages}}));
            });
          });
        break;
      }
    });
    ws.on('close', function close() {
      if(ws._imap) ws._imap.end();
      console.log('disconnected');
    });

    // ws.send('something');
  });

}
