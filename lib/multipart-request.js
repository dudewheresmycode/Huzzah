// parse multipart
var util = require('util');
var Busboy = require('busboy');

function MultipartRequest(req, callback){
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
    callback(null, mail_opts);
  });
  req.pipe(busboy);
}
module.exports = MultipartRequest;
