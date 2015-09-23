angular.module('vida.controllers', ['ngCordova.plugins.camera'])

//TODO: Abstract controllers to separate tabs/functionalities (each tab gets it's own controller?)

.controller('loginCtrl', function($scope, $location, $http){
  $scope.credentials = {};
  $scope.login = function(url) {
    // Request authorization
    // TODO: CHECK BETTER
    if (($scope.credentials.username !== undefined) && ($scope.credentials.password !== undefined)) {
      var authentication = btoa($scope.credentials.username + ":" + $scope.credentials.password);
      var config = {};
      config.headers = {};
      if (authentication != null){
        config.headers['Authorization'] = 'Basic ' + authentication;
      } else {
        config.headers['Authorization'] = '';
      }
      var authenURL = "https://demo.geoshape.org/geoserver/rest/process/batchdownload/arbiterAuthenticatedUserLoginTest";
      $http.get(authenURL, config).then(function(xhr) {
        if (xhr.status === 200){
          // Success!
          // Can go directly to '/tabs' instead of url
          $location.path(url);
        } else if (xhr.status === 401){
          alert("Incorrect Username or Password!");
        } else {
          alert(xhr.status);
        }
      });
    } else {
      alert("Username/Password Undefined");
    }
    $location.path(url);
  };
})

.controller('createCtrl', function($scope, $location, $cordovaCamera){
  $scope.person = {};
  $scope.logout = function(url) {
    // Request logout?

    // Can go directly to /login'
    $location.path(url);
  };

  $scope.savePerson = function() {
    var Name = $scope.person.firstName + " " + $scope.person.middleName + " " + $scope.person.lastName;
    var Address = $scope.person.address;
    var City = $scope.person.city;
    var DoB = $scope.person.date_of_birth;

    // debug
    alert("Saved!\n" +
    "Name: " + Name + "\n" +
    "Address: " + Address + "\n" +
    "City: " + City + "\n" +
    "Date of Birth: " + DoB + "\n");
  };

  $scope.takeCameraPhoto = function() {

    var options = {
        quality: 80,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: Camera.PictureSourceType.CAMERA,
        allowEdit: true,
        encodingType: Camera.EncodingType.JPEG,
        targetWidth: 250,
        targetHeight: 250,
        popoverOptions: CameraPopoverOptions,
        saveToPhotoAlbum: false
    };

    $cordovaCamera.getPicture(options).then(function(imageData) {
        $scope.srcImage = "data:image/jpeg;base64," + imageData;
    }, function(err) {
        // error
        alert("picture not taken: " + err);
    });
  };
})
;