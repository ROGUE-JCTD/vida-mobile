angular.module('vida.controllers', ['ngCordova.plugins.camera', 'pascalprecht.translate'])


.controller('AppCtrl', function($rootScope, $scope, $ionicModal, $timeout, shelterService, $translate, VIDA_localDB, networkService,
                                $cordovaProgress, $ionicPopup, optionService, $ionicPlatform) {
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

  $rootScope.$on('$cordovaNetwork:online', function(event, networkState){
    console.log('VIDA Went online! networkState: ' + networkState);
  });

  $rootScope.$on('$cordovaNetwork:offline', function(event, networkState){
    console.log('VIDA Went offline! networkState: ' + networkState);
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

  $ionicPlatform.ready(function() {

    // Start up
    var configsCompleted = 0, allConfigs = 2;
    $cordovaProgress.showSimpleWithLabel(true, "Loading configurations..");
    var tryFinishConfig = function () {
      configsCompleted++;
      if (configsCompleted >= allConfigs)
        $cordovaProgress.hide();
    };

    // Set configuration values from DB on startup
    VIDA_localDB.queryDB_select('configuration', 'settings', function (results) {
      if (results.length > 0) {
        var DBSettings = JSON.parse(results[0].settings);
        networkService.SetConfigurationFromDB(DBSettings);
        $rootScope.$broadcast('connectionStatusChanged', isDisconnected);
        tryFinishConfig();
      } else {
        var defaultSettings = optionService.getDefaultConfigurationsJSON();
        VIDA_localDB.queryDB_insert_JSON('configuration', defaultSettings, function () {
          tryFinishConfig();
        }); // add default configuration row if doesn't exist
      }
    });

    VIDA_localDB.queryDB_select('shelters', '*', function (results) {
      shelterService.clearShelters();

      // Add default shelter value
      shelterService.addShelter(optionService.getDefaultShelterData(), false);

      if (results.length > 0) {
        // Add shelters to local list
        for (var i = 0; i < results.length; i++) {
          shelterService.addShelter(results[i], true);
        }
      } else {
        // No shelters were found in the database.
        // This is assuming they never sync'd up with the server.
        $ionicPopup.alert({
          title: 'Update Shelters',
          cssClass: "text-center",
          template: 'Thank you for using VIDA!<br><br>' +
          'On the Settings tab, you can use the "Sync" button to get all the latest shelters and people!'
        });
      }

      tryFinishConfig();
    });
  });
})

.controller('PersonSearchCtrl', function($scope, $location, $http, peopleService, networkService, uploadService, $filter, optionService,
                                         $cordovaToast, $cordovaBarcodeScanner, $cordovaCamera, $cordovaProgress, $cordovaActionSheet,
                                          $ionicPopup) {
    $scope.searchText = '';
    $scope.searchRequestCounter = 0;
    $scope.totalDisplayed = 100;
    $scope.peopleService = peopleService;
    $scope.networkService = networkService;
    $scope.allPeopleInShelter = peopleService.getPeopleInShelter();

    $scope.checkDisconnected = function() {
      return isDisconnected;
    };

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
      peopleService.setStoredSearchQuery(query);

      $scope.searchRequestCounter++;
      peopleService.searchForPerson(networkService.getSearchURL(), query,
        function() {
          // Success
          $scope.searchRequestCounter--;
          $scope.allPeopleInShelter = peopleService.getPeopleInShelter();
        },
        function(error) {
          // Error
          if (error){
            $ionicPopup.alert({
              title: 'Error',
              template: error
            });
          } else {
            // TODO: Translate
            $cordovaToast.showShortBottom("Error: Network timed out. Please check your internet connection.");
          }
          $scope.searchRequestCounter--;
      });
    };

    $scope.changeWindow = function(url) {
      //TODO: Translate
      $cordovaProgress.showSimpleWithLabel(true, "Loading..");

      if (!isDisconnected) {
        var IDOfPerson = url.split('/');

        peopleService.testPersonForNull(IDOfPerson[4], function () {
          $location.path(url);
          $cordovaProgress.hide();
        }, function () {
          $cordovaProgress.hide();
          $cordovaProgress.showSimpleWithLabelDetail("Not Found", "Person not found on server! Removing from list..");
          peopleService.removePersonFromList(IDOfPerson[4]);
          peopleService.searchForPerson(networkService.getPeopleURL(), peopleService.getStoredSearchQuery(), function() {
            $cordovaProgress.hide();
          }, function(error){
            $cordovaProgress.hide();
          });

        }, function(err) {
          $cordovaProgress.hide();
          $cordovaToast.showLongBottom($filter('translate')('error_search_person_error') + err);
        });
      } else {
        $location.path(url);
        $cordovaProgress.hide();
      }
    };

    $scope.showCameraModal = function() {
      var options = {
        title: $filter('translate')('title_picture_dialog'),
        buttonLabels: [$filter('translate')('modal_picture_take_picture'), $filter('translate')('modal_picture_choose_from_library')],
        addCancelButtonWithLabel: $filter('translate')('modal_cancel'),
        androidEnableCancelButton : true,
        winphoneEnableCancelButton : true
      };

      $cordovaActionSheet.show(options).then(function(btnIndex) {
        if (btnIndex != 3) {
          $scope.takeCameraPhoto_Search(btnIndex);
        }
      });
    };

    $scope.takeCameraPhoto_Search = function(source) {
      var options = optionService.getCameraOptions(source);

      $cordovaCamera.getPicture(options).then(function(imageData) {
        var webViewImg = "data:image/jpeg;base64," + imageData;

        // Show loading dialog
        // TODO: Translate
        $cordovaProgress.showSimpleWithLabelDetail(true, "Loading", "Retrieving best possible results..");

        // Upload to facesearchservice, then get the result back and list people
        uploadService.uploadPhotoToUrl(webViewImg, networkService.getFaceSearchServiceURL(), function(data){
          // On success
          if (data.objects.length > 0) {
            peopleService.createSearchResult(data.objects, data.scores);
          } else {
            $cordovaToast.showLongBottom($filter('translate')('error_no_results'));
          }

          // Hide loading dialog
          $cordovaProgress.hide();

          console.log(data);
        }, function(error){
          // Hide loading dialog
          $cordovaProgress.hide();
          $cordovaToast.showLongBottom($filter('translate')('error_couldnt_get_results'));
          console.log(error);
        });
      }, function(err) {
        // error
        console.log(err);
        // Hide loading dialog
        $cordovaProgress.hide();
      });
    };

    console.log('---------------------------------- PersonSearchCtrl');
})

.controller('PersonDetailCtrl', function($scope, $location, $http, $stateParams, $state, $filter, shelter_array,
                                         peopleService, networkService, $rootScope, shelterService, $cordovaProgress,
                                         VIDA_localDB, optionService, uploadService, $cordovaToast){
  console.log('---------------------------------- PersonDetailCtrl');
  $scope.searchPersonRequest = 0;
  $scope.peopleService = peopleService;
  $scope.networkService = networkService;
  $scope.shelterService = shelterService;
  $scope.personPhoto = null;
  $scope.hasLocation = false;
  $scope.isDisconnected = isDisconnected; // used for saving locally button

  // Try and update shelter on entering details
  shelterService.setIsUpdatingShelter(true);

  $scope.setupShelterButton = function(shelterID) {
    if (shelter_array) {
      var wasSet = false;
      // If shelter_array is valid, the first item in the array will be "None".
      // Starting at 1 to skip that.
      for (var i = 1; i < shelter_array.length; i++) {
        if (shelter_array[i].uuid === shelterID) {
          shelterService.setCurrentShelter(shelter_array[i]);
          shelterService.getAll();
          wasSet = true;
          break;
        }
      }
      if (!wasSet)
        shelterService.setCurrentShelter('None');
    } else {
      shelterService.setCurrentShelter('None');
    }

    shelterService.setIsUpdatingShelter(true);
  };

  $scope.goToShelterDetail = function() {
    shelterService.setIfCameFromDetails(true);

    for (var i = 1; i < shelter_array.length; i++) {
      if (shelter_array[i].uuid === shelterService.getCurrentShelter().uuid) {
        $rootScope.$broadcast('changedShelter', shelter_array[i]);
        wasSet = true;
        break;
      }
    }
    var tabs = document.getElementsByClassName("tab-item");
    for (var i=0; i < tabs.length; i++) {
      tabs[i].setAttribute('style', 'display: none;');
    }
    var editDeleteButtons = document.getElementsByClassName("button-person-edit");
    for (i=0; i < editDeleteButtons.length; i++) {
      editDeleteButtons[i].setAttribute('style', 'display: none;');   // Removes buttons
    }
    var backButton = document.getElementsByClassName("button-person-back");
    for (i=0; i < backButton.length; i++) {
      backButton[i].setAttribute('style', 'display: block;');   // Add button
    }

    $scope.$on("$destroy", function() {
      var backButton = document.getElementsByClassName("button-person-back");
      for (i=0; i < backButton.length; i++) {
        backButton[i].setAttribute('style', 'display: none;');   // Remove button
      }
    });
  };

  $scope.setupEditDeleteButtons = function() {
    // Setup tab-specific buttons
    var tabs = document.getElementsByClassName("tab-item");
    for (var i=0; i < tabs.length; i++) {
      tabs[i].setAttribute('style', 'display: none;');
    }

    var backButton = document.getElementsByClassName("button-person-back");
    var editDeleteButtons = document.getElementsByClassName("button-person-edit");
    var saveCancelButtons = document.getElementsByClassName("button-person-post-edit");
    for (i=0; i < editDeleteButtons.length; i++) {
      editDeleteButtons[i].setAttribute('style', 'display: block;');    // Enables buttons
    }
    for (i=0; i < backButton.length; i++) {
      backButton[i].setAttribute('style', 'display: none;');   // Remove button
    }

    $scope.$on("$destroy", function(){
      for (var i=0; i < tabs.length; i++) {
        tabs[i].setAttribute('style', 'display: block;');
      }
      shelterService.setIfCameFromDetails(false);

      for (i=0; i < editDeleteButtons.length; i++) {
        editDeleteButtons[i].setAttribute('style', 'display: none;');   // Removes buttons
      }

      for (i=0; i < saveCancelButtons.length; i++) {
        saveCancelButtons[i].setAttribute('style', 'display: none;');   // Removes buttons
      }
      for (i=0; i < backButton.length; i++) {
        backButton[i].setAttribute('style', 'display: none;');   // Remove button
      }
    });
  };

  // Initial Commands
  // TODO: Translate
  $cordovaProgress.showSimpleWithLabelDetail(true, "Loading", "Loading details..");
  $scope.setupEditDeleteButtons();
  peopleService.searchPersonByID($stateParams.personId, // Will initiate search
    function() {
      // Success
      $scope.searchPersonRequest--;
      $cordovaProgress.hide();
    }, function(error){
      // Error
      $scope.searchPersonRequest--;
      $cordovaProgress.hide();
    });
  $scope.searchPersonRequest++;


  $scope.checkLocationWithUUID = function(shelter_uuid, person_geom) {
    // Shelter to display?
    if (shelter_uuid != null && shelter_uuid != "None") {
      $scope.hasLocation = true;
      var shelter = shelterService.getByUUID(shelter_uuid);
      $scope.locationString = shelter.name;
      if (shelterService.getIsUpdatingShelter()) {
        $scope.setupShelterButton(shelter.uuid);
        shelterService.setIsUpdatingShelter(false);
      }
      return true;
    } else {
      shelterService.setCurrentShelter('None');
    }

    // If not, see if Geom can be displayed
    if (person_geom) {
      var split_geom = person_geom.split('(')[1].split(')')[0].split(' '); // wow I'm bad at this
      var personLocation = {};
      personLocation.lat = split_geom[0];
      personLocation.long = split_geom[1];

      // Is there a Geom to display?
      var hasGeom_NotZero = true;

      // if both are 0.000, there is no Geom
      var lat = Number(Number(personLocation.lat).toFixed(3));
      var long = Number(Number(personLocation.long).toFixed(3));
      if (lat === 0.000 && long === 0.000)
        hasGeom_NotZero = false;

      if (hasGeom_NotZero) {
        $scope.hasLocation = true;
        $scope.locationString = "Lat: " + Number(personLocation.lat).toFixed(5) + ",  " +
          "Long: " +  Number(personLocation.long).toFixed(5);
        return true;
      }
    }

    $scope.hasLocation = false;
    $scope.locationString = "None";
    return true;

    // If we return false, the Location section will not show up
    // This is made this way because it will only update this once, on start up of the page
  };

  $scope.getLocationStr = function() {
    if ($scope.hasLocation) {
      return $scope.locationString;
    } else {
      return "None";
    }
  };

  // Functions
  $rootScope.buttonPersonEdit = function() {
    console.log('PersonDetailCtrl - buttonPersonEdit()');

    // TODO: Translate
    $cordovaProgress.showSimpleWithLabelDetail(true, "Loading", "Settings up editing page for " + peopleService.getRetrievedPersonByID().given_name);
    $state.go('vida.person-search.person-detail.person-edit');
  };

  $rootScope.buttonPersonDelete = function() {
    console.log('PersonDetailCtrl - buttonPersonDelete()');

    if (confirm($filter('translate')('dialog_confirm_delete'))) {
      // TODO: Translate
      $cordovaProgress.showSimpleWithLabelDetail(true, "Deleting", "Deleting " + peopleService.getRetrievedPersonByID().given_name + "..");
      if (!isDisconnected) {
        // First pass *current*: delete entirely from server
        uploadService.deletePerson(peopleService.getRetrievedPersonByID(), function(success) {
          console.log("Deleted person successfully!");
        }, function(error) {
          $cordovaToast.showLongBottom(error);
          console.log(error);
        });

        // Second pass, mark as deleted on the server
      }

      // Mark as deleted in database regardless
      var deleteFlagForDB = [{
        type: 'deleted',
        value: 1
      }];
      var whereAt = "uuid=\"" + peopleService.getRetrievedPersonByID().uuid + "\"";
      VIDA_localDB.queryDB_update('people', deleteFlagForDB, whereAt, function() {
        // Re-update search results
        peopleService.searchForPerson(networkService.getPeopleURL(), peopleService.getStoredSearchQuery(), function(){
          // Everything was successful
          window.history.back();
          $cordovaProgress.hide();
        }, function(error) {
          // Something went wrong
          console.log("Error - ButtonDelete - After Update: " + error);
          window.history.back();
          $cordovaProgress.hide();
        });
      });
    }
  };
})

.controller('PersonDetailEditCtrl', function($scope, $state, $rootScope, $stateParams, $http, peopleService, shelter_array, $cordovaToast, $ionicPopup, $cordovaGeolocation,
                                             networkService, $filter, $cordovaActionSheet, $cordovaCamera, optionService, shelterService, $cordovaProgress, $cordovaBarcodeScanner) {
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
  $scope.status_options = optionService.getStatusOptions();
  $scope.race_options = optionService.getRaceOptions();

  $scope.LocationDropdownDisabled = false;
  $scope.current_location = {};
  $scope.current_location.lat = -1111;
  $scope.current_location.long = -1111;
  $scope.previous_shelter_label = "None";

  $rootScope.$on('updateShelterList', function() {
    $scope.shelter_array = shelterService.getAllLocalShelters();
  });

  $scope.checkDisconnected = function() {
    return isDisconnected;
  };

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
      if (!isDisconnected) {
        // Test Image
        var URL = networkService.getFileServiceURL() + person.pic_filename + '/download/';
        $scope.pictureTestSpinner++;

        $http.get(URL, networkService.getAuthenticationHeader()).then(function (xhr) {
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
        }, function (error) {
          // Error
          console.log(error);
          $scope.pictureTestSpinner--;
        });
      } else {
        var image = peopleService.getPersonalImage(person.pic_filename, function(URL){
          document.getElementById('personal_photo').src = URL;
          $scope.hasPlaceholderImage = false;
        }, function(placeholder, error){
          document.getElementById('personal_photo').src = placeholder;
          $scope.hasPlaceholderImage = true;
        });

        if (image)
          document.getElementById('personal_photo').src = image;
      }
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
    setupDropdown('status');
    setupDropdown('race');

    $scope.shelter_array = shelter_array;
    if ($scope.shelter_array) {
      // Look at person and see what shelter they are assigned to
      var isAssigned = false;
      for (var j = 1; j < shelter_array.length; j++) {
        if (person.shelter_id === shelter_array[j].uuid) {
          $scope.current_shelter = $scope.shelter_array[j];
          $scope.previous_shelter_label = $scope.shelter_array[j].name;
          isAssigned = true;
          break;
        }
      }

      // TODO: Discuss whether location is more important than shelter
      if (!isAssigned) {
        // See if they have a geometry
        if (person.geom !== "") {
          var split_geom = person.geom.split('(')[1].split(')')[0].split(' '); // wow I'm bad at this
          var personLocation = {};
          personLocation.lat = split_geom[0];
          personLocation.long = split_geom[1];
          if (Number(personLocation.lat) !== 0.0 && Number(personLocation.long) !== 0.0) {
            // Gray out shelters section and fill with "Using Current Location"
            $scope.LocationDropdownDisabled = true;
            document.getElementById('locationItemLabel').setAttribute("class", "item-input-wrapper item-select grayout");
            document.getElementById('shelter').disabled = true;
            document.getElementById('shelter').selectedOptions[0].label = "Using Curr Location";
            $scope.current_location.lat = personLocation.lat;
            $scope.current_location.long = personLocation.long;
          } else {
            $scope.current_shelter = $scope.shelter_array[0];
          }
        } else {
          $scope.current_shelter = $scope.shelter_array[0];
        }
      }
    }
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

  $scope.revertLocation = function() {
    // Reset back to normal
    $scope.LocationDropdownDisabled = false;
    document.getElementById('locationItemLabel').setAttribute( "class", "item-input-wrapper item-select" );

    var shelterElement = document.getElementById('shelter');
    shelterElement.disabled = false;

    for (var i = 0; i < shelterElement.options.length; i++) {
      if ($scope.previous_shelter_label === shelterElement.options[i].innerText){ // checking innerText because that holds the original
        shelterElement.selectedOptions[0].label = $scope.previous_shelter_label; // revert label back
        shelterElement.selectedIndex = i;
      }
    }
  };

  $scope.useLocation = function() {
    $cordovaProgress.showSimpleWithLabel(true, "Getting location..");

    var posOptions = {timeout: 20000, enableHighAccuracy: true};
    document.getElementById('shelter').disabled = true;

    $cordovaGeolocation.getCurrentPosition(posOptions).then(function(position){
      console.log("Current position: " + position);
      // Is there a previous location stored?

      // Gray out shelters section and fill with "Using Current Location"
      $scope.LocationDropdownDisabled = true;
      document.getElementById('locationItemLabel').setAttribute( "class", "item-input-wrapper item-select grayout" );
      $scope.current_location.lat = position.coords.latitude;
      $scope.current_location.long = position.coords.longitude;
      $scope.previous_shelter_label = document.getElementById('shelter').selectedOptions[0].label;
      document.getElementById('shelter').selectedOptions[0].label = "Using Curr Location";

      $cordovaProgress.hide();
      $cordovaToast.showLongBottom("Location found! Using this location.");
    }, function(error){
      console.log("Problem getting location: " + error.message);

      // Reset back to normal
      $scope.revertLocation();

      $cordovaProgress.hide();
      $cordovaToast.showLongBottom("Could not find location. Please try again.");
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

  $scope.changeStatus = function() {
    $scope.current_status = this.current_status;
  };

  $scope.changeRace = function() {
    $scope.current_race = this.current_race;
  };

  $scope.changeShelter = function() {
    $scope.current_shelter = this.current_shelter;

    $scope.previous_shelter_label = document.getElementById('shelter').selectedOptions[0].label;
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
        editDeleteButtons[i].setAttribute('style', 'display: block;');   // Enables buttons
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
    var statusElement       = document.getElementById('status');
    doc.status              = statusElement.options[statusElement.selectedIndex].label;
    var raceElement         = document.getElementById('race');
    doc.race                = raceElement.options[raceElement.selectedIndex].label;
    var shelterElement      = document.getElementById('shelter');
    doc.shelter_id          = $scope.shelter_array[shelterElement.selectedIndex].uuid;

    doc.photo               = document.getElementById('personal_photo').src;
  };

  $rootScope.buttonPersonSave = function() {
    var person = peopleService.getRetrievedPersonByID();

    var documentValues = {}; // Used to only retrieve once
    $scope.setupDocumentValues(documentValues);

    var changedPerson = {};
    changedPerson.uuid = person.uuid; // used for disconnected reference
    var saveFields = checkFields;

    for (var i = 0; i < saveFields.length; i++) {
      changedPerson[saveFields[i]] = ((person[saveFields[i]] !== documentValues[saveFields[i]])) ? documentValues[saveFields[i]] : undefined;
    }

    if (changedPerson['given_name'] !== '') {

      // specific cases
      changedPerson.photo = ((networkService.getFileServiceURL() + person.pic_filename + '/download/') !== documentValues.photo) ? documentValues.photo : undefined;
      if (changedPerson.photo !== undefined) {
        if (changedPerson.photo === peopleService.getPlaceholderImage()) {
          if (person.pic_filename) {
            // Went from picture to no picture
            changedPerson.photo = undefined; //TODO? is it worth it?
          } else
            changedPerson.photo = undefined;
        } else if (changedPerson.photo.startsWith('file:///')) {
          changedPerson.photo = undefined; // Using a file from on disk already
        }
      }

      // all dropdowns (gender, injury, nationality, shelter_id)
      var dropdownOptions = optionService.getAllDropdownOptions();
      dropdownOptions.push({
        dropdown: 'shelter_id',
        options: $scope.shelter_array
      });
      var originalPersonValue, documentValue, originalDropdownValue;
      for (var j = 0; j < dropdownOptions.length; j++) {
        originalPersonValue = person[dropdownOptions[j].dropdown];
        documentValue = documentValues[dropdownOptions[j].dropdown];
        originalDropdownValue = dropdownOptions[j].options[0].value;


        changedPerson[dropdownOptions[j].dropdown] =
          ((originalPersonValue !== documentValue) &&
          documentValue !== originalDropdownValue)
            ? documentValue : undefined;

        if (changedPerson[dropdownOptions[j].dropdown] === undefined) {
          // See if they are trying to change back to "None"
          if (documentValue === originalDropdownValue &&
            (originalPersonValue !== originalDropdownValue &&
            originalPersonValue !== "")) {
            changedPerson[dropdownOptions[j].dropdown] = originalDropdownValue;
          }
        }
      }

      changedPerson.id = person.id;

      if (person.pic_filename)
        changedPerson.pic_filename = person.pic_filename;

      changedPerson.created_at = new Date().toISOString();
      //changedPerson.created_by = networkService.getUsernamePassword().username;

      var geom = {};
      if (person.geom) {
        if (person.geom !== "") {
          var split_geom = person.geom.split('(')[1].split(')')[0].split(' '); // wow I'm bad at this again
          geom.lat = split_geom[0];
          geom.long = split_geom[1];
        }
      }

      // If no shelter ID, or no location usage
      if (changedPerson.shelter_id !== undefined) {
        // See if they have shelter
        if ($scope.LocationDropdownDisabled == true) {
          // Check for possible new location
          if (geom.lat !== $scope.current_location.lat &&
            geom.long !== $scope.current_location.long)
            changedPerson.geom = "SRID=4326;POINT (" + $scope.current_location.long + " " + $scope.current_location.lat + ")";
        } else {
          // Use possibly new shelter location
          if ($scope.current_shelter.geom === "") {
            changedPerson.geom = "SRID=4326;POINT (0.0000000000000000 0.0000000000000000)";
          } else {
            if (person.geom !== $scope.current_shelter.geom)
              changedPerson.geom = $scope.current_shelter.geom;
            else
              changedPerson.geom = "SRID=4326;POINT (0.0000000000000000 0.0000000000000000)";
          }
        }
      } else if ($scope.LocationDropdownDisabled == true) {
        // Check for possible new location
        if (geom.lat !== $scope.current_location.lat &&
          geom.long !== $scope.current_location.long)
          changedPerson.geom = "SRID=4326;POINT (" + $scope.current_location.long + " " + $scope.current_location.lat + ")";
      }

      // Show loading dialog
      // TODO: Translate
      $cordovaProgress.showSimpleWithLabelDetail(true, "Saving", "Saving changes to " + person.given_name);
      $scope.saveChangesRequest++;
      peopleService.editPerson_saveChanges(changedPerson, function (success) {
        if (peopleService.getRetrievedPersonByID()) {
          // Success
          $scope.saveChangesRequest--;
          $cordovaProgress.hide();
          // TODO: Translate
          $cordovaProgress.showSimpleWithLabelDetail(true, "Complete", "Changes saved! Returning to details..");
          peopleService.searchPersonByID(peopleService.getRetrievedPersonByID().id, function () {  // This will reload the person in details
            var prevSearchQuery = peopleService.getStoredSearchQuery();
            if (!isDisconnected) {
              // Update current Shelter on detail page
              var shelterID = peopleService.getRetrievedPersonByID().shelter_id;
              var wasSet = false;
              for (var i = 1; i < $scope.shelter_array.length; i++) {
                if ($scope.shelter_array[i].uuid === shelterID) {
                  shelterService.setCurrentShelter(shelter_array[i]);
                  shelterService.getAll();
                  wasSet = true;
                  break;
                }
              }
              if (!wasSet)
                shelterService.setCurrentShelter('None');
              shelterService.setIsUpdatingShelter(true);
            }
            peopleService.searchForPerson(networkService.getSearchURL(), prevSearchQuery, function () {
              // will successfully reload
              $state.go('vida.person-search.person-detail');
              $cordovaProgress.hide();
            }, function () {
              // will not successfully reload
              $state.go('vida.person-search.person-detail');
              $cordovaProgress.hide();

              // TODO: Translate
              $cordovaToast.showShortBottom('Something went with retrieving updated person. Please check your connection.');
            }); // This will reload search query
          }, function () {

          });
        }
      }, function (error) {
        // Error
        //TODO: SHOW ERROR
        $scope.saveChangesRequest--;
        $state.go('vida.person-search.person-detail');
        $cordovaProgress.hide();
      });
    } else {
      $cordovaToast.showShortBottom($filter('translate')('dialog_error_person_no_name_edit'));
    }
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

    if (!$scope.hasPlaceholderImage) {
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
      saveToPhotoAlbum: true
    };

    $cordovaCamera.getPicture(options).then(function(imageData) {
      document.getElementById('personal_photo').src = "data:image/jpeg;base64," + imageData;
      $scope.hasPlaceholderImage = false;
    }, function(err) {
      // error
    });
  };

  $scope.showClearAllModal = function() {
    //TODO: Translate
    $ionicPopup.confirm({
      title: 'Clear Fields',
      template: 'Are you sure you want to clear all fields?'
    }).then(function(result){
      if (result) {
        $scope.clearAllFields();
      }
    })
  };

  $scope.clearAllFields = function() {
    for (var i = 0; i < checkFields.length; i++) {
      document.getElementById(checkFields[i]).value = '';
    }

    // Photo
    document.getElementById('personal_photo').src = peopleService.getPlaceholderImage();
    $scope.hasPlaceholderImage = true;

    // Fix dropdown values (under the hood)
    $scope.current_gender = $scope.gender_options[0];
    document.getElementById('gender').selectedIndex = 0;
    $scope.current_nationality = $scope.nationality_options[0];
    document.getElementById('nationality').selectedIndex = 0;
    $scope.current_injury = $scope.injury_options[0];
    document.getElementById('injury').selectedIndex = 0;
    $scope.current_status = $scope.status_options[0];
    document.getElementById('status').selectedIndex = 0;
    $scope.current_race = $scope.race_options[0];
    document.getElementById('race').selectedIndex = 0;

    $scope.revertLocation();
    if ($scope.shelter_array) {
      $scope.current_shelter = $scope.shelter_array[0];
      document.getElementById('shelter').selectedIndex = 0;
    }
  };

  $scope.scanBarcode = function() {
    $cordovaBarcodeScanner.scan().then(function(barcodeData){
      if (barcodeData.cancelled === false) {
        // Success!
        //$scope.person.barcode.format = barcodeData.format;
        document.getElementById('barcode').value = barcodeData.text;
      }
    }, function(error){
      // Error!
    });
  };

  // Startup
  $scope.setupSaveCancelButtons();
  $cordovaProgress.hide();
})

.controller('PersonCreateCtrl', function($scope, $location, $http, $cordovaCamera, $cordovaActionSheet, $filter, $ionicModal, $rootScope,
                                         $cordovaToast, $cordovaBarcodeScanner, peopleService, uploadService, networkService, $cordovaFile,
                                          optionService, $q, shelter_array, $cordovaProgress, VIDA_localDB, $ionicPopup, $cordovaGeolocation,
                                          shelterService){
    $scope.person = {};
    $scope.person.photo = null;
    $scope.person.barcode = {};
    $scope.person.location = {};
    $scope.person.location.lat = -1111;
    $scope.person.location.long = -1111;
    $scope.peopleService = peopleService;
    $scope.isEditing = false;
    $scope.createTabTitle = 'title_create';
    $scope.saveChangesRequest = 0;

    $scope.gender_options = optionService.getGenderOptions();
    $scope.injury_options = optionService.getInjuryOptions();
    $scope.nationality_options = optionService.getNationalityOptions();
    $scope.status_options = optionService.getStatusOptions();
    $scope.race_options = optionService.getRaceOptions();

    $scope.current_gender = $scope.gender_options[0];
    $scope.current_injury = $scope.injury_options[0];
    $scope.current_nationality = $scope.nationality_options[0];
    $scope.current_status = $scope.status_options[0];
    $scope.current_race = $scope.race_options[0];

    $cordovaProgress.hide();

    $scope.checkDisconnected = function() {
      return isDisconnected;
    };

    $scope.shelter_array = shelter_array; // setup through app.js - vida.person-create - resolve
    if ($scope.shelter_array) {
      $scope.current_shelter = $scope.shelter_array[0];
      document.getElementById('shelter').selectedIndex = 0;
    }

    $rootScope.$on('updateShelterList', function() {
      $scope.shelter_array = shelterService.getAllLocalShelters();
    });

    // Helper function
    var fixUndefined = function(str){
      return str === undefined ? "" : str;
    };

    $scope.savePerson = function() {
      if ($scope.person.given_name !== undefined) {

        var Gender;
        if ($scope.current_gender !== undefined) {
          if ($scope.current_gender.value !== $scope.gender_options[0].value)
            Gender = $scope.current_gender.value;
        }

        var Injury;
        if ($scope.current_injury !== undefined) {
          if ($scope.current_injury.value !== $scope.injury_options[0].value)
            Injury = $scope.current_injury.value;
        }

        var Nationality;
        if ($scope.current_nationality !== undefined) {
          if ($scope.current_nationality.value !== $scope.nationality_options[0].value)
            Nationality = $scope.current_nationality.value;
        }

        var Status;
        if ($scope.current_status !== undefined) {
          if ($scope.current_status.value !== $scope.status_options[0].value)
            Status = $scope.current_status.value;
        }

        var Race;
        if ($scope.current_race !== undefined) {
          if ($scope.current_race.value !== $scope.race_options[0].value)
            Race = $scope.current_race.value;
        }

        var ShelterID;
        if ($scope.current_shelter !== undefined) {
          if ($scope.current_shelter.uuid !== $scope.shelter_array[0].uuid)
            ShelterID = $scope.current_shelter.uuid;
        }

        var Photo;
        if ($scope.person.photo !== undefined) {
          if ($scope.person.photo !== null)
            Photo = $scope.person.photo;
          else
            Photo = undefined;
        }

        var Barcode;
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
        newPerson.shelter_id          = ShelterID; // will always be defined
        newPerson.street_and_number   = fixUndefined($scope.person.street_and_number);
        newPerson.date_of_birth       = fixUndefined($scope.person.date_of_birth);
        newPerson.status              = Status;
        newPerson.race                = Race;
        newPerson.phone_number        = fixUndefined($scope.person.phone_number);
        newPerson.injury              = Injury; // will always be defined
        newPerson.nationality         = Nationality; // will always be defined
        newPerson.uuid                = optionService.generate_uuid4();

        newPerson.created_by          = networkService.getUsernamePassword().username;

        // This is here to store photo for upload
        newPerson.photo               = Photo;  // photo being undefined is checked

        // Find Geom for person
        if ($scope.LocationDropdownDisabled === true) {
          // Using current location
          newPerson.geom = "SRID=4326;POINT (" + $scope.person.location.long + " " + $scope.person.location.lat + ")";
        } else {
          if (newPerson.shelter_id !== undefined) {
            newPerson.geom = $scope.current_shelter.geom;
          } else {
            newPerson.geom = "SRID=4326;POINT (0.0000000000000000 0.0000000000000000)";
          }
        }

        $cordovaProgress.showSimpleWithLabelDetail(true, $filter('translate')('dialog_box_title_saving'),
          $filter('translate')('dialog_box_message_uploading') + newPerson.given_name);

        if (newPerson.photo) {
          if (!isDisconnected) {
            $scope.uploadPhoto(newPerson, function () {
              // On successful upload of Photo, the photo hash is already assigned to newPerson.pic_filename

              // Save out file as "origPicHash + '_thumb.' + ext" for later access
              var photoFile = uploadService.convertPictureToBlob(newPerson.photo);
              var picture = newPerson.pic_filename.split('.');
              var newFilename = picture[0] + '_thumb.' + picture[1];
              $cordovaFile.writeFile(cordova.file.dataDirectory, 'Photos/' + newFilename, photoFile, true);

              $scope.uploadPerson(newPerson);
              $cordovaProgress.hide();
            }, function(error) {
              // Error uploading picture
              $cordovaProgress.hide();
              $ionicPopup.alert({
                title: 'Error',
                template: 'There was an error uploading this person\'s information. Please check your connection and try again.'
              }); // TODO: Translate
              console.log(error);

              // Attempt to upload person
              $scope.uploadPerson(newPerson);
            });
          } else {
            $ionicPopup.alert({
              title: 'Disconnected',
              template: 'Since you are disconnected, the photo will be uploaded next time you sync.'
            }); // TODO: Translate

            // Save out picture (won't be hashed yet so save temporary picture name)
            newPerson.pic_filename = 'temp_picture_' + newPerson.uuid + '.jpg';
            var photoFile = uploadService.convertPictureToBlob(newPerson.photo);
            $cordovaFile.writeFile(cordova.file.dataDirectory, 'Photos/' + newPerson.pic_filename, photoFile, true);

            $scope.uploadPerson(newPerson); // will put into local DB
            $cordovaProgress.hide();
          }
        } else {
          // On non-successful upload of Photo, the person's info will only be uploaded
          $scope.uploadPerson(newPerson);
          $cordovaProgress.hide();
        }
      } else {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_person_no_name'));
        $cordovaProgress.hide();
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

    $scope.uploadPhoto = function(newPerson, success, error) {
      uploadService.uploadPhotoToUrl(newPerson.photo, networkService.getFileServiceURL(), function (data) {
        // Success
        //$cordovaToast.showShortBottom($filter('translate')('dialog_photo_uploaded') + newPerson.given_name + '!');
        newPerson.pic_filename = data.name;
        success();
      }, function (error_status) {
        // Error uploading photo
        if (error)
          error(error_status);
      });
    };

    $scope.uploadPerson = function(newPerson) {
      if (!isDisconnected) {
        $scope.addPersonToLocalDatabase(newPerson, function() {
          // Upload person to fileService
        uploadService.uploadPersonToUrl(newPerson, networkService.getAuthenticationURL(), function () {
          // Successful entirely
          $cordovaToast.showLongBottom(newPerson.given_name + $filter('translate')('dialog_person_uploaded'));
          $scope.clearAllFields(); // Only on success
        }, function(error) {
          $cordovaToast.showLongBottom(error);

          // Remove locally
          VIDA_localDB.queryDB_delete('people', "uuid=\"" + newPerson.uuid + "\"");

        });
        });
      } else {
        // Add person to local database (Creation)
        $scope.addPersonToLocalDatabase(newPerson, function() {
          $scope.clearAllFields(); // Only on success
        });
      }
    };

    $scope.showClearAllModal = function() {
      $ionicPopup.confirm({
        title: $filter('translate')('dialog_clear_fields_title'),
        template: $filter('translate')('dialog_clear_fields_message')
      }).then(function(result){
        if (result) {
          $scope.clearAllFields();
        }
      })
    };

    $scope.clearAllFields = function() {
      $scope.person.given_name = undefined; // Important
      $scope.person.photo = undefined;
      $scope.person.family_name = '';
      $scope.person.fathers_given_name = '';
      $scope.person.mothers_given_name = '';
      $scope.person.age = '';
      $scope.person.date_of_birth = '';
      $scope.person.street_and_number = '';
      $scope.person.city = '';
      $scope.person.neighborhood = '';
      $scope.person.description = '';
      $scope.person.phone_number = '';
      $scope.person.barcode.code = '';

      // Fix dropdown values (under the hood)
      $scope.current_gender = $scope.gender_options[0];
      document.getElementById('gender').selectedIndex = 0;
      $scope.current_nationality = $scope.nationality_options[0];
      document.getElementById('nationality').selectedIndex = 0;
      $scope.current_injury = $scope.injury_options[0];
      document.getElementById('injury').selectedIndex = 0;
      $scope.current_status = $scope.status_options[0];
      document.getElementById('status').selectedIndex = 0;
      $scope.current_race = $scope.race_options[0];
      document.getElementById('race').selectedIndex = 0;

      $scope.revertLocation();
      if ($scope.shelter_array) {
        $scope.current_shelter = $scope.shelter_array[0];
        document.getElementById('shelter').selectedIndex = 0;
      }
    };

    $scope.addPersonToLocalDatabase = function(newPerson, success){
      var localPerson = newPerson; // made for a-sync reference

      VIDA_localDB.queryDB_select('people', '*', function(results){
        var ID = results.length + 1;
        var isDirty = isDisconnected ? 1 : 0; // Person could have just been uploaded, therefore not dirty
        var isDeleted = 0;
        var obj = (ID).toString() + ", '" + localPerson.uuid + "', " + isDirty + ", " + isDeleted + ", ";
        var person_info_indexing = optionService.getPersonToDBInformation();
        for (var k = 0; k < person_info_indexing.length; k++) {
          if (person_info_indexing[k] !== "photo") {
            if (localPerson[person_info_indexing[k]] !== undefined)
              obj += "\"" + localPerson[person_info_indexing[k]] + "\"";
            else
              obj += "\"\"";
          } else {
            // Specific Photo Case
            if (localPerson.photo !== undefined){
              obj += "'" + localPerson.photo + "'";
            } else
              obj += "''";
          }

          if (k < person_info_indexing.length - 1)
            obj += ", ";
        }

        VIDA_localDB.queryDB_insert('people', obj, function() {
          if (isDirty) {
            // Was disconnected, needs to be updated
            $rootScope.$broadcast('databaseUpdateSyncStatus');
          }

          $cordovaToast.showShortBottom($filter('translate')('toast_added_person_locally') + localPerson.given_name);
          if (success)
            success();
        });
      });
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
      var options = optionService.getCameraOptions(source);

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

    $scope.changeStatus = function() {
      $scope.current_status = this.current_status;
    };

    $scope.changeRace = function() {
      $scope.current_race = this.current_race;
    };

    $scope.changeShelter = function() {
      $scope.current_shelter = this.current_shelter;

      $scope.previous_shelter_label = document.getElementById('shelter').selectedOptions[0].label;
    };

    $scope.LocationDropdownDisabled = false;
    $scope.previous_shelter_label = "None";

    $scope.revertLocation = function() {
      // Reset back to normal
      $scope.LocationDropdownDisabled = false;
      document.getElementById('locationItemLabel').setAttribute( "class", "item-input-wrapper item-select" );

      var shelterElement = document.getElementById('shelter');
      shelterElement.disabled = false;

      for (var i = 0; i < shelterElement.options.length; i++) {
        if ($scope.previous_shelter_label === shelterElement.options[i].innerText){ // checking innerText because that holds the original
          shelterElement.selectedOptions[0].label = $scope.previous_shelter_label; // revert label back
          shelterElement.selectedIndex = i;
        }
      }
    };

    $scope.useLocation = function() {
      $cordovaProgress.showSimpleWithLabel(true, "Getting location..");

      var posOptions = {timeout: 20000, enableHighAccuracy: true};
      var shelterElement = document.getElementById('shelter');
      shelterElement.disabled = true;

      $cordovaGeolocation.getCurrentPosition(posOptions).then(function(position){
        console.log("Current position: " + position);

        var prevLocation = false;
        // Is there a previous location stored?
        if ($scope.person.location.lat !== -1111 && $scope.person.location.long !== -1111) {
          // Why bother asking if it's the same
          if (!($scope.person.location.lat === position.coords.latitude &&
                $scope.person.location.long === position.coords.longitude)) {
            var options = {
              title: $filter('translate')('dialog_location_title'),
              buttonLabels: [$filter('translate')('dialog_location_prev_location'),
                            $filter('translate')('dialog_location_curr_location')],
              androidEnableCancelButton: false,
              winphoneEnableCancelButton: false
            };

            $cordovaActionSheet.show(options).then(function (btnIndex) {
              if (btnIndex == 1) {
                prevLocation = true;
              }
            });
          }
        }

        // Gray out shelters section and fill with "Using Current Location"
        $scope.LocationDropdownDisabled = true;
        document.getElementById('locationItemLabel').setAttribute( "class", "item-input-wrapper item-select grayout" );
        $scope.previous_shelter_label = shelterElement.selectedOptions[0].label;
        // TODO TRANSLATE
        if (prevLocation)
          shelterElement.selectedOptions[0].label = "Using Prev Location";
        else {
          $scope.person.location.lat = position.coords.latitude;
          $scope.person.location.long = position.coords.longitude;
          shelterElement.selectedOptions[0].label = "Using Curr Location";
        }


        $cordovaProgress.hide();
        //TODO TRANSLATE
        $cordovaToast.showLongBottom("Location found! Using this location.");
      }, function(error){
        console.log("Problem getting location: " + error.message);

        // Reset back to normal
        $scope.revertLocation();

        $cordovaProgress.hide();
        //TODO TRANSLATE
        $cordovaToast.showLongBottom("Could not find location. Please try again.");
      });
    };

    // Used for getting shelter dropdowns before page is loaded
    $scope.refreshShelters = function() {
      var shelters = $q.defer();
      var array = [optionService.getDefaultShelterData()];
      var auth = networkService.getUsernamePassword();

      $.ajax({
        type: 'GET',
        xhrFields: {
          withCredentials: true
        },
        url: networkService.getShelterURL(),
        success: function (data) {
          if (data.objects.length > 0) {
            for (var i = 0; i < data.objects.length; i++) {
              array.push(data.objects[i]);
            }
            $scope.shelter_array = array;
          } else {
            console.log('No shelters returned - check url: ' + networkService.getShelterURL() + ' or none are available');
            $scope.shelter_array = array;
          }
        },
        error: function () {
          console.log('Error - retrieving all shelters failed');
        },
        username: auth.username,
        password: auth.password
      });

      return shelters.promise;
    };

  console.log('---------------------------------- PersonCreateCtrl');
})

.controller('SettingsCtrl', function($scope, $location, peopleService, optionService, VIDA_localDB, $cordovaToast, $filter,
                                     $cordovaGeolocation, $ionicPopup, networkService, $translate, $cordovaProgress, $cordovaNetwork,
                                     uploadService, $cordovaFile, $q, shelterService, $rootScope, $http){
  console.log('---------------------------------- SettingsCtrl');

  $scope.networkAddr = networkService.getServerAddress();
  $scope.b_disconnected = isDisconnected;
  $scope.networkService = networkService;
  $scope.button_update_database_str = $filter('translate')('button_update_database');
  $scope.updatable_entries = 0;

    $rootScope.$on('databaseUpdateSyncStatus', function () {
      $scope.checkAllDirtyEntries().then(function(allDirtyEntries) {
        $scope.updateSyncButton(allDirtyEntries.length);
      });
    });

    $scope.resetSyncButton = function() {
      $scope.updatable_entries = 0;
      $scope.button_update_database_str = $filter('translate')('button_update_database');
    };

    $scope.updateSyncButton = function(num_entries) {
      $scope.updatable_entries = num_entries;

      if (num_entries > 0) {
        $scope.button_update_database_str = $filter('translate')('button_update_database') + ": " + num_entries;
      }
    };

    $scope.checkAllDirtyEntries = function() {
      var prom = $q.defer();

      var where = {};
      where.restriction = 'EXACT';
      where.column = 'isDirty';
      where.value = 1;
      VIDA_localDB.queryDB_select('people', '*', function(results){
        // Could just return results[i]?
        var allPeople = [];
        for (var i = 0; i < results.length; i++) {
          allPeople.push(results[i]);
        }
        prom.resolve(allPeople);
      }, where);

      return prom.promise;
    };

    // Functions
    $scope.logout = function(url) {
      // Can go directly to '/login'
      $location.path(url);
    };

    $scope.saveServerIP = function(IP) {
      $cordovaProgress.showSimpleWithLabelDetail(true, $filter('translate')('dialog_box_title_saving'),
        $filter('translate')('dialog_box_message_saving_settings'));
      networkService.setServerAddress(IP);

      VIDA_localDB.queryDB_update_settings(function() {
        $cordovaProgress.hide();
      });
    };

    $scope.switchLanguage = function() {
      $cordovaProgress.showSimpleWithLabelDetail(true, $filter('translate')('dialog_box_title_saving'),
        $filter('translate')('dialog_box_message_saving_settings'));

      if (this.current_language.value === "English")
        $translate.use('en');
      else if (this.current_language.value === "Spanish")
        $translate.use('es');
      else
        $translate.use('en');

      networkService.setLanguage(this.current_language.value);

      VIDA_localDB.queryDB_update_settings(function() {
        $cordovaProgress.hide();
      });
    };

  var createPersonObj_insert = function(ID, person) {
    var person_info_indexing = optionService.getPersonToDBInformation();
    var isDirty = 0; // Saving out last updated person - no need to be dirty
    var isDeleted = 0;
    var obj = (ID).toString() + ", \"" + person.uuid + "\", " + isDirty + ", " + isDeleted + ", ";
    for (var k = 0; k < person_info_indexing.length; k++) {
      obj += "\"" + person[person_info_indexing[k]] + "\"";
      if (k < person_info_indexing.length - 1)
        obj += ", ";
    }

    return obj;
  };

  var createPersonObj_update = function(ID, person) {
    var person_info_indexing = optionService.getPersonToDBInformation();
    var isDirty = 0; // Saving out last updated person - no need to be dirty
    var deleted = 0;
    var obj = [];
    obj.push({
      type: 'uuid',
      value: "\"" + person.uuid + "\""
    });
    obj.push({
      type: 'isDirty',
      value: "\"" + isDirty + "\""
    });
    obj.push({
      type: 'deleted',
      value: "\"" + deleted + "\""
    });

    for (var k = 0; k < person_info_indexing.length; k++) {
      obj.push({
        type: person_info_indexing[k],
        value: "\"" + person[person_info_indexing[k]] + "\""
      });
    }

    return obj;
  };

  $scope.insertPersonLocalDatabase = function(ID, newPerson, afterInsert){
    var obj = createPersonObj_insert(ID, newPerson);
    VIDA_localDB.queryDB_insert('people', obj, function() {
      if (afterInsert)
        afterInsert();
    });
  };

  $scope.updatePersonLocalDatabase = function(newPerson){
    var obj = createPersonObj_update(newPerson.id, newPerson);
    var whereAt = "uuid=\'" + newPerson.uuid + "\'";
    VIDA_localDB.queryDB_update('people', obj, whereAt);
  };

  $scope.uploadPerson_UpdateSync = function(newPerson, isUpdating, afterUpload) {
    if (!isUpdating) {
      var uploadPersonFunction = function() {
        // Upload person to fileService
        uploadService.uploadPersonToUrl(newPerson, networkService.getAuthenticationURL(), function () {
          // Successful entirely
          $cordovaToast.showShortBottom(newPerson.given_name + $filter('translate')('dialog_person_uploaded'));
          if (afterUpload)
            afterUpload();
        }, function () {
          // Error uploading person
          console.log('error uploading person');
        });
      };

      if (newPerson.photo !== undefined && newPerson.photo !== "undefined") {
        if (newPerson.photo !== peopleService.getPlaceholderImage() && newPerson.photo !== "") {
          // Upload photo
          $scope.uploadPhoto_UpdateSync(newPerson, function () {
            // Picture uploaded successfully. Get rid of the old picture
            $cordovaFile.checkFile(cordova.file.dataDirectory, 'Photos/temp_picture_' + newPerson.uuid + '.jpg').then(
              function () {
                // Found old file
                var picture = newPerson.pic_filename.split('.');
                var newFilename = picture[0] + '_thumb.' + picture[1];
                $cordovaFile.moveFile(cordova.file.dataDirectory, 'Photos/temp_picture_' + newPerson.uuid + '.jpg',
                  cordova.file.dataDirectory, 'Photos/' + newFilename);
              }
            );
            uploadPersonFunction();
          }, uploadPersonFunction);
        } else
          uploadPersonFunction();
      } else
        uploadPersonFunction();

    } else {
      var updatePersonFunction = function() {
        uploadService.updatePerson(newPerson, function() {
          console.log("updatePerson - updated " + newPerson.given_name + " on server successfully!");
          if (afterUpload)
            afterUpload();
          $scope.updatePersonLocalDatabase(newPerson);
        }, function() {
          console.log("uploadPerson - updatePerson error");
        });
      };

      if (newPerson.photo !== undefined && newPerson.photo !== "undefined") {
        // Upload photo (do regardless of fail/success)
        if (newPerson.photo !== peopleService.getPlaceholderImage() && newPerson.photo !== "") {
          // Upload photo
          $scope.uploadPhoto_UpdateSync(newPerson, function () {
            // newPerson.pic_filename will now be replaced with new hashed filename

            // Picture uploaded successfully. Get rid of the old picture
            $cordovaFile.checkFile(cordova.file.dataDirectory, 'Photos/temp_picture_' + newPerson.uuid + '.jpg').then(
              function () {
                // Found old file
                var picture = newPerson.pic_filename.split('.');
                var newFilename = picture[0] + '_thumb.' + picture[1];
                // Make old picture the new filename
                $cordovaFile.moveFile(cordova.file.dataDirectory, 'Photos/temp_picture_' + newPerson.uuid + '.jpg',
                  cordova.file.dataDirectory, 'Photos/' + newFilename);
              }
            );
            updatePersonFunction();
          }, updatePersonFunction);
        } else
          updatePersonFunction();
      } else
        updatePersonFunction();
    }
  };

  $scope.uploadPhoto_UpdateSync = function(newPerson, success, error) {
    uploadService.uploadPhotoToUrl(newPerson.photo, networkService.getFileServiceURL(), function (data) {
      // Success
      newPerson.pic_filename = data.name;
      success();
    }, function () {
      // Error uploading photo
      if (error)
        error();
    });
  };

    $scope.changeDisconnected = function() {
      if (!$scope.b_disconnected) {
        $scope.b_disconnected = true;
      } else
        $scope.b_disconnected = false;

      isDisconnected = $scope.b_disconnected;

      if ($scope.b_disconnected) {
        // Will check local shelters
        if (shelterService.getAll().then(function(shelters) {
          if (shelters.length < 2) { // This means they only have "None" locally
            $ionicPopup.alert({
              title: 'Going Disconnected',
              cssClass: "text-center",
              template: 'If you plan on using VIDA disconnected, make sure you sync ' +
              'up to the server to have all the latest information!'
            });
          }
        }));
      }

      networkService.setDisconnected($scope.b_disconnected);
      VIDA_localDB.queryDB_update_settings();

      $rootScope.$broadcast('connectionStatusChanged', $scope.b_disconnected);

        // refresh (since local ID in DB and server can differ)
      peopleService.searchForPerson(networkService.getPeopleURL(), peopleService.getStoredSearchQuery(), function(){},
        function() {
          // Did not return correctly, could not contact server, etc. = reset list.
          peopleService.resetPersonList();
        });
    };

    $scope.downloadThumbnails = function(peopleFromServer) {
      // This function will pull a picture down from the server and put it to disk
      var promise = $q.defer();
      var imagesDownloaded = 0, pIndex = 0;

      peopleService.getAllPeopleInDatabase().then(function(peopleInDatabase) {
        if (peopleFromServer.length > 0 ) {
          for (var i = 0; i < peopleFromServer.length; i++) {
            if (peopleFromServer[i].pic_filename !== "" && peopleFromServer[i].pic_filename !== null) {
              var thumbnail = peopleFromServer[i].pic_filename;

              if (!thumbnail.contains('_thumb')) {
                var filename = thumbnail.split('.');
                var extension = filename[1];
                thumbnail = filename[0] + '_thumb.' + extension;
              }

              // Attempt to download that picture
              peopleService.downloadPersonalImage(thumbnail, function (downloaded_image) {
                // Successful
                if (downloaded_image === true) {
                  imagesDownloaded++;
                }

                pIndex++;

                if (pIndex === peopleFromServer.length) {
                  promise.resolve(imagesDownloaded);
                }
              }, function (error) {
                // Not successful
                console.log("PROBLEM");
                console.log(error);
                pIndex++;

                if (pIndex === peopleFromServer.length) {
                  promise.resolve(imagesDownloaded);
                }
              });
            } else {
              // No picture on file
              pIndex++;

              if (pIndex === peopleFromServer.length) {
                promise.resolve(imagesDownloaded);
              }
            }
          }
        } else {
          // No people on server just yet -- passthrough
          promise.resolve(imagesDownloaded);
        }
      });

      return promise.promise;
    };

    $scope.updateSyncDatabase = function() {
      var dirtyArr = [];
      var allPeople = [];
      var peopleUpdated = 0, peopleUploaded = 0, sheltersAdded = 0, imagesDownloaded = 0, sheltersRemoved = 0;

      var taskOne_UploadFromDatabase = function () {
        // FIRST TASK: See if anything in the database needs to be uploaded/updated
        VIDA_localDB.queryDB_select('people', '*', function (results) {
          for (var d = 0; d < results.length; d++) {
            if (Number(results[d].isDirty) == true) {
              dirtyArr.push(results[d]);
            }
          }

          var numPeopleToUpload = dirtyArr.length;
          var numPeopleUploaded = 0;

          if (numPeopleToUpload > 0) {
            // Start!
            $cordovaProgress.showSimpleWithLabelDetail(true, 'Syncing', 'Syncing entries in database with server..');
            var isOnServer = false;
            var whereAt = '';

            // Type/Value can update any column with any info
            var isDirtyForDB = [{
              type: 'isDirty',
              value: 0
            }];

            for (var i = 0; i < dirtyArr.length; i++) {
              // For each person that needs to be *updated*, fix them in the DB,
              //    or see if there are in the DB at all
              for (var j = 0; j < allPeople.length; j++) {
                if (dirtyArr[i].uuid == allPeople[j].uuid) {
                  isOnServer = true;

                  // Assume database version is newer, upload that to server
                  dirtyArr[i].id = allPeople[j].id; // ID from DB won't correlate with ID from Server
                  $scope.uploadPerson_UpdateSync(dirtyArr[i], isOnServer, function () {
                    peopleUpdated++; // used to track at the end
                    numPeopleUploaded++;

                    if (numPeopleUploaded >= numPeopleToUpload) {
                      // END FIRST TASK
                      $cordovaProgress.hide();

                      // START SECOND TASK
                      taskTwo_RefreshDatabase();
                    }
                  });

                  // Update isDirty to 0 regardless (needed?)
                  whereAt = 'uuid=\"' + dirtyArr[i].uuid + '\"';
                  VIDA_localDB.queryDB_update('people', isDirtyForDB, whereAt);
                }
              }

              // Person is not in the server DB at all
              if (!isOnServer) {
                // Upload person to server
                $scope.uploadPerson_UpdateSync(dirtyArr[i], isOnServer, function () {
                  peopleUploaded++; // used to track at the end
                  numPeopleUploaded++;

                  if (numPeopleUploaded >= numPeopleToUpload) {
                    // END FIRST TASK
                    $cordovaProgress.hide();

                    // START SECOND TASK
                    taskTwo_RefreshDatabase();
                  }
                });

                // Update isDirty on localDB to 0
                whereAt = 'uuid=\"' + dirtyArr[i].uuid + '\"';
                VIDA_localDB.queryDB_update('people', isDirtyForDB, whereAt);
              }
            }
          } else {
            // Don't need to do this task
            taskTwo_RefreshDatabase();
          }
        });
      };

      var taskTwo_RefreshDatabase = function () {
        // SECOND TASK: Refresh Database with everyone from server
        // TODO: Translate
        $cordovaProgress.showSimpleWithLabelDetail(true, "Syncing", "Refreshing Database..");
        var amountOfPeople = 0, InsertID = 1;

        // This will remove all entries in the database.
        // This can be useful if the server resets the database, and the user wants a clean DB on the phone.
        VIDA_localDB.queryDB_deleteAllEntries('people', function () {

          if (allPeople.length > 0) {
            // Add all people from server to database
            for (var i = 0; i < allPeople.length; i++) {

              $scope.insertPersonLocalDatabase(InsertID, allPeople[i], function () {
                amountOfPeople++;
                if (amountOfPeople >= allPeople.length) {
                  // END SECOND TASK
                  $cordovaProgress.hide();

                  // START THIRD TASK
                  taskThree_DownloadThumbnails();
                }
              });

              InsertID++;
            }
          } else {
            // END SECOND TASK
            $cordovaProgress.hide();

            // START THIRD TASK
            taskThree_DownloadThumbnails();
          }
        });
      };

      var taskThree_DownloadThumbnails = function () {
        // Get all thumbnails
        $cordovaProgress.showSimpleWithLabelDetail(true, 'Syncing', 'Downloading Thumbnails..');
        $scope.downloadThumbnails(allPeople).then(function (_imagesDownloaded) {
          imagesDownloaded = _imagesDownloaded;
          
          // END THIRD TASK
          $cordovaProgress.hide();

          // START FOURTH TASK
          taskFour_UpdateShelterList();
        });
      };

      var taskFour_UpdateShelterList = function () {

        var endFourthTask = function() {
          // END FOURTH TASK
          $cordovaProgress.hide();

          // START FIFTH TASK
          taskFive_ShowPostSyncScreen();
        };

        // THIRD TASK: Update shelter list
        // TODO: Translate
        $cordovaProgress.showSimpleWithLabelDetail(true, "Syncing", "Syncing with shelters on server..");
        shelterService.getAllSheltersWithPromise().then(function (allShelters) {

          // Loop through shelters.
          var localShelters = shelterService.getAllLocalShelters();
          var prevAmountShelters = localShelters.length - 1; // Account for "None"

          if (allShelters.length <= 0) {
            // No shelters on server. Check for any shelters on local DB
            if (localShelters.length > 1) { // None is technically a shelter
              for (var l = 1; l < localShelters.length; l++) {
                shelterService.removeShelterByUUID(localShelters[l].uuid);
              }
            }

            endFourthTask();
          } else {
            // Remove all shelters in DB, and add all new
            VIDA_localDB.queryDB_deleteAllEntries('shelters', function() {

              localShelters = [];
              shelterService.clearShelters();
              shelterService.addShelter(optionService.getDefaultShelterData(), false); // add None
              for (var i = 0; i < allShelters.length; i++) {
                shelterService.addShelter(allShelters[i], true);
              }

              sheltersAdded = allShelters.length - prevAmountShelters;

              if (sheltersAdded < 0) {
                // Shelter(s) were removed!
                sheltersRemoved = Math.abs(sheltersAdded);
                sheltersAdded = 0;
              }

              $rootScope.$broadcast('updateShelterList');

              // Update search screen because it will hold the old results (old pictures, info, etc.)
              peopleService.refreshSearchQuery(function() {
                endFourthTask();
              }, function() {
                endFourthTask();
              });
            });
          }
        });
      };

      var taskFive_ShowPostSyncScreen = function () {
        $scope.resetSyncButton();

        var resultsString = "People uploaded: " + peopleUploaded + "<br>" +
          "People updated: " + peopleUpdated + "<br>" +
          "Thumbnails downloaded: " + imagesDownloaded + "<br>" +
          "Shelters added: " + sheltersAdded + "<br>";

        if (sheltersRemoved > 0) {
          resultsString += "Shelters removed: " + sheltersRemoved + "<br>";
        }

        // TODO: Translate
        $ionicPopup.alert({
          title: "Sync Complete!",
          cssClass: "text-center",
          template: resultsString
        });
      };

      // Init Check
      // Check to see if the server is available
      if (!isDisconnected) {
        // TODO: Translate
        $cordovaProgress.showSimpleWithLabelDetail(true, 'Syncing', 'Connecting to the server..');

        peopleService.getAllPeopleWithReturn(function (peopleFromServer) {
          allPeople = peopleFromServer;
          $cordovaProgress.hide();

          taskOne_UploadFromDatabase();
        }, function (error) {
          $cordovaToast.showShortBottom(error);
          $cordovaProgress.hide();
        });
      } else {
        // TODO: Translate
        $cordovaToast.showLongBottom('Not connected to the server!');
        $cordovaProgress.hide();
      }
    };

  // Init of Settings
  $cordovaProgress.showSimpleWithLabel(true, 'Loading settings..');

  $scope.checkAllDirtyEntries().then(function(allDirtyEntries) {
    $scope.updateSyncButton(allDirtyEntries.length);
    $cordovaProgress.hide();
  });

  $scope.language_options = optionService.getLanguageOptions();

  for(var i = 0; i < $scope.language_options.length; i++){
    if ($scope.language_options[i].value === networkService.getConfiguration().language){
      $scope.current_language = $scope.language_options[i];
    }
  }

  if ($scope.current_language === undefined)
    $scope.current_language = $scope.language_options[0];

  // Login controls
  $scope.credentials = {};
  $scope.loginAttempt = 0;
  $scope.curr_credentials = {};

  var doLogin = function(credentials, success, error){
    $scope.curr_credentials = networkService.getUsernamePassword();
    networkService.setAuthentication(credentials.username, credentials.password);
    var config = networkService.getAuthenticationHeader();

    $http.get(networkService.getAuthenticationURL(), config).then(function(xhr) {
      if (xhr.status === 200){
        success();
        $cordovaToast.showShortBottom(($filter('translate')('successfully_logged_in')));
      } else {
        networkService.setAuthentication($scope.curr_credentials.username, $scope.curr_credentials.password);
        error(xhr);
      }
    }, function(e) {
      if (e) {
        if (e.status === 401) {
          $cordovaToast.showShortBottom(($filter('translate')('error_wrong_credentials')));
        } else {
          $ionicPopup.alert({
            title: 'Error',
            template: $filter('translate')('error_connecting_server') + e.status + ": " + e.description
          });
        }
      }

      networkService.setAuthentication($scope.curr_credentials.username, $scope.curr_credentials.password);
      error(e);
    });
  };

  $scope.login = function() {
    // Request authorization
    if (($scope.credentials.username) && ($scope.credentials.password)) {
      $scope.loginAttempt++;
      $cordovaProgress.showSimpleWithLabelDetail(true, 'Login', "Attempting to login..");
      doLogin($scope.credentials,
        function() {
          // Success!
          $cordovaProgress.hide();
          VIDA_localDB.queryDB_update_settings();
          $scope.loginAttempt--;
        },
        function(error) {
          // Error!
          $cordovaProgress.hide();
          $scope.loginAttempt--;
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

.controller('loginCtrl', function($scope, $location, $http, networkService, $filter, $cordovaToast, VIDA_localDB,
                                $ionicPopup){
  console.log('---------------------------------- loginCtrl');

})

.controller('createCtrl', function($scope, $cordovaBarcodeScanner, uploadService, $location){
  $scope.changeWindow = function(url) {
    $location.path(url);
  };
})

.controller('ShelterSearchCtrl', function ($rootScope, $scope, $state, shelterService) {
  console.log("---- ShelterSearchCtrl");

  // Used as a single reference to which current MapLayer is being used.
  //  I had it as an array previously, but only one item was being referenced.
  //  If multiple map layers comes into play, I can put it back.
  //  So far tested well - will change if I run into any problems.
  var MapLayer = {};
  var leafletDirective = angular.element(document.body).injector().get('leafletData');

  $rootScope.$on('connectionStatusChanged', function() {
    $scope.refreshShelterMap();
  });

  $scope.refreshShelterMap = function() {
    $scope.checkDisconnected();     // Gets online/offline map
    $scope.showAllSheltersOnMap();  // Gets and stores shelters
  };

  $scope.checkDisconnected = function() {
    leafletDirective.getMap().then(function (thisMap) {
      // Remove previous layer (Connected Layer or Disconnected Layer)
      thisMap.removeLayer(MapLayer);

      // Add new layer to the map
      if (!isDisconnected) {
        // Connected Map
        $scope.showAllSheltersOnMap(); // refresh shelters!

        // Add URL based layer to map
        var defaultDirective = angular.element(document.body).injector().get('leafletMapDefaults');
        var defaults = defaultDirective.getDefaults();
        MapLayer = L.tileLayer(defaults.tileLayer, defaults.tileLayerOptions).addTo(thisMap);
      } else {
        // Disconnected Map
        var mapOptions = {maxZoom: 16, attribution: 'Offline Map', tms: true};
        MapLayer = new L.TileLayer.MBTiles('', mapOptions, mapDB).addTo(thisMap);
      }

    });

    return true; // Always display map
  };

  $scope.showAllSheltersOnMap = function() {
    shelterService.getAll().then(function (shelters) {
      // clear the markers object without recreating it
      for (var variableKey in $rootScope.markers) {
        if ($rootScope.markers.hasOwnProperty(variableKey)) {
          delete $rootScope.markers[variableKey];
        }
      }

      console.log("---- got all shelters: ", shelters);
      for (var i = 1; i < shelters.length; i++) { // Starting at 1 because "None"
        var shelter = shelters[i];

        // look for 'point' in wkt and get the pair of numbers in the string after it
        var trimParens = /^\s*\(?(.*?)\)?\s*$/;
        var coordinateString = shelter.geom.toLowerCase().split('point')[1].replace(trimParens, '$1').trim();
        var tokens = coordinateString.split(' ');
        var lng = parseFloat(tokens[0]);
        var lat = parseFloat(tokens[1]);
        var coord = shelterService.getLatLng(shelter.id);
        if (coord.lat === -1111 && coord.lng === -1111)
          coord.lat = lat; coord.lng = lng;
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
  };

  // Do on startup!
  leafletDirective.getMap().then(function (thisMap) {
    thisMap.eachLayer(function(layer){
      // Since it's on startup, the only map layer will
      //   be the initialized URL-based map from Leaflet
      MapLayer = layer;
    });

    // Port of Spain
    var default_lon = -61.45;
    var default_lat = 10.65;
    var default_zoom = 0;

    var latLng = {lat: default_lat, lon: default_lon};

    thisMap.setView(latLng, default_zoom);
  });
  $scope.showAllSheltersOnMap();
})

.controller('ShelterDetailCtrl', function ($scope, $state, $stateParams, shelterService, $rootScope, shelter) {
  console.log("---- ShelterDetailCtrl. shelter id: ", $stateParams.shelterId, shelterService.getByIdOnline($stateParams.shelterId));
  $scope.shelterService = shelterService;
  $scope.shelter = shelter;
  $scope.latlng = shelterService.getLatLngFromShelter($scope.shelter);

  $rootScope.$on('changedShelter', function(event, param) {
      $scope.shelter = param;
    });

  if ($scope.latlng.lat === -1111 && $scope.latlng.lng === -1111) {
    // Shelter is not on server, it's only on the database. Get correct geom
    var shelters = shelterService.getAllLocalShelters();
    for (var i = 0; i < shelters.length; i++) {
      if (shelters[i].id === $stateParams.shelterId){
        var trimParens = /^\s*\(?(.*?)\)?\s*$/;
        var coordinateString = shelters[i].geom.toLowerCase().split('point')[1].replace(trimParens, '$1').trim();
        var tokens = coordinateString.split(' ');
        var lng = parseFloat(tokens[0]);
        var lat = parseFloat(tokens[1]);
        $scope.latlng = {lat: lat, lng: lng};
      }
    }
  }

  $rootScope.buttonBack = function() {
    // Put edit/delete buttons back
    var tabs = document.getElementsByClassName("tab-item");
    for (var i=0; i < tabs.length; i++) {
      tabs[i].setAttribute('style', 'display: none;');
    }

    var backButton = document.getElementsByClassName("button-person-back");
    var editDeleteButtons = document.getElementsByClassName("button-person-edit");
    for (i=0; i < editDeleteButtons.length; i++) {
      editDeleteButtons[i].setAttribute('style', 'display: block;');    // Enables buttons
    }
    for (i=0; i < backButton.length; i++) {
      backButton[i].setAttribute('style', 'display: none;');   // Remove button
    }

    window.history.back();
  };

  $scope.$on("$destroy", function(){
    var backButton = document.getElementsByClassName("button-person-back");

    for (i=0; i < backButton.length; i++) {
      backButton[i].setAttribute('style', 'display: none;');   // Remove button
    }
  });

  $scope.buttonShelterHome = function() {
    shelterService.getAll();

    var tabs = document.getElementsByClassName("tab-item");
    for (var i=0; i < tabs.length; i++) {
      tabs[i].setAttribute('style', 'display: block;');
    }

    var backButton = document.getElementsByClassName("button-person-back");
    var editDeleteButtons = document.getElementsByClassName("button-person-edit");
    var saveCancelButtons = document.getElementsByClassName("button-person-post-edit");

    for (i=0; i < saveCancelButtons.length; i++) {
      saveCancelButtons[i].setAttribute('style', 'display: none;');  // remove buttons
    }
    for (i=0; i < editDeleteButtons.length; i++) {
      editDeleteButtons[i].setAttribute('style', 'display: none;');    // remove buttons
    }
    for (i=0; i < backButton.length; i++) {
      backButton[i].setAttribute('style', 'display: none;');   // Remove button
    }

    $state.go('vida.shelter-search');
  };
});