
var WebSocket = require('ws');
var Imap = require('imap');
var simpleParser = require('mailparser').simpleParser;
var sessionLib = require('./session.js');
var ImapOptionBuilder = require('./imap.js').ImapOptionBuilder;
var async = require('async');
var util = require('util');

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
        options.keepalive = {
          interval: 10000,
          idleInterval: 300000, // 5 mins
          forceNoop: true
        };


        ws._imap = new Imap(options);
        ws._imap.once('ready', function() {
          console.log("Connected!\n");
          MailboxList(ws._imap, function(err,mailboxes){
            if(err){
              ws.send(JSON.stringify({action:'mailbox.error', data:{error:err}}));
            }else{
              ws.send(JSON.stringify({action:'mailbox.list', data:{mailboxes:mailboxes}}));
            }
          });
          // ws._imap.getBoxes(function(err,boxes){
          //   // console.log('boxes', boxes);
          //   var mb = [];
          //   //.filter(function(b){ return !b.attribs.indexOf('\\Noselect'); })
          //   async.map(Object.keys(boxes), function(b,cb){
          //     if(boxes[b].children) console.log(boxes[b].children);
          //     var box_obj = {
          //       key:b,
          //       attribs:boxes[b].attribs,
          //       delimiter:boxes[b].delimiter,
          //       hasChildren: !!boxes[b].children
          //     };
          //
          //     ws._imap.status(b, function(err,box){
          //       if(!err){
          //         box_obj.messages = box.messages;
          //       }
          //       cb(null, box_obj);
          //     });
          //   },function(err, boxes){
          //     var primary = [];
          //     primaryBoxes.forEach(function(pb){
          //       var b = boxes.find(function(it){ return pb.test(it.key); });
          //       if(b){ primary.push(b); }
          //     });
          //     var secondary = boxes.filter(function(it){ return primary.indexOf(it)==-1; });
          //     var mailboxes = primary.concat(secondary);
          //     ws.send(JSON.stringify({action:'mailbox.list', data:{mailboxes:mailboxes}}));
          //   });
            // for(var label in boxes){
            //   //value:boxes[label]
            //   var box = boxes[label];
            //   mb.push({key:label});
            // }
            // console.log(mb);
            // ws.send(JSON.stringify({action:'mailbox.list', data:{mailboxes:mb}}));
          //});
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

          ws._imap.openBox(parsed.data.mailbox, false, function(err, box){
            if (err) throw err;
            var f = ws._imap.seq.fetch(parsed.data.message, {
              markSeen: true,
              // bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)','TEXT']
              bodies: [''] //get it all!
            });

            f.on('message', function(msg, seqno) {
              console.log('Message #%d', seqno);
              var prefix = '(#' + seqno + ') ';

              omessage.prefix = prefix;
              omessage.seq = seqno;
              omessage.flags = msg.attributes;

              msg.on('body', function(stream, info) {
                var buffer = '';
                stream.on('data', function(chunk) { buffer += chunk.toString('utf8'); });
                stream.once('end', function() {
                  omessage.headers = Imap.parseHeader(buffer);
                  omessage.info = info;
                  omessage.data = buffer;
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
              console.log('Done fetching message!', omessage.flags);

              simpleParser(omessage.data, (err, mail)=>{
                omessage.data = mail;
                ws.send(JSON.stringify({action:'mailbox.messagedata', data:{message:omessage}}));
                //remove unseen flag
                // var flag = '\\Seen';
                // if(omessage.attrs.flags.indexOf(flag) == -1){
                //   console.log('set seen flag', omessage.seq, 'SEEN', flag);
                //   ws._imap.seq.addFlags(omessage.seq, flag, function(err){
                //     console.log(err);
                //   });
                // }

              });



            });
          });

        break;
        case 'mailbox.open':
          var messageList = [];
          console.log("OPEN", parsed.data.mailbox);
          ws._imap.openBox(parsed.data.mailbox, true, function(err, box){
            if (err) throw err;
            //#TODO save last seq number and fetch from last position
            var range = box.messages.total > 20 ? util.format("%s:*", box.messages.total-20) : "1:*";
            console.log("TOTAL: %s, RANGE: %s", box.messages.total, range);
            // ws._imap.search([ 'ALL' ], function(err,results){

            var f = ws._imap.seq.fetch(range, {
              markSeen: false,
              bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
              //extensions: ['X-GM-LABELS'], //for gmail?
              struct: true
            });
            f.on('message', function(msg, seqno) {
              var prefix = '(#' + seqno + ') ';
              var message = {
                prefix:prefix,
                seq:seqno,
                flags:msg.attributes
              };
              msg.on('body', function(stream, info) {
                var raw;
                var buffer = '';
                stream.on('data', function(chunk) { buffer += chunk.toString('utf8'); });
                stream.once('end', function() {
                  message.headers = Imap.parseHeader(buffer);
                  message._raw = buffer;
                  raw = Buffer.from(buffer);
                });
              });
              msg.once('attributes', function(attrs) {
                console.log(attrs.flags);
                message.attrs = attrs;
              });
              msg.once('end', function() {
                messageList.push(message);
              });
            });
            f.once('error', function(err) {
              console.log('Fetch error: ' + err);
              ws.send(JSON.stringify({action:'mailbox.error', data:{error:err}}));
            });
            f.once('end', function() {
              console.log('Done fetching all messages!');
              ws.send(JSON.stringify({action:'mailbox.messages', data:{messages:messageList}}));
              // async.map(messageList, function(m,cb){
              //   simpleParser(m._raw, (err, mail)=>{
              //     m.parsed = mail;
              //     delete m._raw;
              //     cb(err, m);
              //   });
              // }, function(error,updated){
                // ws.send(JSON.stringify({action:'mailbox.messages', data:{messages:updated}}));
              // });
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


function MailboxList(conn,callback){
  conn.getBoxes(function(err,boxes){
    async.map(Object.keys(boxes), function(b,cb){
      if(boxes[b].children) console.log(boxes[b].children);
      var box_obj = MailboxStruct(boxes[b], b);
      conn.status(b, function(err,box){
        if(!err){
          box_obj.messages = box.messages;
        }
        cb(null, box_obj);
      });
    }, function(err, cboxes){
      var primaryBoxes = [/inbox/gi,/drafts/gi,/sent/gi];
      var primary = [];
      primaryBoxes.forEach(function(pb){
        var b = cboxes.find(function(it){ return pb.test(it.key); });
        if(b){ primary.push(b); }
      });
      var secondary = cboxes.filter(function(it){ return primary.indexOf(it)==-1; });
      var mailboxes = primary.concat(secondary);
      callback(null, mailboxes);
    });
  });
}
function MailboxStruct(box,key){
  var obj = {
    key:key,
    attribs:box.attribs,
    delimiter:box.delimiter,
    hasChildren: !!box.children
  };
  if(!!box.children){
    obj.children = Object.keys(box.children).map(function(k){ return MailboxStruct(box.children[k], k); });
  }
  return obj;
}
