global.jQuery = global.$ = require('jquery');
var angular = global.angular = require('angular');


angular.module('huzzahApp.socket', [])
.service('$socket',function($q,$state,$rootScope){
  var socket = {};

  socket.send = function(action, data){
    socket.ws.send(JSON.stringify({action:action, data:data}))
  }
  socket.connect = function(){
    var defer = $q.defer();
    socket.ws = new WebSocket('ws://localhost:'+window.location.port+'/imap');

    socket.ws.addEventListener('open', open);
    socket.ws.addEventListener('close', close);
    socket.ws.addEventListener('message', incoming);

    function close() {
      console.log('disconnected');
      socket.ws.removeEventListener('open', open);
      socket.ws.removeEventListener('close', close);
      socket.ws.removeEventListener('message', incoming);
    }

    function open() {
      console.log('connected');
      defer.resolve();
    }

    function incoming(event) {
      var obj = JSON.parse(event.data);
      console.log("Socket event: %s", obj.action);
      if(obj.action=='session.error'){
        $state.go('login');
        return;
      }
      $rootScope.$emit(obj.action, obj.data);
      $rootScope.$apply();
      // console.log(`Roundtrip time: ${Date.now() - data} ms`);
    }
    return defer.promise;
  }
  return socket;
})

module.exports = 'huzzahApp.socket';
