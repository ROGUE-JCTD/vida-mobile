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

.service('fileUpload', ['$http', function($http) {
  this.uploadPhotoToUrl = function(photo, uploadUrl) {

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
    }).success(function() {
      alert('File uploaded!');
    }).error(function(err) {
      alert('File not uploaded! Error: ' + err.error_message);
    });
  };
}]);