// Global Functions
function dataURItoBlob(dataURI) {
    var binary = atob(dataURI.split(',')[1]);
    var array = [];
    for(var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
}

var canvas = document.createElement('canvas');

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
  };
}])

// Services
.service('myService', function(){
    // Service stuff goes here
})

.service('uploadService', ['$http', function($http) {
  this.uploadPhotoToUrl = function(photo, uploadUrl, callSuccess, callFailure) {

    var dataURL = canvas.toDataURL('image/jpeg', 0.5);
    var photoData = dataURItoBlob(dataURL);
    var formData = new FormData(photo);
    formData.append('file', photoData);

    $http.post(uploadUrl, formData, {
      transformRequest: angular.identity,
      headers: {
        'Content-Type': undefined,
        'Authorization': 'Basic ' + btoa('admin:admin')
      }
    }).success(function(data) {
      callSuccess(data);
    }).error(function(err) {
      // can be moved to callFailure(err)
      // if err is null, server not found?
      alert('Photo not uploaded! Error: ' + err.error_message);
      callFailure();
    });
  };

  this.uploadPersonToUrl = function(person, uploadUrl, callSuccess, callFailure) {

    var JSONPerson = '{' + '"given_name":"' + person.given_name + '"}';

    $http.post(uploadUrl, JSONPerson, {
      transformRequest: angular.identity,
      headers: {
        'Authorization': 'Basic ' + btoa('admin:admin')
      }
    }).success(function() {
      callSuccess();
    }).error(function(err) {
      // can be moved to callFailure(err)
      alert('Person not uploaded! Error: ' + err.error_message);
      callFailure();
    });
  };
}]);