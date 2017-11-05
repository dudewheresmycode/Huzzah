global.jQuery = global.$ = require('jquery');
var angular = global.angular = require('angular');

var moment = require('moment');
var emailaddrs = require('email-addresses');

angular.module('huzzahApp.filters', [])
.filter('emailParse',function($sanitize){
  //key can be `name`,`address`,`local`,`domain`
  return function(emstr,key){
    // var regex = new RegExp("^(\")?(.*)(?(1)\1|)\s+<(.*)>$","gi");
    var p = {address:emstr};
    // var regex = new RegExp("^(\")?(.*)\1$ +\<(.*)\>","g");
    var regex = new RegExp("(\")?(.*)\\1 +\<(.*)\>","g");
    var match = regex.exec(emstr);
    if(match && match.length > 3){
      p.name = match[2];
      p.address = match[3];
    }
    console.log(emstr, match);
    // var safe = emstr.replace('&','&amp;');
    // console.log("EM", safe);
    // var p = emailaddrs.parseOneAddress(safe);
    var default_key = "name" in p ? 'name' : 'address';
    return typeof key=='string' ? p[key] : p[default_key];
  }
})
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
    var icons = [
      {i:"inbox-in", r:/inbox/gi},
      {i:"file-edit", r:/drafts/gi},
      {i:"archive", r:/archive/gi},
      {i:"thumbs-down", r:/junk/gi},
      {i:"paper-plane", r:/sent/gi},
      {i:"trash", r:/trash/gi}
    ];
    icons.forEach(function(it){
      if(it.r.test(label)){
        default_icon = it.i;
      }
    })
    return 'fa-'+default_icon;
    //var uc = label.toUpperCase();
    //return 'fa-' + (icons[uc] ? icons[uc] : default_icon);
  }
})
module.exports = 'huzzahApp.filters';
