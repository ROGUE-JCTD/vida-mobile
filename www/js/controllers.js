angular.module('vida.controllers', ['ngCordova.plugins.camera'])

//TODO: Abstract controllers to separate tabs/functionalities (each tab gets it's own controller?)

.controller('loginCtrl', function($scope, $location, $http){
  $scope.baseServerURL = '192.168.1.55'; // Can't be set outside of program :(

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

      var authenURL = 'http://' + $scope.baseServerURL + '/api/v1/person/';
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
    $location.path(url); // debug so don't need to login
  };
})

.controller('createCtrl', function($scope, $cordovaBarcodeScanner, uploadService, $location, $http,
                                   $cordovaCamera, $cordovaActionSheet, $ionicModal){
  // Declarations
  $scope.person = {};
  $scope.peopleInShelter = [];
  $scope.searchRequestCounter = 0;

  // Initial Values
  $scope.totalDisplayed = 20;
  $scope.person.gender = "--Choose Gender--";
  $scope.baseServerURL = '192.168.1.55';

  var authenURL = 'http://' + $scope.baseServerURL + '/api/v1/person/';
  var searchURL = 'http://' + $scope.baseServerURL + '/api/v1/person/?custom_query=';
  var serviceURL = 'http://' + $scope.baseServerURL + '/api/v1/fileservice/';

    // Deprecated (see bottom of index.html)
  /*$ionicModal.fromTemplateUrl('Camera_Modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.CameraChooseModal = modal;
    $scope.CameraChooseModal.hide();
  });*/

  // Functions
  $scope.logout = function(url) {
    // TODO: logout

    // Can go directly to /login'
    $location.path(url);
  };

  $scope.scanBarcode = function() {
    $cordovaBarcodeScanner.scan().then(function(barcodeData){
      if (barcodeData.cancelled === false) {
        // Success!
        alert("Barcode Data Retrieved:\nFormat: " + barcodeData.format + "\nCode: " + barcodeData.text);
      } else {
        alert("Barcode scan cancelled!"); // Debug
      }
    }, function(error){
        // Error!
    });
  };

  $scope.searchPerson = function(query) {
    var URL = searchURL + query;

    var authentication = btoa("admin:admin"); //Temporary, will need to use previous credentials
    var config = {};
    config.headers = {};
    if (authentication !== null) {
      config.headers.Authorization = 'Basic ' + authentication;
    } else {
      config.headers.Authorization = '';
    }

    $scope.searchRequestCounter++; //TODO: Take care of Errors in case SRC doesn't get decremented
    $http.get(URL, config).then(function(xhr) {
      if (xhr.status === 200) {
        if (xhr.data !== null) {
          console.log(xhr.data);
          $scope.peopleInShelter = [];    // Reset list, is safe
          $scope.searchRequestCounter--;

          // Temporary (search with '' returns all objects (since all contain ''))
          if (query === '') {
            //$scope.peopleInShelter = []; // already done
          } else {
            for (var i = 0; i < xhr.data.objects.length; i++) {
              var personOnServer = xhr.data.objects[i];
              var newPerson = {};

              newPerson.given_name = personOnServer.given_name;
              newPerson.status = 'On Server';
              newPerson.id = personOnServer.id;

              $scope.peopleInShelter.push(xhr.data.objects[i]);
            }
          }
        }
      }
    });
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

    $http.get(authenURL, config).then(function(xhr) {
      if (xhr.status === 200) {
        if (xhr.data !== null) {
          for (var i = 0; i < xhr.data.objects.length; i++) {
            var personOnServer = xhr.data.objects[i];

            // Check for duplicates (only names - then ID so far)
            var duplicate = false;
            for (var j = 0; j < $scope.peopleInShelter.length; j++) {
              if ($scope.peopleInShelter[j].given_name === personOnServer.given_name){
                if ($scope.peopleInShelter[j].id === personOnServer.id){
                  duplicate = true;
                  break;
                }
              }
            }

            if (!duplicate) {
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
    var Name = $scope.person.given_name;
    var Address = $scope.person.address;
    var City = $scope.person.city;
    var DoB = $scope.person.date_of_birth;
    var Status = "Made Locally";

    var Gender = $scope.person.gender;
    if (Gender === "--Choose Gender--") {
      Gender = undefined;
    }

    var phoneNumber = $scope.person.phone_number;

    var Photo = null;
    if ($scope.person.photo !== undefined){
        Photo = $scope.person.photo;
    }

    // TODO: TAKE CARE OF UNDEFINED
    var newPerson = [];
    newPerson.given_name = Name;
    newPerson.address = Address;
    newPerson.gender = Gender;
    newPerson.city = City;
    newPerson.date_of_birth = DoB;
    newPerson.status = Status;
    newPerson.photo = Photo;
    newPerson.pic_filename = 'undefined';
    newPerson.id = $scope.peopleInShelter.length + 1;

    // TODO: Only checks for duplicates based on Name
    var duplicate = false;
    for (var i = 0; i < $scope.peopleInShelter.length; i++) {
        if ($scope.peopleInShelter[i].given_name === Name){
            duplicate = true;
            break;
        }
    }

    if (!duplicate) {

        //TODO: Reformat? (Person/Photo seperate - if Photo gets uploaded then have promise to set it later?)
        // Upload person to fileService
        uploadService.uploadPhotoToUrl(newPerson.photo, serviceURL, function(data) {
          // Success
          alert('Photo for ' + Name + ' uploaded!');
          newPerson.pic_filename = data.name;

            uploadService.uploadPersonToUrl(newPerson, authenURL, function() {
              // Successful entirely
              alert(Name + ' has been uploaded!\nUpdating local list of people..');

              // Re-get all people in array
              $scope.peopleInShelter = []; // Assign to a new empty array
              $scope.getPeopleList();

            }, function() {
                // Error uploading person
            });
        }, function() {
          // Error uploading photo
        });

    } else {
        alert("Person already exists!");
    }
  };

  $scope.showCameraModal = function() {
    var options = {
      title: 'Picture',
      buttonLabels: ['Take Photo', 'Choose From Library'],
      addCancelButtonWithLabel: 'Cancel',
      androidEnableCancelButton : true,
      winphoneEnableCancelButton : true
    };

    $cordovaActionSheet.show(options)
      .then(function(btnIndex) {
        $scope.takeCameraPhoto_Personal(btnIndex);
      });
  };

  $scope.closeCameraModel = function() {
    $cordovaActionSheet.hide();
  };

    // TODO: Find way to not copy paste functions (Search Camera/Personal Info Camera)
  $scope.takeCameraPhoto_Search = function(source) {
    var options = {
      quality: 80,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: source,
      allowEdit: true,
      encodingType: Camera.EncodingType.JPEG,
      targetWidth: 250,
      targetHeight: 250,
      popoverOptions: CameraPopoverOptions,
      saveToPhotoAlbum: false
    };

    $cordovaCamera.getPicture(options).then(function(imageData) {
      var webViewImg = "data:image/jpeg;base64," + imageData;
      alert("Picture Received: " + imageData);
    }, function(err) {
      // error
      alert("Picture not taken: " + err);
    });
  };

  $scope.takeCameraPhoto_Personal = function(source) {

    $scope.closeCameraModel();

    var options = {
        quality: 80,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: source,
        allowEdit: true,
        encodingType: Camera.EncodingType.JPEG,
        targetWidth: 250,
        targetHeight: 250,
        popoverOptions: CameraPopoverOptions,
        saveToPhotoAlbum: false
    };

    $cordovaCamera.getPicture(options).then(function(imageData) {
        $scope.srcImage = "data:image/jpeg;base64," + imageData;
        $scope.person.photo = "data:image/jpeg;base64," + imageData; // If there is a reason to separate it, the choice is there
    }, function(err) {
        // error
        alert("picture not taken: " + err);
    });
  };

  $scope.loadMorePeople = function(){
      $scope.totalDisplayed += 20;
  };

    // Probably not needed :(
  $scope.filterValues = function($event){
    var whichKey = $event.which;

    // 13 is 'return', 40 is '(', 41 is ')', 45 is '-'
    //    if this list gets any bigger, make array and iterate through for readability

    if( (isNaN(String.fromCharCode($event.keyCode))) ){
      if ((whichKey == 13 ||
           whichKey == 40 ||
           whichKey == 41 ||
           whichKey == 45)) {
        // don't remove key
      } else {
        // remove key
        $event.preventDefault();
      }
    }
  };

  $scope.saveServerIP = function(IP) {
    $scope.baseServerURL = IP;

    authenURL = 'http://' + IP + '/api/v1/person/';
    searchURL = 'http://' + IP + '/api/v1/person/?custom_query=';
    serviceURL = 'http://' + IP + '/api/v1/fileservice/';
  }
})
;