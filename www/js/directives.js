angular.module('vida.directives', [])
  .directive('hideKeyboardOnEnter', function ($window) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        if ($window.cordova && $window.cordova.plugins.Keyboard) {
          element.bind('keyup', function (key) {
            if (key.keyCode === 13) {
              $window.cordova.plugins.Keyboard.close();
              element[0].blur();
            }
          });
        }
      }
    };
  })

.directive('errSrc', function() {
  return {
    link: function(scope, element, attrs) {
      element.bind('error', function() {
        if (attrs.src != attrs.errSrc) {
          attrs.$set('src', attrs.errSrc);
        }
      });
    }
  }
});