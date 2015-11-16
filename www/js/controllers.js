angular.module('vida.controllers', ['ngCordova.plugins.camera', 'pascalprecht.translate'])


.controller('AppCtrl', function($rootScope, $scope, $ionicModal, $timeout, shelterService, $translate) {
  console.log('---------------------------------- AppCtrl');
  $translate.instant("title_search");
  console.log('---------------------------------- translate: ', $translate.instant("title_search"));



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

  $rootScope.center = {
    lat: 0,
    lng: 0,
    zoom: 0
  };

  // initialize once. we will only work with this created object from now on
  $rootScope.markers = {};
})

.controller('PersonSearchCtrl', function($scope, $location, $http, peopleService, networkService,
                                         $cordovaToast, $cordovaBarcodeScanner, $cordovaCamera) {
    $scope.searchText = '';
    $scope.searchRequestCounter = 0;
    $scope.totalDisplayed = 20;
    $scope.peopleService = peopleService;
    $scope.networkService = networkService;

    $scope.scanBarcode = function() {
      $cordovaBarcodeScanner.scan().then(function(barcodeData){
        if (barcodeData.cancelled === false) {
          // Success!
          $scope.searchText = barcodeData.text;
          $scope.searchPerson(barcodeData.text);
          document.getElementById("searchText").value = barcodeData.text; // Just in case
        }
      }, function(error){
        // Error!
      });
    };

    $scope.searchPerson = function(query) {
      var URL = networkService.getSearchURL() + query;
      peopleService.setStoredSearchQuery(query);

      $scope.searchRequestCounter++;
      peopleService.getPerson(URL, query,
        function() {
          // Success
          $scope.searchRequestCounter--;
        },
        function(error) {
          // Error
          if (error){
            alert(error);
          } else {
            $cordovaToast.showShortBottom("Error: Network timed out. Please check your internet connection.");
          }
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
        alert("Picture Received Successfully");
      }, function(err) {
        // error
      });

      //peopleService.downloadPhotos(); //testing
    };

    $scope.loadMorePeople = function(){
      //$scope.totalDisplayed += 20;
    };

    console.log('---------------------------------- PersonSearchCtrl');
})

.controller('PersonDetailCtrl', function($scope, $location, $http, $stateParams, $state, $filter,
                                         $cordovaActionSheet, peopleService, networkService, $rootScope){
  console.log('---------------------------------- PersonDetailCtrl');
  $scope.searchPersonRequest = 0;
  $scope.peopleService = peopleService;
  $scope.networkService = networkService;
  $scope.personPhoto = null;

  $scope.setupEditDeleteButtons = function() {
    // Setup tab-specific buttons
    var tabs = document.getElementsByClassName("tab-item");
    for (var i=0; i < tabs.length; i++) {
      tabs[i].setAttribute('style', 'display: none;');
    }

    var editDeleteButtons = document.getElementsByClassName("button-person-edit");
    var saveCancelButtons = document.getElementsByClassName("button-person-post-edit");
    for (i=0; i < editDeleteButtons.length; i++) {
      editDeleteButtons[i].setAttribute('style', 'display: block;');    // Enables buttons
    }

    $scope.$on("$destroy", function(){
      for (var i=0; i < tabs.length; i++) {
        tabs[i].setAttribute('style', 'display: block;');
      }

      for (i=0; i < editDeleteButtons.length; i++) {
        editDeleteButtons[i].setAttribute('style', 'display: none;');   // Removes buttons
      }

      for (i=0; i < saveCancelButtons.length; i++) {
        saveCancelButtons[i].setAttribute('style', 'display: none;');   // Removes buttons
      }
    });
  };

  // Initial Commands
  $scope.setupEditDeleteButtons();

  peopleService.searchPersonByID($stateParams.personId, // Will initiate search
    function() {
      // Success
      $scope.searchPersonRequest--;
    }, function(error){
      // Error
      $scope.searchPersonRequest--;
    });
  $scope.searchPersonRequest++;

  // Functions
  $rootScope.buttonPersonEdit = function() {
    console.log('PersonDetailCtrl - buttonPersonEdit()');

    $state.go('vida.person-search.person-detail.person-edit');
  };

  $rootScope.buttonPersonDelete = function() {
    console.log('PersonDetailCtrl - buttonPersonDelete()');

    if (confirm($filter('translate')('dialog_confirm_delete'))) {
      // TODO: Delete from Server

      window.history.back();
    }
  };
})

