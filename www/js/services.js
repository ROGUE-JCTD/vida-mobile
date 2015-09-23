angular.module('vida.services', [])

// Factories
.factory('myFactory', function(){
    // Factory stuff goes here
})

.factory('Camera', ['$q', function($q){
  return {
    getPicture: function(options) {
      var q = $q.defer();
      navigator.camera.getPicture(function(result) {
        q.resolve(result);
      }, function(err) {
        q.reject(err);
      }, options);
      return q.promise;
    }
  }
}])

// Services
.service('myService', function(){
    // Service stuff goes here
});