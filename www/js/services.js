// Global Functions
function dataURLtoBlob(dataURI) {
  var binary = atob(dataURI.split(',')[1]);
  var array = [];
  for(var i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
}

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

    var photoBlob = dataURLtoBlob(photo);
    var formData = new FormData();
    formData.append("file", photoBlob, 'filename.jpg');

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

    var JSONPerson = '{' +
      '"age":"' + person.age + '", ' +
      '"barcode":"' + person.barcode + '", ' +
      '"city":"' + person.city + '", ' +
      '"description":"' + person.description + '", ' +
      '"family_name":"' + person.family_name + '", ' +
      '"fathers_given_name":"' + person.fathers_given_name + '", ' +
      '"gender":"' + person.gender + '", ' +
      '"given_name":"' + person.given_name + '", ' +
      '"mothers_given_name":"' + person.mothers_given_name + '", ' +
      '"neighborhood":"' + person.neighborhood + '", ' +
      '"notes":"' + person.notes + '", ' +
      '"pic_filename":"' + person.pic_filename + '", ' +
      '"province_or_state":"' + person.province_or_state + '", ' +
      '"street_and_number":"' + person.street_and_number + '"' + '}';

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