
global.jQuery = global.$ = require('jquery');
var angular = global.angular = require('angular');

angular.module('huzzahApp.multipart', [])

.service('$multipart', function($q,$http){
  var multipart = {};

  multipart.upload = function(url, params){
    var promise = $q.defer();
    $http({
      method: 'POST',
      url: url,
      headers: {'Content-Type': undefined},
      data: params,
      uploadEventHandlers: {
        progress: function(e){
          if(e.lengthComputable){
            // console.log(e.loaded, e.total);
            promise.notify(parseFloat(((e.loaded/e.total)*100).toFixed(1)));
          }
        }
      },
      transformRequest: function (data, headersGetter) {
        var formData = new FormData();
        angular.forEach(data, function (value, key) {
          if(key=='attachments'){
            value.forEach(function(f,i){ formData.append("attachment_"+i, f); });
          }else if(key=='body'){
            formData.append("body_html", value.html);
            formData.append("body_text", value.text);
          }else if(Array.isArray(value)){
            formData.append(key, value.join(','));
          }else{
            formData.append(key, value);
          }
        });
        return formData;
      }
    }).then(function (data) {
      promise.resolve(data);
      // $state.go('app');
    }, function (data, status) {
      console.log('err0r', data, status);
      promise.reject(data);
    });
    return promise.promise;
  }
  return multipart;
})

module.exports = 'huzzahApp.multipart';
