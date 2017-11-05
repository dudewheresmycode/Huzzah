global.jQuery = global.$ = require('jquery');
var angular = global.angular = require('angular');

angular.module('huzzahApp.controllers', ['ui.router'])

.controller('ctl.app', function($scope,$socket,$state,$rootScope,$http,$accountList,mailboxes){
  // $scope.mailboxes = mailboxes.data.mailboxes;

  $scope.mailboxes = mailboxes;
  var inbox = $scope.mailboxes.find(function(it){ return it.key.toUpperCase()=='INBOX'; });
  console.log("LISTED", $scope.mailboxes);
  if($state.current.name=='app'){
    $state.go('app.mailbox', {mailbox:inbox.key}, {reload:false, notify:true, location:false});
  }
  $rootScope.accounts = $accountList.list();
  $rootScope.switchAccount = function(account){
    $http.post('accounts/select', account).then(function(response){
      console.log(response);
      $state.go('app', null, {reload:true});
    });
  }
  $scope.badgeCount = function(mailbox){
    if(!mailbox.messages){ return; }

    if(/drafts/gi.test(mailbox.key)){
      return mailbox.messages.total;
    }
    return mailbox.messages.unseen;
  }
  $rootScope.$on('mailbox.newmail', function($event,count){
    console.log("NEW MAIL!", count);
  });

  // $rootScope.$on('mailbox.list', function(evt,data){
  //   $scope.mailboxes = data.mailboxes;
  //   $scope.$apply();
  //   var inbox = $scope.mailboxes.find(function(it){ return it.key.toUpperCase()=='INBOX'; });
  //   console.log($state.current, inbox.key);
  //   if($state.current.name=='app'){
  //     $state.go('app.mailbox', {mailbox:inbox.key}, {reload:false, notify:true, location:false});
  //   }
  // })
})
.controller('ctl.compose',function($scope,$http,$multipart,$state){
  $scope.tags = [
      // { text: 'just' },
      // { text: 'some' },
      // { text: 'cool' },
      // { text: 'tags' }
  ];
  // $scope.emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  $scope.emailRegex = "^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$";
  // $scope.emailRegex = '^[0-9]+$';
  $scope.loadTags = function(query) {
    return [{text:'just'},{text:'a'},{text:'little'},{text:'loving'},{text:'will'},{text:'do'}];
      //  return $http.get('/tags?query=' + query);
  };
  $scope.params = {
    to:[],
    cc:[],
    bcc:[],
    subject:'',
    attachments:[]
  };
  $scope.optionals = {
    cc_open: false,
    bcc_open: false
  };
  $scope.progress = {stage:1, percent:0, saved_uid:null};
  $scope.saveDate = Date.now();

  $scope.save = function(){
    $scope.progress.saving=true;
    var progressListener = function(p){
      console.log(p);
      $scope.progress.percent = p;
    }
    var successListener = function(d){
      console.log(d.data.uid);
      if(d.data.uid){
        $scope.progress.saved_uid = d.data.uid;
        $scope.progress.last_saved = Date.now();
      }
      $scope.progress.percent = 100;
      $scope.progress.saving = false;
      //saved
    }
    var errorListener = function(e){
      console.log(e);
      $scope.progress.error = e;
      $scope.progress.percent = 0;
      $scope.progress.saving = false;
    }
    var api_url = "/imap/draft";
    if($scope.progress.saved_uid){
      api_url += '?uid='+$scope.progress.saved_uid;
    }
    $multipart.upload(api_url, $scope.params).then(successListener, errorListener, progressListener);
  }


  $scope.send = function(){
    var progressListener = function(p){
      console.log(p);
      $scope.progress.percent = p;
    }
    var successListener = function(d){
      console.log(d);
      $scope.progress.percent = 100;
    }
    var errorListener = function(e){
      console.log(e);
      $scope.progress.error = e;
      $scope.progress.percent = 0;
    }
    console.log('sending...', $scope.params);
    // $http.post('/smtp/send', $scope.params).then(function(d){
    //   console.log('sent', d);
    // });

    if(!$scope.params.to || $scope.params.to.length==0){
      $scope.progress.error = 'Email should have at least one To: address';
      return;
    }
    if(!$scope.params.subject || $scope.params.subject.length==0){
      $scope.progress.error = 'Email should have a subject';
      return;
    }

    $scope.progress.stage = 2;
    $multipart.upload("/smtp/send", $scope.params).then(successListener, errorListener, progressListener);

    // $http({
    //   method: 'POST',
    //   url: '/smtp/send',
    //   headers: {'Content-Type': undefined},
    //   data: $scope.params,
    //   uploadEventHandlers: {
    //     progress: function(e){
    //       if(e.lengthComputable){
    //         $scope.progress.percent = parseFloat(((e.loaded/e.total)*100).toFixed(1));
    //         console.log(e.loaded, e.total);
    //       }
    //     }
    //   },
    //   transformRequest: function (data, headersGetter) {
    //     var formData = new FormData();
    //     angular.forEach(data, function (value, key) {
    //       if(key=='attachments'){
    //         value.forEach(function(f,i){ formData.append("attachment_"+i, f); });
    //       }else if(key=='body'){
    //         formData.append("body_html", value.html);
    //         formData.append("body_text", value.text);
    //       }else if(Array.isArray(value)){
    //         formData.append(key, value.join(','));
    //       }else{
    //         formData.append(key, value);
    //       }
    //     });
    //     // var headers = headersGetter();
    //     // delete headers['Content-Type'];
    //     return formData;
    //   }
    // }).then(function (data) {
    //   console.log('sent', data);
    //   $scope.progress.percent = 100;
    //   $scope.progress.stage = 3;
    //   // $state.go('app');
    // }, function (data, status) {
    //   $scope.progress.stage = 1;
    //   console.log('err0r', data, status);
    // });

  }
})
.controller('ctl.mailbox', function($scope,$stateParams,$state,$rootScope,$socket,$transitions){

  $scope.messages = [];
  $scope.hasMailboxResponse = false;
  $scope.hasMessageOpened = $state.current.name=='app.mailbox.message';
  $rootScope.$on('mailbox.messages', function(evt,data){
    $scope.messages = data.messages;
    console.log('mailbox.messages', data.messages);
    $scope.hasMailboxResponse = true;
  });
  $socket.send('mailbox.open', $stateParams);

  $scope.fetch = function(){
    $socket.send('mailbox.open', $stateParams);
  }
  $scope.setSeen = function(message){
    message.attrs.flags.push('\\Seen');
  }
  $scope.messageClass = function(flags){
    return {
      'mailbox-seen': flags.indexOf('\\Seen') > -1
    }
  }
  // $rootScope.$on('$stateChangeStart', function(evt,state){
  $transitions.onStart({ }, function(trans) {
    $scope.hasMessageOpened = trans.$to().name=='app.mailbox.message';
  })
})
.controller('ctl.message', function($scope,$stateParams,$rootScope,$socket){
  $scope.message = null;
  $scope.hasMessageResponse = false;

  $rootScope.$on('mailbox.messagedata', function(evt,data){
    $scope.hasMessageResponse = true;
    console.log("MESSAGE DATA", data);
    $scope.message = data.message;
  });
  $socket.send('mailbox.getmessage', $stateParams);

})
.controller('ctl.login', function($scope,$http,accountList,$state,$accountList){
  $scope.accounts = accountList;
  $scope.edit = {mode: false};

  $scope.removeAccount = function($event,account){
    $event.preventDefault();
    $event.stopPropagation();
    $accountList.removeAccount(account);
    $scope.accounts = $accountList.list();
  }
  $scope.authAccount = function(account){
    if($scope.edit.mode){
      console.log("REMOVE ACCOUNT");
      $accountList.removeAccount(account);
      $scope.accounts = $accountList.list();
    }else{
      $http.post('accounts/select', account).then(function(response){
        console.log(response);
        $state.go('app', null, {reload:true});
      });
    }
  }
})
.controller('ctl.add', function($scope,$state,$http,$timeout,$accountList){

  $scope.step = 0;
  $scope.totalSteps = 4;

  $scope.direction = 'step-next';

  $scope.nextStep = function(){
    //$scope.step = $scope.step < $scope.totalSteps ? $scope.step++ : 0;
    console.log("NEXT");
    $scope.direction = 'step-next';
    $timeout(function(){
      $scope.step = $scope.step < $scope.totalSteps ? $scope.step+1 : $scope.totalSteps;
    });
  }
  $scope.prevStep = function(){
    console.log("PREV");
    $scope.direction = 'step-prev';
    $timeout(function(){
      $scope.step = $scope.step > 1 ? $scope.step-1 : 0;
    });
  }

  $scope.params = {
    email:'',
    password:'',

    imap: {
      username:'',
      host:'',
      security: "none",
      defaults: {
        host:'',
        username:'',
        port: 143
      }
    },
    smtp: {
      username:'',
      host:'',
      security: "none",
      defaults: {
        host:'',
        username:'',
        port: 587
      }
    }
  };

  $scope.isConnecting = false;

  $scope.$watch('params.email', function(nv,ov){
    if(nv && nv.length){
      var email_parts = nv.split('@');
      $scope.params.imap.defaults.host = email_parts.length > 1 ? 'imap.'+email_parts[1] : 'imap.example.org';
      $scope.params.smtp.defaults.host = email_parts.length > 1 ? 'smtp.'+email_parts[1] : 'smtp.example.org';

      $scope.params.imap.defaults.username = email_parts[0];
      $scope.params.smtp.defaults.username = email_parts[0];
    }
  });
  $scope.testSmtp = function(){
    $scope.isConnected = false;
    $scope.isConnecting = true;
    $scope.connectError = null;
    $http.post('smtp/test', $scope.params).then(function(response){
      console.log("response", response);
      $scope.isConnecting = false;
      if(response.data.connected){
        //store account
        // $scope.isConnected = true;
        $scope.connectError = null;
        $scope.saveAccount();
      }else{
        $scope.connectError = response.data.error;
      }
    });
  }
  $scope.testImap = function(){
    $scope.isConnected = false;
    $scope.isConnecting = true;
    $scope.connectError = null;
    $http.post('imap/test', $scope.params).then(function(response){
      console.log("response", response);
      $scope.isConnecting = false;
      if(response.data.connected){
        //store account
        // $scope.isConnected = true;
        $scope.connectError = null;
        $scope.nextStep();
      }else{
        $scope.connectError = response.data.error;
      }
    });
  }
  $scope.saveAccount = function(){
    // $scope.status = {
    //   imap:{connecting:true, verified:false},
    //   smtp:{connecting:true, verified:false},
    //   saved:false
    // };
    $scope.nextStep();
    // $scope.saveStage = 1;
    // $http.post('imap/test', $scope.params).then(function(response){
    //   $scope.saveStage = 2;
    //   $http.post('smtp/test', $scope.params).then(function(response){
    //     $scope.saveStage = 3;
        $http.post('accounts/save', $scope.params).then(function(response){
          $scope.saveStage = 4;
          $accountList.addAccount({token:response.data.token, email:$scope.params.email});
          $state.go('app', null, {reload:true});
        });
    //   });
    // });
  }
})
module.exports = 'huzzahApp.controllers';
