global.jQuery = global.$ = require('jquery');
var angular = global.angular = require('angular');

angular.module('huzzahApp.states', ['ui.router'])
.run(function($transitions,$http,$rootScope){

  $transitions.onBefore({to:['app','app.**','addaccount']}, ($transition$) => {
    console.log("BEFORE APP");
    return $http.get('/session').then(function(res){
      console.log("SESS", res.data.session);
      if (!res.data.session) {
        if($transition$.$to().data.protect){
          return $transition$.router.stateService.target('login', null, {notify:true,reload:true,location:true});
        }
      }else{
        $rootScope.session = res.data.account;
      }
    });
  });
  $transitions.onBefore({to:'login'}, ($transition$) => {
    return $http.get('/session').then(function(res){
      if (res.data.session) {
        console.log("SESS-login", res.data.session);
        $rootScope.session = res.data.account;
        return $transition$.router.stateService.target('app', null, {notify:true,reload:true,location:true});
      }
    });
  });
})
.config(function($stateProvider, $urlRouterProvider) {
  //
  // For any unmatched url, redirect to /state1
  $urlRouterProvider.otherwise("/login");
  //
  // Now set up the states
  $stateProvider
    .state('app', {
      url: "/",
      templateUrl: "partials/app.html",
      data: {protect: true},
      resolve: {
        mailboxes: function($socket,$q,$rootScope){
          var defer = $q.defer();
          $socket.connect().then(function(){
            $rootScope.$on('mailbox.list', function(evt,data){
              defer.resolve(data.mailboxes);
            });
          });
          return defer.promise;
        }
      },
      controller: 'ctl.app'
    })
    .state('app.compose', {
      url: "compose/?thread",
      templateUrl: "partials/app/compose.html",
      controller: 'ctl.compose',
      data: {protect: true}
    })
    .state('app.settings', {
      url: "settings",
      templateUrl: "partials/app/settings.html",
      data: {protect: true}
      // controller: 'ctl.compose'
    })
    .state('app.mailbox', {
      url: "mailbox/:mailbox",
      templateUrl: "partials/app/mailbox.html",
      controller: 'ctl.mailbox',
      data: {protect: true}
    })
    .state('app.mailbox.message', {
      url: "/:message",
      templateUrl: "partials/app/message.html",
      controller: 'ctl.message',
      data: {protect: true}
    })
    .state('addaccount', {
      url: "/add",
      templateUrl: "partials/add-account.html",
      controller: 'ctl.add',
      data: {protect: false}
    })
    .state('login', {
      url: "/login",
      templateUrl: "partials/login.html",
      controller: 'ctl.login',
      resolve: {
        accountList: function($accountList){
          return $accountList.list();
        }
      }
    })

});

module.exports = 'huzzahApp.states';
