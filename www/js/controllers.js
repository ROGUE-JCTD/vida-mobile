angular.module('vida.controllers', ['ngCordova.plugins.camera'])


.controller('AppCtrl', function($rootScope, $scope, $ionicModal, $timeout) {
  console.log('---------------------------------- AppCtrl');

  $rootScope.$on('$stateChangeStart',function(event, toState, toParams, fromState, fromParams){
    console.log('$stateChangeStart to '+toState.to+'- fired when the transition begins. toState,toParams : \n',toState, toParams);
  });

  $rootScope.$on('$stateChangeError',function(event, toState, toParams, fromState, fromParams){
    console.log('$stateChangeError - fired when an error occurs during transition.');
    console.log(arguments);
  });

  $rootScope.$on('$stateChangeSuccess',function(event, toState, toParams, fromState, fromParams){
    console.log('$stateChangeSuccess to '+toState.name+'- fired once the state transition is complete.');
  });

  $rootScope.$on('$viewContentLoaded',function(event){
    console.log('$viewContentLoaded - fired after dom rendered',event);
  });

  $rootScope.$on('$stateNotFound',function(event, unfoundState, fromState, fromParams){
    console.log('$stateNotFound '+unfoundState.to+'  - fired when a state cannot be found by its name.');
    console.log(unfoundState, fromState, fromParams);
  });

  // Create the login modal that we will use later
  $ionicModal.fromTemplateUrl('views/modal-sample.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

  // Triggered in the login modal to close it
  $scope.cancelModal = function() {
    $scope.modal.hide();
  };

  // Open the login modal
  $scope.modal_sample = function() {
    $scope.modal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.okayModal = function() {
    console.log('Doing login', $scope.loginData);
  };
})

.controller('PersonSearchCtrl', function($scope, $location, $http, peopleService, networkService,
                                         $cordovaBarcodeScanner, $cordovaCamera, $document) {
    $scope.searchText = '';
    $scope.searchRequestCounter = 0;
    $scope.totalDisplayed = 20;
    $scope.peopleInShelter = peopleService;

    $scope.scanBarcode = function() {
      $cordovaBarcodeScanner.scan().then(function(barcodeData){
        if (barcodeData.cancelled === false) {
          // Success!
          $scope.searchText = barcodeData.text;
          $scope.searchPerson(barcodeData.text);
          $document.getElementById("searchText").value = barcodeData.text; // Just in case
        }
      }, function(error){
        // Error!
      });
    };

    $scope.searchPerson = function(query) {
      var URL = networkService.getSearchURL() + query;

      $scope.searchRequestCounter++;
      peopleService.getPerson(URL, query,
        function() {
          // Success
          $scope.searchRequestCounter--;
        },
        function() {
          // Error
          // TODO: Show Error
          $scope.searchRequestCounter--;
      });
    };

    $scope.changeWindow = function(url) {
      $location.path(url);
    };

    $scope.takeCameraPhoto_Search = function(source) {
      var options = {
        quality: 90,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: source,
        allowEdit: true,
        encodingType: Camera.EncodingType.JPEG,
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

    $scope.loadMorePeople = function(){
      //$scope.totalDisplayed += 20;
    };

    console.log('---------------------------------- PersonSearchCtrl');
})

.controller('PersonDetailCtrl', function($scope, $location, $http, $stateParams, peopleService, $rootScope){
  console.log('---------------------------------- PersonDetailCtrl');
  peopleService.searchPersonByID($stateParams.personId); // Initiate
  $scope.personService = peopleService;

  $rootScope.buttonPersonEdit = function() {
    console.log('PersonDetailCtrl - buttonPersonEdit()');
  };

  $rootScope.buttonPersonDelete = function() {
    console.log('PersonDetailCtrl - buttonPersonDelete()');
  };
})

.controller('PersonCreateCtrl', function($scope, $location, $http, $cordovaCamera, $cordovaActionSheet,
                                         $cordovaBarcodeScanner, peopleService, uploadService, networkService){
    $scope.person = {};
    $scope.person.barcode = {};

    $scope.savePerson = function() {
      if ($scope.person.given_name !== undefined) {

        var Status = "Made Locally";

        var Gender = undefined;
        if ($scope.person.gender !== undefined) {
          Gender = $scope.person.gender;
        }

        var Photo = undefined;
        if ($scope.person.photo !== undefined) {
          Photo = $scope.person.photo;
        }

        var Barcode = undefined;
        if ($scope.person.barcode.code) {
          Barcode = $scope.person.barcode.code.toString();
        }

        var newPerson = [];
        newPerson.age = $scope.person.age;
        newPerson.barcode = Barcode;
        newPerson.city = $scope.person.city;
        newPerson.description = $scope.person.description;
        newPerson.family_name = $scope.person.family_name;
        newPerson.fathers_given_name = $scope.person.fathers_given_name;
        newPerson.given_name = $scope.person.given_name;
        newPerson.gender = Gender;
        newPerson.mothers_given_name = $scope.person.mothers_given_name;
        newPerson.neighborhood = $scope.person.neighborhood;
        newPerson.notes = '';
        newPerson.pic_filename = 'undefined';
        newPerson.province_or_state = '';
        newPerson.shelter = '';
        newPerson.street_and_number = $scope.person.street_and_number;

        // Not in /api/v1/person/
        newPerson.date_of_birth = $scope.person.date_of_birth;
        newPerson.status = Status;
        newPerson.phone_number = $scope.person.phone_number;
        newPerson.photo = Photo;


        // TODO: Only checks for duplicates based on Name
        var duplicate = false;
        var peopleInShelter = peopleService.getPeopleInShelter();
        for (var i = 0; i < peopleInShelter.length; i++) {
          if (peopleInShelter[i].given_name === newPerson.given_name) {
            duplicate = true;
            break;
          }
        }

        if (!duplicate) {
          if (newPerson.photo) {
            $scope.uploadPhoto(newPerson);
            $scope.uploadPerson(newPerson);
          } else {
            $scope.uploadPerson(newPerson);
          }
        } else {
          alert("Person already exists!");
        }
      } else {
        alert("Please enter at least a name to upload a new person.")
      }
    };

    $scope.scanBarcode = function() {
      $cordovaBarcodeScanner.scan().then(function(barcodeData){
        if (barcodeData.cancelled === false) {
          // Success!
          //$scope.person.barcode.format = barcodeData.format;
          $scope.person.barcode.code = barcodeData.text;
        }
      }, function(error){
        // Error!
      });
    };

    $scope.uploadPhoto = function(newPerson) {
      uploadService.uploadPhotoToUrl(newPerson.photo, networkService.getFileServiceURL(), function (data) {
        // Success
        alert('Photo for ' + newPerson.given_name + ' uploaded!');
        newPerson.pic_filename = data.name;
      }, function () {
        // Error uploading photo
      });
    };

    $scope.uploadPerson = function(newPerson) {
      // Upload person to fileService
      uploadService.uploadPersonToUrl(newPerson, networkService.getAuthenticationURL(), function () {
        // Successful entirely
        alert(newPerson.given_name + ' has been uploaded!\nUpdating local list of people..');

        // Re-get all people in array
        $scope.getPeopleList();
      }, function () {
        // Error uploading person
      });
    };

    $scope.getPeopleList = function() {
      peopleService.updateAllPeople(networkService.getPeopleURL());
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

    $scope.takeCameraPhoto_Personal = function(source) {

      var options = {
        quality: 90,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: source,
        allowEdit: true,
        encodingType: Camera.EncodingType.JPEG,
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

  console.log('---------------------------------- PersonCreateCtrl');
})

.controller('ShelterSearchCtrl', function($scope, $location, $http){
  console.log('---------------------------------- ShelterSearchCtrl');
})

.controller('SettingsCtrl', function($scope, $location, peopleService, networkService){
  console.log('---------------------------------- SettingsCtrl');

    $scope.networkAddr = networkService.getServerAddress();

    // Functions
    $scope.logout = function(url) {
      // TODO: logout

      // Can go directly to /login'
      $location.path(url);
    };

    $scope.saveServerIP = function(IP) {
      networkService.setServerAddress(IP);
    };

    $scope.getPeopleList = function() {
      peopleService.updateAllPeople(networkService.getPeopleURL());
    };
})

.controller('loginCtrl', function($scope, $location, $http, networkService){
  console.log('---------------------------------- loginCtrl');

  $scope.loginRequest = 0;
  $scope.credentials = {};

  $scope.login = function(url) {
    // Request authorization
    if (($scope.credentials.username) && ($scope.credentials.password)) {
      $scope.loginRequest++;
      var authentication = btoa($scope.credentials.username + ":" + $scope.credentials.password);
      var config = {};
      config.headers = {};
      if (authentication !== null){
        config.headers.Authorization = 'Basic ' + authentication;
      } else {
        config.headers.Authorization = '';
      }

      $http.get(networkService.getAuthenticationURL(), config).then(function(xhr) {
        if (xhr.status === 200){
          // Success!
          networkService.setCredentials(authentication);

          // Can go directly to '/tabs' instead of url
          $location.path(url);
        } else {
          alert(xhr.status);
        }
        $scope.loginRequest--;
      }, function(error) {
        if (error) {
          if (error.status === 401) {
            alert("Incorrect Username or Password!");
          } else {
            alert(error.status + ": " + error.description)
          }
        }
        $scope.loginRequest--;

      });
    } else {
      if (!($scope.credentials.username) && !($scope.credentials.password)) {
        alert("Please enter a Username and Password!");
      } else if (!($scope.credentials.username)) {
        alert("Please enter a Username!");
      } else if (!($scope.credentials.password)) {
        alert("Please enter a Password!");
      }
    }
    //$location.path(url); // debug so don't need to login
  };
})

.controller('createCtrl', function($scope, $cordovaBarcodeScanner, uploadService, $location, $http,
                                   $cordovaCamera, $cordovaActionSheet, $ionicModal){

    // Deprecated (see bottom of index.html)
  /*$ionicModal.fromTemplateUrl('Camera_Modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.CameraChooseModal = modal;
    $scope.CameraChooseModal.hide();
  });

   $scope.closeCameraModel = function() {
   $cordovaActionSheet.hide();
   };*/

  $scope.changeWindow = function(url) {
    $location.path(url);
  };
})

.controller('ShelterSearchCtrl', function ($scope, $state) {
    console.log("---- ShelterSearchCtrl");
})

.controller('ShelterDetailCtrl', function ($scope, $state) {
  console.log("---- ShelterDetailCtrl");

});