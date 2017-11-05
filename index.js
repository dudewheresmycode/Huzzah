
var huzzah = require('./lib/huzzah.js');

var port = process.argv[2] || 3130;

huzzah(port, function(){
  console.log("PORT", port);
});

module.exports = huzzah;
