// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'vida' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'vida.services' is found in services.js
// 'vida.controllers' is found in controllers.js
// 'vida.services' is found in services.js

var db = null;              // Will store non-globally once fully working
var mapDB = null;           // Will store non-globally once fully working
var isDisconnected = false; // Will store non-globally once fully working

angular.module('vida', ['ionic', 'ngCordova', 'vida.directives', 'vida.controllers', 'vida.services', 'leaflet-directive',
    'pascalprecht.translate', 'vida-translations-en', 'vida-translations-es', 'ngResource'])

.run(function($ionicPlatform, $window, $cordovaSQLite, networkService, optionService, DBHelper, $cordovaFile, $ionicPopup) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs).
    // The reason we default this to hidden is that native apps don't usually show an accessory bar, at
    // least on iOS. It's a dead giveaway that an app is using a Web View. However, it's sometimes
    // useful especially with forms, though we would prefer giving the user a little more room
    // to interact with the app.

    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }

    if (window.StatusBar) {
      // Set the statusbar to use the default style, tweak this to
      // remove the status bar on iOS or change it to use white instead of dark colors.
      StatusBar.styleDefault();
    }

    if (window.cordova){
      // ios/android testing
      if (!(window.cordova.plugins)){
          alert("window.cordova.plugins: " + window.cordova.plugins);
      } else {
        if (!(window.cordova.plugins.Keyboard)) {
          alert("window.cordova.plugins.Keyboard: " + window.cordova.plugins.Keyboard);
        }

        db = $cordovaSQLite.openDB({name: "localDB.db", location: 'default'});
        DBHelper.addDB('localDB', db);
        DBHelper.setCurrentDB('localDB');

        // Create configuration table
        var settings = [{column: 'settings', type: 'TEXT'}];
        DBHelper.createTableIfNotExists('configuration', settings);

        // Create shelters table
        var shelterTableValues = optionService.getDefaultShelterTableValues();
        DBHelper.createTableIfNotExists('shelters', shelterTableValues);

        // Create people Table
        var peopleTableValues = optionService.getDefaultPeopleTableValues();
        DBHelper.createTableIfNotExists('people', peopleTableValues);

        // Create offline photo directory
        $cordovaFile.createDir(cordova.file.dataDirectory, 'Photos/', {create: true});

        // File plugin, check to see if its at destination
        // if not at destination, move osm_va over to it
        var dbName = "osm_va.mbtiles";
        var dbLocation = cordova.file.applicationStorageDirectory;
        if (ionic.Platform.isAndroid())
          dbLocation += 'databases/';

        $cordovaFile.checkFile(dbLocation, dbName).then(function() {
          console.log("Found map in DB Location");
          // Found file
          mapDB = $cordovaSQLite.openDB({name: dbName, location: 'default'});
        }, function(err) {
          if (err.message === "NOT_FOUND_ERR") {
            $cordovaFile.checkFile(cordova.file.applicationDirectory + "www/databases/", dbName).then(function() {
              // Found file
              // Move osm_va.db to dbLocation
              $cordovaFile.copyFile(cordova.file.applicationDirectory + "www/databases/", dbName,
                dbLocation, dbName).then(function() {
                console.log("Found map in new DB Location");
                // Done and done
                mapDB = $cordovaSQLite.openDB({name: dbName, location: 'default'});
              }, function(error) {
                console.error("There was an error copying the database: " + error);
              });
            }, function(error) {
              console.error("There was an error finding the original map DB: " + error);
            });
          } else {
            console.error("There was an error finding the database: " + err);
          }
        });
      }

      if (!(navigator.camera)){
          alert("navigator.camera: " + navigator.camera);
      }
    } else {
      //alert("window.cordova: " + window.cordova);
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {

    // Used for getting shelter dropdowns before page is loaded
    var retrieveAllShelters = function(shelterService) {
      return shelterService.getAllLocalShelters();
    };

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  .state('login', {
    url: '/login',
    templateUrl: 'views/login.html',
    controller: 'loginCtrl'
  })


    // setup an abstract state for the vida directive
  .state('vida', {
    url: "/vida",
    abstract: true,
    templateUrl: "views/vida.html",
    controller: 'AppCtrl'
  })

  // Each tab has its own nav history stack:


  .state('vida.person-create', {
    url: '/person-create',
    views: {
      'view-person-create': {
        templateUrl: 'views/person-create.html',
        resolve: {
          shelter_array : function(shelterService) {
            return retrieveAllShelters(shelterService);
          }
        },
        controller: 'PersonCreateCtrl'
      }
    }
  })

  .state('vida.person-search', {
    url: '/person-search',
    views: {
      'view-person-search': {
        templateUrl: 'views/person-search.html',
        controller: 'PersonSearchCtrl'
      }
    }
  })

  .state('vida.person-search.person-detail', {
    url: "/person-detail/:personId",
    views: {
      'view-person-search@vida': {
        templateUrl: "views/person-detail.html",
        resolve: {
          shelter_array : function(shelterService) {
            return retrieveAllShelters(shelterService);
          }
        },
        controller: 'PersonDetailCtrl'
      }
    }
  })

  .state('vida.person-search.person-detail.person-edit', {
    url: "/person-edit",
    views: {
      'view-person-search@vida': {
        templateUrl: "views/person-create.html",
        resolve: {
          shelter_array : function(shelterService) {
            return retrieveAllShelters(shelterService);
          }
        },
        controller: 'PersonDetailEditCtrl'
      }
    }
  })

  .state('vida.shelter-search', {
    url: '/shelter-search',
    views: {
      'view-shelter-search': {
        templateUrl: 'views/shelter-search.html',
        controller: 'ShelterSearchCtrl'
      }
    }
  })

  .state('vida.shelter-search.shelter-detail', {
    url: '/shelter-detail/:shelterId',
    views: {
      'view-shelter-search@vida': {
        templateUrl: 'views/shelter-detail.html',
        controller: 'ShelterDetailCtrl'
      }
    }
  })

  .state('vida.settings', {
    url: '/settings',
    views: {
      'view-settings': {
        templateUrl: 'views/settings.html',
        controller: 'SettingsCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/vida/person-search');
})

.config(['$translateProvider', function ($translateProvider) {
  $translateProvider.preferredLanguage('en');
  $translateProvider.fallbackLanguage('en');
  $translateProvider.useSanitizeValueStrategy('sanitize');
}]);