.controller('PersonDetailEditCtrl', function($scope, $state, $rootScope, $stateParams, $http, peopleService,
                                             networkService, $filter, $cordovaActionSheet, $cordovaCamera, optionService) {
  console.log('---------------------------------- PersonDetailEditCtrl');

  $scope.peopleService = peopleService;
  $scope.isEditing = true;
  $scope.createTabTitle = 'title_edit';
  $scope.pictureTestSpinner = 0;
  $scope.saveChangesRequest = 0;
  $scope.hasPlaceholderImage = false;

  $scope.gender_options = optionService.getGenderOptions();
  $scope.injury_options = optionService.getInjuryOptions();
  $scope.nationality_options = optionService.getNationalityOptions();

  var checkFields = ['given_name', 'family_name', 'fathers_given_name', 'mothers_given_name', 'age',
    'date_of_birth', 'street_and_number', 'city', 'neighborhood', 'description', 'phone_number', 'barcode'];

  $scope.setupFields = function() {
    var person = peopleService.getRetrievedPersonByID();

    var checkForError = function(value) {
      return value && (value !== 'undefined' && value !== 'null');
    };

    for (var i = 0; i < checkFields.length; i++) {
      if (checkForError(person[checkFields[i]]))
        document.getElementById(checkFields[i]).value = person[checkFields[i]];
    }

    if (checkForError(person.pic_filename)) {
      // Test Image
      var URL = networkService.getFileServiceURL() + person.pic_filename + '/download/';
      $scope.pictureTestSpinner++;

      $http.get(URL, networkService.getAuthentication()).then(function(xhr) {
        if (xhr.status === 200) {
          if (xhr.data.status !== "file not found") {
            document.getElementById('personal_photo').src = URL;
            $scope.hasPlaceholderImage = false;
          }
          else {
            document.getElementById('personal_photo').src = peopleService.getPlaceholderImage();
            $scope.hasPlaceholderImage = true;
          }
        }
        $scope.pictureTestSpinner--;
      }, function(error) {
        // Error
        console.log(error);
        $scope.pictureTestSpinner--;
      });
    }
    else {
      document.getElementById('personal_photo').src = peopleService.getPlaceholderImage();
      $scope.hasPlaceholderImage = true;
    }

    var setupDropdown = function(dropType) {
      if (checkForError(person[dropType])) {
        var hasError = true;
        for (var i = 0; i < $scope[dropType + '_options'].length; i++) {
          if (person[dropType] === $scope[dropType + '_options'][i].value) {
            $scope['current_' + dropType] = $scope[dropType + '_options'][i];
            hasError = false;
            break;
          }
        }

        // Edge case
        if (hasError) {
          $scope['current_' + dropType] = $scope[dropType + '_options'][0];
        }
      }
      else {
        $scope['current_' + dropType] = $scope[dropType + '_options'][0];
      }
    };

    setupDropdown('gender');
    setupDropdown('injury');
    setupDropdown('nationality');
  };

  if (peopleService.getRetrievedPersonByID()) {
    peopleService.searchPersonByID($stateParams.personId, // Will initiate search
      function () {
        // Success
        $scope.searchPersonRequest--;
        $scope.setupFields();
      }, function (error) {
        // Error
        $scope.searchPersonRequest--;
      });
    $scope.searchPersonRequest++;
  } else {
    $scope.setupFields();
  }

  $scope.changeGender = function() {
    $scope.current_gender = this.current_gender;
  };

  $scope.changeInjury = function() {
    $scope.current_injury = this.current_injury;
  };

  $scope.changeNationality = function() {
    $scope.current_nationality = this.current_nationality;
  };

  $scope.setupSaveCancelButtons = function() {
    // Setup tab-specific buttons
    var tabs = document.getElementsByClassName("tab-item");
    for (var i=0; i < tabs.length; i++) {
      tabs[i].setAttribute('style', 'display: none;');
    }

    var editDeleteButtons = document.getElementsByClassName("button-person-edit");
    var saveCancelButtons = document.getElementsByClassName("button-person-post-edit");
    for (i=0; i < saveCancelButtons.length; i++) {
      saveCancelButtons[i].setAttribute('style', 'display: block;');  // Enables buttons
    }

    $scope.$on("$destroy", function(){
      for (var i=0; i < tabs.length; i++) {
        tabs[i].setAttribute('style', 'display: none;');
      }

      for (i=0; i < saveCancelButtons.length; i++) {
        saveCancelButtons[i].setAttribute('style', 'display: none;');   // Removes buttons
      }

      for (i=0; i < editDeleteButtons.length; i++) {
        editDeleteButtons[i].setAttribute('style', 'display: block;');   // Removes buttons
      }
    });
  };

  $scope.setupDocumentValues = function(doc) {
    for (var i = 0; i < checkFields.length; i++){
      doc[checkFields[i]] = document.getElementById(checkFields[i]).value;
    }

    var genderElement       = document.getElementById('gender');
    doc.gender              = genderElement.options[genderElement.selectedIndex].label;
    var injuryElement       = document.getElementById('injury');
    doc.injury              = injuryElement.options[injuryElement.selectedIndex].label;
    var nationalityElement  = document.getElementById('nationality');
    doc.nationality         = nationalityElement.options[nationalityElement.selectedIndex].label;
    doc.photo               = document.getElementById('personal_photo').src;
  };

  $rootScope.buttonPersonSave = function() {
    var person = peopleService.getRetrievedPersonByID();

    var documentValues = {}; // Used to only retrieve once
    $scope.setupDocumentValues(documentValues);

    var changedPerson = {};

    for (var i = 0; i < checkFields.length; i++) {
      changedPerson[checkFields[i]] = ((person[checkFields[i]] !== documentValues[checkFields[i]]) && (documentValues[checkFields[i]] !== "")) ? documentValues[checkFields[i]] : undefined;
    }
    // specific cases
    changedPerson.date_of_birth = ((person.date_of_birth !== documentValues.date_of_birth) && (documentValues.date_of_birth !== "")) ? documentValues.date_of_birth : undefined;
    changedPerson.phone_number = ((person.phone_number !== documentValues.phone_number) && (documentValues.phone_number !== "")) ? documentValues.phone_number : undefined;
    changedPerson.gender = (person.gender !== documentValues.gender) ? documentValues.gender : undefined;
    changedPerson.injury = (person.injury !== documentValues.injury) ? documentValues.injury : undefined;
    changedPerson.nationality = (person.nationality !== documentValues.nationality) ? documentValues.nationality : undefined;

    changedPerson.photo = ((networkService.getFileServiceURL() + person.pic_filename + '/download/') !== documentValues.photo) ? documentValues.photo : undefined;
    changedPerson.id = person.id;

    $scope.saveChangesRequest++;
    peopleService.editPerson_saveChanges(changedPerson, function(success) {
      // Success
      $scope.saveChangesRequest--;
      peopleService.searchPersonByID(peopleService.getRetrievedPersonByID().id, function() {  // This will reload the person in details
        var prevSearchQuery = peopleService.getStoredSearchQuery();
        peopleService.getPerson(networkService.getSearchURL() + prevSearchQuery, prevSearchQuery, function() {}, function() {}); // This will reload search query
        $state.go('vida.person-search.person-detail');
      }, function() {

      });
    }, function(error) {
      // Error
      //TODO: SHOW ERROR
      $scope.saveChangesRequest--;
      $state.go('vida.person-search.person-detail');
    });
  };

  $rootScope.buttonPersonCancel = function() {
    console.log('PersonDetailCtrl - buttonPersonCancel()');

    if (confirm($filter('translate')('dialog_confirm_cancel'))) {
      window.history.back();
    }
  };

  $scope.showCameraModal = function() {
    var prevPicture = false;
    var options = {
      title: $filter('translate')('title_picture_dialog'),
      buttonLabels: [$filter('translate')('modal_picture_take_picture'), $filter('translate')('modal_picture_choose_from_library')],
      addCancelButtonWithLabel: $filter('translate')('modal_cancel'),
      androidEnableCancelButton : true,
      winphoneEnableCancelButton : true
    };

    if ($scope.hasPlaceholderImage) {
      options.buttonLabels = [$filter('translate')('modal_picture_take_picture'),
        $filter('translate')('modal_picture_choose_from_library'),
        $filter('translate')('modal_picture_remove_picture')];
      prevPicture = true;
    }

    $cordovaActionSheet.show(options)
      .then(function(btnIndex) {
        if (prevPicture) {
          if (btnIndex != 3) {
            $scope.takeCameraPhoto_Personal(btnIndex);
          } else {
            document.getElementById('personal_photo').src = peopleService.getPlaceholderImage();
            $scope.hasPlaceholderImage = true;
          }
        } else {
          $scope.takeCameraPhoto_Personal(btnIndex);
        }
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
      document.getElementById('personal_photo').src = "data:image/jpeg;base64," + imageData;
      $scope.hasPlaceholderImage = false;
    }, function(err) {
      // error
    });
  };

  // Startup
  $scope.setupSaveCancelButtons();
})

