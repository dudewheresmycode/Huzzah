var angular = global.angular = require('angular');

angular.module('huzzahApp.localstore', [
  require('angular-local-storage')
])

.config(function (localStorageServiceProvider) {
  localStorageServiceProvider.setPrefix('huzzah');
})
.service('$accountList', function(localStorageService,$q){

  var accounts = {
    cache: [],
    list: function(){
      // var def = $q.defer();
      var list = [];
      var raw = localStorageService.get("account.list");
      if(raw){
        try {
          list = JSON.parse(raw);
        }catch(e){
          console.warn(e);
        }
      }
      accounts.cache = list;
      return list;
      // return def.promise;
    },
    removeAccount: function(account){
      var idx = accounts.cache.findIndex(function(it){ return angular.equals(it,account); });
      if(idx > -1){
        accounts.cache.splice(idx,1);
      }
      return localStorageService.set("account.list", JSON.stringify(accounts.cache));
    },
    addAccount: function(account){
      if(typeof accounts.cache=='undefined'){ accounts.cache = accounts.list(); }
      // if(typeof accounts.cache!='array'){ accounts.cache = []; }
      accounts.cache.push(account);
      return localStorageService.set("account.list", JSON.stringify(accounts.cache));
    }
  };

  return accounts;
})
module.exports = 'huzzahApp.localstore';
