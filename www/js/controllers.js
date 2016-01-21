angular.module('vida.controllers', ['ngCordova.plugins.camera', 'pascalprecht.translate'])


.controller('AppCtrl', function($rootScope, $scope, $ionicModal, $timeout, shelterService, $translate, VIDA_localDB, networkService) {
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

  // Set values from DB on startup
  VIDA_localDB.queryDB_select('configuration', 'settings', function (results) {
    if (results.length > 0) {
      var DBSettings = JSON.parse(results[0].settings);
      networkService.SetConfigurationFromDB(DBSettings);
    }
  });
})

.controller('PersonSearchCtrl', function($scope, $location, $http, peopleService, networkService, uploadService, $filter,
                                         $cordovaToast, $cordovaBarcodeScanner, $cordovaCamera, $cordovaProgress, $cordovaActionSheet) {
    $scope.searchText = '';
    $scope.searchRequestCounter = 0;
    $scope.totalDisplayed = 100;
    $scope.peopleService = peopleService;
    $scope.networkService = networkService;
    $scope.allPeopleInShelter = peopleService.getPeopleInShelter();

    // TODO: Infinite Scrolling - not finished
    ////////////
    $scope.loadMorePeople = function() {
      console.log("doesn't get into this function yet");

      $scope.totalDisplayed += 20;

      if ($scope.totalDisplayed >= $scope.allPeopleInShelter.length)
        $scope.totalDisplayed = $scope.allPeopleInShelter.length;

      $scope.$broadcast('scroll.infiniteScrollComplete');
    };

    $scope.moreDataCanBeLoaded = function() {
      if ($scope.allPeopleInShelter.length > 0)
        return $scope.totalDisplayed < $scope.allPeopleInShelter.length;

      return false;
    };
    ////////////

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
            alert(error);
          } else {
            // TODO: Translate
            $cordovaToast.showShortBottom("Error: Network timed out. Please check your internet connection.");
          }
          $scope.searchRequestCounter--;
      });
    };

    $scope.changeWindow = function(url) {
      if (!isDisconnected) {
        var IDOfPerson = url.split('/');

        peopleService.testPersonForNull(IDOfPerson[4], function () {
          $location.path(url);
        }, function () {
          $cordovaProgress.showSimpleWithLabelDetail("Not Found", "Person not found on server! Removing from list..");
          peopleService.removePersonFromList(IDOfPerson[4]);
          peopleService.searchForPerson(networkService.getPeopleURL(), peopleService.getStoredSearchQuery(), function() {
            $cordovaProgress.hide();
          }, function(err){
            $cordovaProgress.hide();
          });
        });
      } else {
        // TODO: Test to see if on DB
        $location.path(url);
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

      //peopleService.downloadPhotos(); //testing
    };

    console.log('---------------------------------- PersonSearchCtrl');
})

