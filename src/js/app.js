global.jQuery = global.$ = require('jquery');
var angular = global.angular = require('angular');

require('@uirouter/angularjs');
require('bootstrap');
require('ng-tags-input');


angular.module('huzzahApp', [
  'ui.router',
  'ngTagsInput',
  require('angular-animate'),
  require('angular-sanitize'),
  require('angular-ui-bootstrap'),
  require('./lib/localstore.js'),
  require('./lib/states.js'),
  require('./lib/socket.js'),
  require('./lib/multipart.js'),
  require('./lib/directives.js'),
  require('./lib/filters.js'),
  require('./lib/controllers.js')
])
.config(function($animateProvider) {
  $animateProvider.classNameFilter(/angular-animate/);
})