.controller('PersonCreateCtrl', function($scope, $location, $http, $cordovaCamera, $cordovaActionSheet, $filter, $ionicModal,
                                         $cordovaToast, $cordovaBarcodeScanner, peopleService, uploadService, networkService,
                                          optionService){
    $scope.person = {};
    $scope.person.photo = undefined;
    $scope.person.barcode = {};
    $scope.peopleService = peopleService;
    $scope.isEditing = false;
    $scope.createTabTitle = 'title_create';
    $scope.saveChangesRequest = 0;

    $scope.gender_options = optionService.getGenderOptions();
    $scope.injury_options = optionService.getInjuryOptions();
    $scope.nationality_options = optionService.getNationalityOptions();

    $scope.current_gender = $scope.gender_options[0];
    $scope.current_injury = $scope.injury_options[0];
    $scope.current_nationality = $scope.nationality_options[0];

    // Helper function
    var fixUndefined = function(str){
      return str === undefined ? "" : str;
    };

    $scope.savePerson = function() {
      if ($scope.person.given_name !== undefined) {

        var Status = "Made Locally";

        var Gender = undefined;
        if ($scope.current_gender !== undefined) {
          Gender = $scope.current_gender.value;
        }

        var Injury = undefined;
        if ($scope.current_injury !== undefined) {
          Injury = $scope.current_injury.value;
        }

        var Nationality = undefined;
        if ($scope.current_nationality !== undefined) {
          Nationality = $scope.current_nationality.value;
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
        newPerson.age                 = fixUndefined($scope.person.age);
        newPerson.barcode             = fixUndefined(Barcode);
        newPerson.city                = fixUndefined($scope.person.city);
        newPerson.description         = fixUndefined($scope.person.description);
        newPerson.family_name         = fixUndefined($scope.person.family_name);
        newPerson.fathers_given_name  = fixUndefined($scope.person.fathers_given_name);
        newPerson.given_name          = fixUndefined($scope.person.given_name);
        newPerson.gender              = Gender; // will always be defined
        newPerson.mothers_given_name  = fixUndefined($scope.person.mothers_given_name);
        newPerson.neighborhood        = fixUndefined($scope.person.neighborhood);
        newPerson.notes               = fixUndefined('');
        newPerson.pic_filename        = '';     // will be set on upload
        newPerson.province_or_state   = fixUndefined('');
        newPerson.shelter             = fixUndefined('');
        newPerson.street_and_number   = fixUndefined($scope.person.street_and_number);

        // TODO: Not in /api/v1/person/, put these fields in
        newPerson.date_of_birth       = fixUndefined($scope.person.date_of_birth);
        newPerson.status              = fixUndefined(Status);
        newPerson.phone_number        = fixUndefined($scope.person.phone_number);
        newPerson.injury              = Injury; // will always be defined
        newPerson.nationality         = Nationality; // will always be defined
        newPerson.photo               = Photo;  // photo being undefined is checked


        // TODO: Only checks for duplicates based on Name, change based on unique ID, multiple fields, or ID number?
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
            $scope.uploadPhoto(newPerson, function(){
              // On successful upload of Photo, this assigns the photo to the person successfully
              $scope.uploadPerson(newPerson);
            });
          } else {
            $scope.uploadPerson(newPerson);
          }
        } else {
          $cordovaToast.showShortBottom($filter('translate')('dialog_person_exists'));
        }
      } else {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_person_no_name'))
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

    $scope.uploadPhoto = function(newPerson, success) {
      uploadService.uploadPhotoToUrl(newPerson.photo, networkService.getFileServiceURL(), function (data) {
        // Success
        $cordovaToast.showShortBottom($filter('translate')('dialog_photo_uploaded') + newPerson.given_name + '!');
        newPerson.pic_filename = data.name;
        success();
      }, function () {
        // Error uploading photo
      });
    };

    $scope.uploadPerson = function(newPerson) {
      // Upload person to fileService
      uploadService.uploadPersonToUrl(newPerson, networkService.getAuthenticationURL(), function () {
        // Successful entirely
        $cordovaToast.showShortBottom(newPerson.given_name + $filter('translate')('dialog_person_uploaded'));

        // Re-get all people in array
        $cordovaToast.showShortBottom($filter('translate')('dialog_retrieving_list'));
        $scope.getPeopleList(function() {
          // On success
          $cordovaToast.showShortBottom($filter('translate')('dialog_retrieving_list_complete'));
        });
      }, function () {
        // Error uploading person
      });
    };

    $scope.getPeopleList = function(success) {
      peopleService.updateAllPeople(networkService.getPeopleURL(), success);
    };

    $scope.showCameraModal = function() {
      var prevPicture = false;
      var options = {
        title: $filter('translate')('title_picture_dialog'),
        buttonLabels: [$filter('translate')('modal_picture_take_picture'), $filter('translate')('modal_picture_choose_from_library')],
        addCancelButtonWithLabel: $filter('translate')('modal_cancel'),
        androidEnableCancelButton : true,
        winphoneEnableCancelButton : true
      };

      if ($scope.person.photo) {
        options.buttonLabels = [$filter('translate')('modal_picture_take_picture'),
          $filter('translate')('modal_picture_choose_from_library'),
          $filter('translate')('modal_picture_remove_picture')];
        prevPicture = true;
      }

      $cordovaActionSheet.show(options)
        .then(function(btnIndex) {
          if (prevPicture) {
            if (btnIndex != 3) {
              $scope.takeCameraPhoto_Personal(btnIndex);
            } else {
              $scope.person.photo = undefined;
            }
          } else {
            $scope.takeCameraPhoto_Personal(btnIndex);
          }
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
        $scope.person.photo = "data:image/jpeg;base64," + imageData; // If there is a reason to separate it, the choice is there
      }, function(err) {
        // error
      });
    };

    $scope.changeGender = function() {
      $scope.current_gender = this.current_gender;
    };

    $scope.changeInjury = function() {
      $scope.current_injury = this.current_injury;
    };

    $scope.changeNationality = function() {
      $scope.current_nationality = this.current_nationality;
    };

  console.log('---------------------------------- PersonCreateCtrl');
})

.controller('ShelterSearchCtrl', function($scope, $location, $http){
  console.log('---------------------------------- ShelterSearchCtrl');
})

.controller('SettingsCtrl', function($scope, $location, peopleService, optionService,
                                     networkService, $translate){
  console.log('---------------------------------- SettingsCtrl');

    $scope.networkAddr = networkService.getServerAddress();

    // Functions
    $scope.logout = function(url) {
      // TODO: logout

      // Can go directly to '/login'
      $location.path(url);
    };

    $scope.saveServerIP = function(IP) {
      networkService.setServerAddress(IP);
    };

    $scope.language_options = optionService.getLanguageOptions();

    $scope.current_language = $scope.language_options[0];

    $scope.switchLanguage = function() {
      if (this.current_language.value === "English")
        $translate.use('en');
      else if (this.current_language.value === "Spanish")
        $translate.use('es');
      else
        $translate.use('en');
    };
})

.controller('loginCtrl', function($scope, $location, $http, networkService, $filter, $cordovaToast){
  console.log('---------------------------------- loginCtrl');

  $scope.loginRequest = 0;
  $scope.credentials = {};

  $scope.login = function(url) {
    // Request authorization
    if (($scope.credentials.username) && ($scope.credentials.password)) {
      $scope.loginRequest++;

      networkService.doLogin($scope.credentials,
      function() {
        // Success!
        $location.path(url);

        $scope.loginRequest--;
      },
      function(error) {
        // Error!

        $scope.loginRequest--;
      });

    } else {
      if (!($scope.credentials.username) && !($scope.credentials.password)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_username_password'));
      } else if (!($scope.credentials.username)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_username'));
      } else if (!($scope.credentials.password)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_password'));
      }
    }
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

.controller('ShelterSearchCtrl', function ($rootScope, $scope, $state, shelterService) {
  console.log("---- ShelterSearchCtrl");
  shelterService.getAll().then(function(shelters) {
    // clear the markers object without recreating it
    for (var variableKey in $rootScope.markers){
      if ($rootScope.markers.hasOwnProperty(variableKey)){
        delete $rootScope.markers[variableKey];
      }
    }

    console.log("---- got all shelters: ", shelters);
    for (var i = 0; i < shelters.length; i++) {
      var shelter = shelters[i];

      // look for 'point' in wkt and get the pair of numbers in the string after it
      var trimParens = /^\s*\(?(.*?)\)?\s*$/;
      var coordinateString = shelter.geom.toLowerCase().split('point')[1].replace(trimParens, '$1').trim();
      var tokens = coordinateString.split(' ');
      var lng = parseFloat(tokens[0]);
      var lat = parseFloat(tokens[1]);
      var coord = shelterService.getLatLng(shelter.id);
      var detailUrl = '#/vida/shelter-search/shelter-detail/' + shelter.id;

      $rootScope.markers["shelter_" + shelter.id] = {
        draggable: false,
        message: '<div><span style="padding-right: 5px;">' + shelter.name + '</span><a class="icon ion-chevron-right trigger" href=' + detailUrl + '></a></div>',
        lat: coord.lat,
        lng: coord.lng,
        icon: {}
      };
    }
  });
})

.controller('ShelterDetailCtrl', function ($scope, $state, $stateParams, shelterService) {
  console.log("---- ShelterDetailCtrl. shelter id: ", $stateParams.shelterId, shelterService.getById($stateParams.shelterId));
    $scope.shelter = shelterService.getById($stateParams.shelterId);
    $scope.latlng = shelterService.getLatLng($stateParams.shelterId);
});