.controller('PersonDetailCtrl', function($scope, $location, $http, $stateParams, $state, $filter, shelter_array,
                                         peopleService, networkService, $rootScope, shelterService, $cordovaProgress,
                                         VIDA_localDB, optionService, uploadService){
  console.log('---------------------------------- PersonDetailCtrl');
  $scope.searchPersonRequest = 0;
  $scope.peopleService = peopleService;
  $scope.networkService = networkService;
  $scope.shelterService = shelterService;
  $scope.personPhoto = null;
  $scope.isDisconnected = isDisconnected; // used for saving locally button

  //TODO - known bug: Goto shelter will appear on "None" - fixed? need to test
  $scope.setupShelterButton = function() {
    if (shelter_array) {
      var shelterID = peopleService.getRetrievedPersonByID().shelter_id;
      var wasSet = false;
      for (var i = 0; i < shelter_array.length; i++) {
        if (shelter_array[i].value === shelterID) {
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
  };

  $scope.goToShelterDetail = function() {
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

  var createPersonObj = function(ID, person) {
    var person_info_indexing = optionService.getPersonToDBInformation();
    var isDirty = 1; // Just created, should be dirty
    var isDeleted = 0;
    var obj = (ID).toString() + ", '" + peopleService.getRetrievedPersonByID().uuid + "', " + isDirty + ", " + isDeleted + ", ";
    for (var k = 0; k < person_info_indexing.length; k++) {
      obj += "'" + peopleService.getRetrievedPersonByID()[person_info_indexing[k]] + "'";
      if (k < person_info_indexing.length - 1)
        obj += ", ";
    }
  };

  $scope.SaveOutPerson = function() {
    var ID = 0;
    var obj_toSaveOut = {};

    // See if person is in DB, if they are: update them. else: insert them.
    var whereAt = {};
    whereAt.restriction = 'EXACT';
    whereAt.column = 'uuid';
    whereAt.value = '\"' + peopleService.getRetrievedPersonByID().uuid + '\"';
    VIDA_localDB.queryDB_select('people', '*', function(results) {
      if (results.length > 0) {
        // There should only be one person returned, so results[0] will always be valid (through UUID)

        // Update person
        obj_toSaveOut = createPersonObj(results[0].id, peopleService.getRetrievedPersonByID());
        VIDA_localDB.queryDB_update('people', obj_toSaveOut, whereAt);
      } else {
        // Seperate call to DB, this will get EVERYONE in list, as opposed to one person's UUID
        // This is done to create accurate ID (in DB) to insert into
        VIDA_localDB.queryDB_select('people', '*', function(results) {
          ID = results.length + 1;
          obj_toSaveOut = createPersonObj(ID, peopleService.getRetrievedPersonByID());
          VIDA_localDB.queryDB_insert('people', obj_toSaveOut);
        });
      }
    }, whereAt);
  };

  // Initial Commands
  $scope.setupEditDeleteButtons();
  peopleService.searchPersonByID($stateParams.personId, // Will initiate search
    function() {
      // Success
      $scope.searchPersonRequest--;
      $scope.setupShelterButton();
    }, function(error){
      // Error
      $scope.searchPersonRequest--;
    });
  $scope.searchPersonRequest++;

  // Functions
  $rootScope.buttonPersonEdit = function() {
    console.log('PersonDetailCtrl - buttonPersonEdit()');

    // TODO: Translate
    $cordovaProgress.showSimpleWithLabelDetail(true, "Loading", "Loading details of " + peopleService.getRetrievedPersonByID().given_name);
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
          console.log("Something went wrong with deleting person..");
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

.controller('PersonDetailEditCtrl', function($scope, $state, $rootScope, $stateParams, $http, peopleService, shelter_array, $cordovaToast,
                                             networkService, $filter, $cordovaActionSheet, $cordovaCamera, optionService, shelterService, $cordovaProgress) {
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

      $http.get(URL, networkService.getAuthenticationHeader()).then(function(xhr) {
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

    $scope.shelter_array = shelter_array; // setup through app.js - vida.person-create - resolve
    if ($scope.shelter_array) {
      // Look at person and see what shelter they are assigned to
      var isAssigned = false;
      for (var j = 0; j < shelter_array.length; j++) {
        if (person.shelter_id === shelter_array[j].value) {
          $scope.current_shelter = $scope.shelter_array[j];
          isAssigned = true;
          break;
        }
      }

      if (!isAssigned) {
        $scope.current_shelter = $scope.shelter_array[0];
      }
    } else {
      var array = [{
        name: 'None',
        value: '',
        id: 0
      }]; // temp fix
      $scope.current_shelter = array[0];
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

  $scope.changeGender = function() {
    $scope.current_gender = this.current_gender;
  };

  $scope.changeInjury = function() {
    $scope.current_injury = this.current_injury;
  };

  $scope.changeNationality = function() {
    $scope.current_nationality = this.current_nationality;
  };

  $scope.changeShelter = function() {
    $scope.current_shelter = this.current_shelter;
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
    var shelterElement      = document.getElementById('shelter');
    doc.shelter_id          = shelter_array[shelterElement.selectedIndex].value;

    doc.photo               = document.getElementById('personal_photo').src;
  };

  $rootScope.buttonPersonSave = function() {
    var person = peopleService.getRetrievedPersonByID();

    var documentValues = {}; // Used to only retrieve once
    $scope.setupDocumentValues(documentValues);

    var changedPerson = {};
    changedPerson.uuid = person.uuid; //used for disconnected reference
    var saveFields = checkFields;
    saveFields.push('gender', 'injury', 'nationality', 'shelter_id');

    for (var i = 0; i < saveFields.length; i++) {
      changedPerson[saveFields[i]] = ((person[saveFields[i]] !== documentValues[saveFields[i]])) ? documentValues[saveFields[i]] : undefined;
    }
    // specific case
    changedPerson.photo = ((networkService.getFileServiceURL() + person.pic_filename + '/download/') !== documentValues.photo) ? documentValues.photo : undefined;
    if (changedPerson.photo === peopleService.getPlaceholderImage())
      changedPerson.photo = undefined;

    changedPerson.id = person.id;

    // Show loading dialog
    // TODO: Translate
    $cordovaProgress.showSimpleWithLabelDetail(true, "Saving", "Saving changes to " + person.given_name);
    $scope.saveChangesRequest++;
    peopleService.editPerson_saveChanges(changedPerson, function(success) {
      // Success
      $scope.saveChangesRequest--;
      $cordovaProgress.hide();
      // TODO: Translate
      $cordovaProgress.showSimpleWithLabelDetail(true, "Complete", "Changes saved! Returning to details..");
      peopleService.searchPersonByID(peopleService.getRetrievedPersonByID().id, function() {  // This will reload the person in details
        var prevSearchQuery = peopleService.getStoredSearchQuery();
        var shelterID = peopleService.getRetrievedPersonByID().shelter_id;
        var wasSet = false;
        for (var i = 0; i < shelter_array.length; i++) {
          if (shelter_array[i].value === shelterID){
            shelterService.setCurrentShelter(shelter_array[i]);
            shelterService.getAll();
            wasSet = true;
            break;
          }
        }
        if (!wasSet)
          shelterService.setCurrentShelter('None');
        peopleService.searchForPerson(networkService.getSearchURL(), prevSearchQuery, function() {
          // will successfully reload
          $state.go('vida.person-search.person-detail');
          $cordovaProgress.hide();
        }, function() {
          // will not successfully reload
          $state.go('vida.person-search.person-detail');
          $cordovaProgress.hide();
          // TODO: Translate
          $cordovaToast.showShortBottom('Something went wrong. Please check your connection.');
        }); // This will reload search query
      }, function() {

      });
    }, function(error) {
      // Error
      //TODO: SHOW ERROR
      $scope.saveChangesRequest--;
      $state.go('vida.person-search.person-detail');
      $cordovaProgress.hide();
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
  $cordovaProgress.hide();
})

.controller('PersonCreateCtrl', function($scope, $location, $http, $cordovaCamera, $cordovaActionSheet, $filter, $ionicModal,
                                         $cordovaToast, $cordovaBarcodeScanner, peopleService, uploadService, networkService,
                                          optionService, $q, shelter_array, $cordovaProgress, VIDA_localDB){
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

    $cordovaProgress.hide();

    $scope.shelter_array = shelter_array; // setup through app.js - vida.person-create - resolve
    if ($scope.shelter_array) {
      $scope.current_shelter = $scope.shelter_array[0];
    }

    // Helper function
    var fixUndefined = function(str){
      return str === undefined ? "" : str;
    };

    $scope.savePerson = function() {
      if ($scope.person.given_name !== undefined) {

        var Status = "";

        var Gender;
        if ($scope.current_gender !== undefined) {
          Gender = $scope.current_gender.value;
        }

        var Injury;
        if ($scope.current_injury !== undefined) {
          Injury = $scope.current_injury.value;
        }

        var Nationality;
        if ($scope.current_nationality !== undefined) {
          Nationality = $scope.current_nationality.value;
        }

        var ShelterID;
        if ($scope.current_shelter !== undefined) {
          ShelterID = $scope.current_shelter.value;
        }

        var Photo;
        if ($scope.person.photo !== undefined) {
          Photo = $scope.person.photo;
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
        newPerson.status              = fixUndefined(Status);
        newPerson.phone_number        = fixUndefined($scope.person.phone_number);
        newPerson.injury              = Injury; // will always be defined
        newPerson.nationality         = Nationality; // will always be defined
        newPerson.uuid                = optionService.generate_uuid4();

        // This is here to store photo for upload
        newPerson.photo               = Photo;  // photo being undefined is checked


        // Check for duplicates based on UUID
        var duplicate = false;
        var peopleInShelter = peopleService.getPeopleInShelter();
        for (var i = 0; i < peopleInShelter.length; i++) {
          if (peopleInShelter[i].uuid === newPerson.uuid) {
            duplicate = true;
            break;
          }
        }

        // TODO: Translate
        $cordovaProgress.showSimpleWithLabelDetail(true, "Saving", "Saving and uploading information for " + newPerson.given_name);

        if (!duplicate) {
          if (newPerson.photo) {
            $scope.uploadPhoto(newPerson, function(){
              // On successful upload of Photo, this assigns the photo to the person
              $scope.uploadPerson(newPerson);
              $cordovaProgress.hide();
            });
          } else {
            // On non-successful upload of Photo, the person's info will only be uploaded
            $scope.uploadPerson(newPerson);
            $cordovaProgress.hide();
          }
        } else {
          $cordovaToast.showShortBottom($filter('translate')('dialog_person_exists'));
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

    $scope.uploadPhoto = function(newPerson, success) {
      uploadService.uploadPhotoToUrl(newPerson.photo, networkService.getFileServiceURL(), function (data) {
        // Success
        //$cordovaToast.showShortBottom($filter('translate')('dialog_photo_uploaded') + newPerson.given_name + '!');
        newPerson.pic_filename = data.name;
        success();
      }, function () {
        // Error uploading photo
      });
    };

    $scope.uploadPerson = function(newPerson) {
      if (!isDisconnected) {
        // Upload person to fileService
        uploadService.uploadPersonToUrl(newPerson, networkService.getAuthenticationURL(), function () {
          // Successful entirely
          $cordovaToast.showShortBottom(newPerson.given_name + $filter('translate')('dialog_person_uploaded'));
          $scope.addPersonToLocalDatabase(newPerson);
        }, function (error) {
          // Error uploading person
          // TODO: Double translate
          if (error)
            $cordovaToast.showShortBottom("Error uploading person: " + error.error_message);
          else
            $cordovaToast.showShortBottom("Uploading " + newPerson.given_name + " failed! Please check your connection.")
        });
      } else {
        // Add person to local database (Creation)
        $scope.addPersonToLocalDatabase(newPerson);
      }
    };

    $scope.addPersonToLocalDatabase = function(newPerson){
      var localPerson = newPerson; // made for a-sync reference

      VIDA_localDB.queryDB_select('people', '*', function(results){
        var ID = results.length + 1;
        var isDirty = 1; // Just created, should be dirty
        var isDeleted = 0;
        var obj = (ID).toString() + ", '" + localPerson.uuid + "', " + isDirty + ", " + isDeleted + ", ";
        var person_info_indexing = optionService.getPersonToDBInformation();
        for (var k = 0; k < person_info_indexing.length; k++) {
          obj += "'" + localPerson[person_info_indexing[k]] + "'";

          if (k < person_info_indexing.length - 1)
            obj += ", ";
        }

        VIDA_localDB.queryDB_insert('people', obj, function() {
          // TODO: Translate
          $cordovaToast.showShortBottom('Added ' + localPerson.given_name + ' locally!');
        });
      });
    };

    $scope.updateListOfPeople = function(success) {
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

    $scope.changeShelter = function() {
      $scope.current_shelter = this.current_shelter;
    };

    // Used for getting shelter dropdowns before page is loaded
    $scope.refreshShelters = function() {
      var shelters = $q.defer();
      var array = [{
        name: 'None',
        value: '',
        id: 0
      }];
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
              array.push({
                name: data.objects[i].name,
                value: data.objects[i].uuid,
                id: data.objects[i].id
              });
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

.controller('ShelterSearchCtrl', function($scope, $location, $http){
  console.log('---------------------------------- ShelterSearchCtrl');

  //TODO: Add disconnected support to shelters
})

.controller('SettingsCtrl', function($scope, $location, peopleService, optionService, VIDA_localDB, $cordovaToast, $filter,
                                     networkService, $translate, $cordovaProgress, $cordovaNetwork, uploadService){
  console.log('---------------------------------- SettingsCtrl');

    $scope.networkAddr = networkService.getServerAddress();
    $scope.b_disconnected = isDisconnected;

  // Functions
    $scope.logout = function(url) {
      // Can go directly to '/login'
      $location.path(url);
    };

    $scope.saveServerIP = function(IP) {
      // TODO: Translate
      $cordovaProgress.showSimpleWithLabel(true, "Saving", "Saving settings..");
      networkService.setServerAddress(IP);

      VIDA_localDB.queryDB_update_settings(function() {
        $cordovaProgress.hide();
      });
    };

    $scope.switchLanguage = function() {
      // TODO: Translate
      $cordovaProgress.showSimpleWithLabel(true, "Saving", "Saving settings..");

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

    // Init
    $scope.language_options = optionService.getLanguageOptions();

    for(var i = 0; i < $scope.language_options.length; i++){
      if ($scope.language_options[i].value === networkService.getConfiguration().language){
        $scope.current_language = $scope.language_options[i];
      }
    }

    if ($scope.current_language === undefined)
      $scope.current_language = $scope.language_options[0];

    // Test Show From DB
    $scope.show_configuration_from_db = function() {
      VIDA_localDB.queryDB_select('configuration', 'settings', function(results){
        console.log(results);
      });
    };

  //TODO: copying for testing purposes, should move to uploadService?
  $scope.uploadPerson = function(newPerson, isUpdating) {
    if (!isUpdating) {
      // Upload person to fileService
      uploadService.uploadPersonToUrl(newPerson, networkService.getAuthenticationURL(), function () {
        // Successful entirely
        $cordovaToast.showShortBottom(newPerson.given_name + $filter('translate')('dialog_person_uploaded'));
      }, function () {
        // Error uploading person
        console.log('error uploading person');
      });
    } else {
      uploadService.updatePerson(newPerson, function() {
        console.log("updatePerson - updated " + newPerson.given_name + " on server successfully!")
      }, function() {
        console.log("uploadPerson - updatePerson error");
      });
    }
  };

    $scope.changeDisconnected = function() {
      if (!$scope.b_disconnected) {
        $scope.b_disconnected = true;
      } else
        $scope.b_disconnected = false;

      isDisconnected = $scope.b_disconnected;

      // refresh (since local ID in DB and server can differ)
      peopleService.searchForPerson(networkService.getPeopleURL(), peopleService.getStoredSearchQuery());
    };

    $scope.testDeletedEntries = function() {
      var where = {};
      where.restriction = 'EXACT';
      where.column = 'deleted';
      where.value = 1;
      VIDA_localDB.queryDB_select('people', '*', function(results){
        var allPeople = [];
        for (var i = 0; i < results.length; i++) {
          allPeople.push(results[i]);
        }
        console.log("All people marked as deleted: ");
        console.log(allPeople);
      }, where);
    };

    $scope.testNetwork = function() {
      var myNetwork = $cordovaNetwork.getNetwork();
      console.log(myNetwork);
      console.log('isDisconnected: ' + isDisconnected);

      if (myNetwork == Connection.UNKNOWN)
        console.log("UNKNOWN connection");
      else if (myNetwork == Connection.ETHERNET)
        console.log("ETHERNET connection");
      else if (myNetwork == Connection.WIFI)
        console.log("WIFI connection");
      else if (myNetwork == Connection.CELL_2G)
        console.log("CELL_2G connection");
      else if (myNetwork == Connection.CELL_3G)
        console.log("CELL_3G connection");
      else if (myNetwork == Connection.CELL_4G)
        console.log("CELL_4G connection");
      else if (myNetwork == Connection.NONE)
        console.log("NONE connection");
    };

    $scope.updateSyncDatabase = function() {
      var cleanArr = [];
      var dirtyArr = [];

      // FIRST TASK: See if anything in the database needs to be synced
      // TODO: Translate
      $cordovaProgress.showSimpleWithLabelDetail(true, 'Syncing', 'Syncing entries in database with server..');

      VIDA_localDB.queryDB_select('people', '*', function(results){
        for (var i = 0; i < results.length; i++){
          if (Number(results[i].isDirty) == true){
            dirtyArr.push(results[i]);
          } else {
            cleanArr.push(results[i]);
          }
        }

        // Check to see if the server is available
        if (!isDisconnected) {
          peopleService.getAllPeopleWithReturn(function(allPeople){
            // Successful!

            // Type/Value can update any column with any info
            var isDirtyForDB = [{
              type: 'isDirty',
              value: 0
            }];

            var isOnServer = false;
            var whereAt = '';
            for (var i = 0; i < dirtyArr.length; i++) {

              // For each person that needs to be *updated*, fix them in the DB,
              //    or see if there are in the DB at all
              for (var j = 0; j < allPeople.length; j++) {
                if (dirtyArr[i].uuid == allPeople[j].uuid){
                  // TODO: Check which one is 'newer'

                  // Upload updated person
                  isOnServer = true;
                  dirtyArr[i].id = allPeople[j].id; // ID from DB won't correlate with ID from Server
                  $scope.uploadPerson(dirtyArr[i], isOnServer);

                  // Update isDirty to 0
                  whereAt = 'uuid=\"' + dirtyArr[i].uuid +'\"';
                  VIDA_localDB.queryDB_update('people', isDirtyForDB, whereAt);
                }
              }

              // Person is not in the server DB at all
              if (!isOnServer) {
                // Upload person to server
                $scope.uploadPerson(dirtyArr[i], isOnServer);

                // Update isDirty on localDB to 0
                whereAt = 'uuid=\"' + dirtyArr[i].uuid +'\"';
                VIDA_localDB.queryDB_update('people', isDirtyForDB, whereAt);
              }
            }
            // END FIRST TASK
            $cordovaProgress.hide();

            // SECOND TASK: Find who isn't in the DB and add them to the current DB
            // TODO: Translate
            $cordovaProgress.showSimpleWithLabelDetail(true, "Syncing", "Pulling down any people who aren't in the database..");
            var amountOfPeople = 0;

            VIDA_localDB.queryDB_select('people', '*', function(allPeopleInDB) {
              amountOfPeople = allPeopleInDB.length + 1; // + 1 to start at the next index

              // If someone isn't in the DB, insert them
              for (var i = 0; i < allPeople.length; i++) {
                var doContinue = false;

                for (var j = 0; j < allPeopleInDB.length; j++) {
                  if (allPeopleInDB[j].uuid === allPeople[i].uuid) {
                    //console.log("Found duplicate in database: " + allPeople[i]);
                    doContinue = true;
                    break;
                  }
                }

                // If doContinue is false, they were never found in the DB. Insert them.
                if (!doContinue) {
                  var isDirty = 0;
                  var isDeleted = 0;
                  var obj = (amountOfPeople).toString() + ", '" + allPeople[i].uuid + "', " + isDirty + ", " + isDeleted + ", ";
                  var person_info_indexing = optionService.getPersonToDBInformation();
                  for (var k = 0; k < person_info_indexing.length; k++) {
                    obj += "'" + allPeople[i][person_info_indexing[k]] + "'";

                    if (k < person_info_indexing.length - 1)
                      obj += ", ";
                  }

                  VIDA_localDB.queryDB_insert('people', obj);
                  amountOfPeople++;
                }
              }

              // TODO: Translate
              $cordovaToast.showLongBottom("Syncing complete!");
              $cordovaProgress.hide();
            });
            // END SECOND TASK

          }, function(error) {
            $cordovaToast.showLongBottom(error);
            $cordovaProgress.hide();
          });
        } else {
          // TODO: Translate
          $cordovaToast.showLongBottom('Not connected to the server!');
          $cordovaProgress.hide();
        }
      });
    };
})

.controller('loginCtrl', function($scope, $location, $http, networkService, $filter, $cordovaToast, VIDA_localDB){
  console.log('---------------------------------- loginCtrl');

  $scope.loginRequest = 0;
  $scope.credentials = {};

  var doLogin = function(credentials, success, error){
    networkService.setAuthentication(credentials.username, credentials.password);
    var config = networkService.getAuthenticationHeader();

    $http.get(networkService.getAuthenticationURL(), config).then(function(xhr) {
      if (xhr.status === 200){
        success();
      } else {
        error(xhr.status);
        alert(xhr.status);
      }
    }, function(e) {
      if (e) {
        if (e.status === 401) {
          $cordovaToast.showShortBottom(($filter('translate')('error_wrong_credentials')));
        } else {
          alert($filter('translate')('error_connecting_server') + e.status + ": " + e.description);
        }
      }

      error(e);
    });
  };

  $scope.login = function(url) {
    // Request authorization
    if (($scope.credentials.username) && ($scope.credentials.password)) {

      $scope.loginRequest++;
      doLogin($scope.credentials,
      function() {
        // Success!
        $location.path(url);
        VIDA_localDB.queryDB_update_settings();
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

.controller('ShelterDetailCtrl', function ($scope, $state, $stateParams, shelterService, $rootScope) {
  console.log("---- ShelterDetailCtrl. shelter id: ", $stateParams.shelterId, shelterService.getById($stateParams.shelterId));
    $scope.shelter = shelterService.getById($stateParams.shelterId);
    $scope.latlng = shelterService.getLatLng($stateParams.shelterId);

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
    }
});