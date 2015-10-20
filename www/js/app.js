// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'vida' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'vida.services' is found in services.js
// 'vida.controllers' is found in controllers.js
// 'vida.services' is found in services.js
angular.module('vida', ['ionic', 'ngCordova', 'vida.controllers', 'vida.directives', 'vida.services'])

.run(function($ionicPlatform, $window) {
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

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

    .state('page1', {
      url: '/tabs',
      templateUrl: 'page1.html',
      controller: 'createCtrl'
    })

    .state('page2', {
      url: '/login',
      templateUrl: 'page2.html',
      controller: 'loginCtrl'
    })

    .state('person_detail', {
      url: '/tabs/person',
      templateUrl: 'page3.html',
      controller: 'createCtrl'
    })
    ;

  // if none of the above states are matched, use this as the fallback

  $urlRouterProvider.otherwise('/login');
});