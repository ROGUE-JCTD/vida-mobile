angular.module('vida.controllers', ['ngCordova.plugins.camera'])

//TODO: Abstract controllers to separate tabs/functionalities (each tab gets it's own controller?)

.controller('loginCtrl', function($scope, $location, $http){
  $scope.credentials = {};
  $scope.login = function(url) {
    // Request authorization
    // TODO: Check Better (Username or pass is wrong) + Individually check username/password
    if (($scope.credentials.username !== undefined) && ($scope.credentials.password !== undefined)) {
      var authentication = btoa($scope.credentials.username + ":" + $scope.credentials.password);
      var config = {};
      config.headers = {};
      if (authentication !== null){
        config.headers.Authorization = 'Basic ' + authentication;
      } else {
        config.headers.Authorization = '';
      }

      var authenURL = "http://192.168.33.15/api/v1/person/"; // Will need to use dynamic server IP
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
    //$location.path(url);
  };
})

.controller('createCtrl', function($scope, $location, $http, $cordovaCamera){
  // Declarations
  $scope.person = {};
  $scope.peopleInShelter = [];

  // Functions
  $scope.logout = function(url) {
    // Request logout?

    // Can go directly to /login'
    $location.path(url);
  };

  $scope.getPeopleList = function() {

    var authentication = btoa("admin:admin"); //Temporary, will need to use previous credentials
    var config = {};
    config.headers = {};
    if (authentication !== null) {
      config.headers.Authorization = 'Basic ' + authentication;
    } else {
      config.headers.Authorization = '';
    }

    var authenURL = "http://192.168.33.15/api/v1/person/"; // Will need to use dynamic server IP
    $http.get(authenURL, config).then(function(xhr) {
      if (xhr.status === 200) {
        if (xhr.data !== null) {
          for (var i = 0; i < xhr.data.objects.length; i++) {
            var personOnServer = xhr.data.objects[i];

            // Check for duplicates (only names then ID so far)
            var duplicate = false;
            for (var j = 0; j < $scope.peopleInShelter.length; j++) {
              if ($scope.peopleInShelter[j].full_name === personOnServer.given_name){
                if ($scope.peopleInShelter[j].id === personOnServer.id){
                  duplicate = true;
                  break;
                }
              }
            }

            if (!duplicate) {
              personOnServer.full_name = personOnServer.given_name;  //TEMPORARY (just to show name in list)
              personOnServer.status = "On Server";  //TEMPORARY

              $scope.peopleInShelter.push(personOnServer);
            }
          }
        }
      }
    });
  };

  $scope.savePerson = function() {
    //TODO: Overhaul with fields
    var Name = $scope.person.fullName;
    var Address = $scope.person.address;
    var City = $scope.person.city;
    var DoB = $scope.person.date_of_birth;
    var Status = "Made Locally";
    var Photo = null;
    if ($scope.srcImage !== undefined){
        Photo = $scope.srcImage;
    }

    var newPerson = [];
    newPerson.full_name = Name;
    newPerson.status = Status;
    newPerson.photo = Photo;
    newPerson.id = $scope.peopleInShelter.length + 1;

    // Check for local duplicates (only based on names so far)
    var duplicate = false;
    for (var i = 0; i < $scope.peopleInShelter.length; i++) {
        if ($scope.peopleInShelter[i].full_name === Name){
            duplicate = true;
            break;
        }
    }

    if (!duplicate) {
        $scope.peopleInShelter.push(newPerson);

        // debug
        alert("Saved!\n" +
          "Name: " + Name + "\n" +
          "Address: " + Address + "\n" +
          "City: " + City + "\n" +
          "Date of Birth: " + DoB + "\n");
    } else {
        alert("Person already exists!");
    }
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