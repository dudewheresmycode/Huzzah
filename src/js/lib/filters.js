global.jQuery = global.$ = require('jquery');
var angular = global.angular = require('angular');

var moment = require('moment');


angular.module('huzzahApp.filters', [])
.filter('jsUcfirst', function(){
  return function(str){
    if(str){
      var splitStr = str.toLowerCase().split(' ');
       for (var i = 0; i < splitStr.length; i++) {
           // You do not need to check if i is larger than splitStr length, as your for does that for you
           // Assign it back to the array
           splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
       }
       // Directly return the joined string
       return splitStr.join(' ');
    }else{
      return '';
    }
  }
})
.filter('maildate',function(){
  return function(str,full){
    var m = moment(str);
    if(full){
      return m.format('dddd, MMMM Do YYYY, h:mm A');
    }
    if(moment().diff(m,'months') >= 1){
      return m.format('M/D/YY');
    }
    if(moment().diff(m,'days') >= 1){
      return m.format('MMM D');
    }
    if(moment().diff(m, 'days') < 1){
      return m.format('h:mm A');
    }
    // if(moment().diff(m,'days') > 1){}
    return m.fromNow()

  }
})

.filter('mailboxIcon',function(){
  return function(label){
    var default_icon = "folder";
    var icons = {
      "INBOX": "inbox-in",
      "DRAFTS": "file-edit",
      "ARCHIVE": "archive",
      "JUNK": "thumbs-down",
      "SENT": "paper-plane",
      "TRASH": "trash"
    };
    var uc = label.toUpperCase();
    return 'fa-' + (icons[uc] ? icons[uc] : default_icon);
  }
})
module.exports = 'huzzahApp.filters';
