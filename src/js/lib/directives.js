global.jQuery = global.$ = require('jquery');
var angular = global.angular = require('angular');

var moment = require('moment');
var Quill = require('quill');
var gravatar = require('gravatar');


angular.module('huzzahApp.directives', [])
.directive('attachFile', function(){
  return {
    scope: {
      ngModel:'='
    },
    require:'ngModel',
    link: function(scope,ele,attr,ngModelCtl){
      var file_input = document.createElement('input');
      file_input.type = "file";
      $(file_input).on('change',function(e){
        var files = this.files;
        Array.from(files).forEach(function(f,idx){
          // f._file = files[idx];
          // console.log(f);
          scope.ngModel.push(f);
          scope.$apply();
        });
      });
      $(ele).on('click',function(e){
        $(file_input).trigger('click');
      });
    }
  }
})
.directive('gravatar', function($sce){
  return {
    scope: {
      email:'='
    },
    replace: true,
    template: '<span><img ng-src="{{url}}" height="20" /></span>',
    link: function(scope,ele,attr){
      scope.url = gravatar.url(scope.email);
      console.log(scope.url);
      //return $sce.trustAsResourceUrl(url);
    }
  }
})
.directive('quill',function(){
  return {
    require:'ngModel',
    link: function(scope,ele,attr,ngModelCtl){
      var editor = new Quill(ele[0], {theme: 'snow'});
      editor.on('text-change', function(delta, oldDelta, source) {
        // console.log("delta: ", delta);
        // console.log("oldDelta: ", oldDelta);
        // console.log("source: ", source);
        // var contents = quill.getText();
        ngModelCtl.$setViewValue({html:editor.root.innerHTML, text:editor.getText()});
        ngModelCtl.$render();
        // console.log("contents: ", editor.root.innerHTML);
      });
    }
  }
})
.directive('htmlEmail',function($timeout){
  return {
    scope: {
      htmlEmail:'='
    },
    template:'<iframe seamless class="html-render-frame"></iframe>',
    link: function(scope,ele,attr){
      // var iframe = document.createElement('iframe');
      scope.$watch('htmlEmail',function(nv,ov){
        if(nv){
          console.log(nv);
          write_frame(nv.html ? nv.html : nv.textAsHtml);
        }
      });
      function write_frame(contents){
        $iframe = $(ele).find('.html-render-frame');
        var contentWindow = $iframe.get(0).contentWindow;
        var doc = contentWindow.document;
        // var $mock = $(scope.htmlEmail);
        doc.open();
        doc.write(contents);
        doc.close();
        $(doc).find("head").prepend($("<link rel=\"stylesheet\" type=\"text/css\" href=\"/dist/message.css\" \/>"));
        $(doc).find("head").prepend("<base target=\"_blank\" \/>");
        // $(doc).find('a').on('click', function(e){
        //   e.preventDefault();
        //   window.open($(this).attr('href'), "_blank");
        //   // console.log($(this).attr('href'));
        // })
        $(contentWindow).on('load',function(){
          console.log('ready', $(doc.body).css('margin'));
          var oh = $(doc).find('body').outerHeight(true);
          // console.log('height', $(doc).find('body'), $(doc).find('body').get(0).scrollHeight);
          $iframe.css('height', oh+'px');
        });
      }
    }
  }
})

module.exports = 'huzzahApp.directives';
