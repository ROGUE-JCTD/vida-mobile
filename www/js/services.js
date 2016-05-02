// Global Functions
function dataURLtoBlob(dataURI) {
  var binary = atob(dataURI.split(',')[1]);
  var array = [];
  for(var i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
}

// Helper function
function fixUndefined(str){
  return str === undefined ? "" : str;
}

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position){
    position = position || 0;
    return this.substr(position, searchString.length) === searchString;
  };
}

if(!String.prototype.contains) {
  String.prototype.contains = function(str, startIndex) {
    return -1 !== String.prototype.indexOf.call(this, str, startIndex);
  };
}

angular.module('vida.services', ['ngCordova', 'ngResource'])

.factory('httpRequestInterceptor', function(networkService) {
   return {
      request: function (config) {
        config.headers.Authorization = networkService.getBasicAuthentication();
        config.timeout = 45000;  //45s because of long face recognition request :(
        return config;
      }
    };
})

.config(function($interpolateProvider, $httpProvider, $resourceProvider) {
//  $interpolateProvider.startSymbol('{[');
//  $interpolateProvider.endSymbol(']}');

  //$httpProvider.defaults.xsrfCookieName = 'csrftoken';
  //$httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
  $httpProvider.interceptors.push('httpRequestInterceptor');
  $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
  //$httpProvider.defaults.headers.common['X-Auth-Token'] = undefined;

  $resourceProvider.defaults.stripTrailingSlashes = false;
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

.service('uploadService', function($http, networkService, optionService, $ionicPopup, $filter) {
  this.uploadPhotoToUrl = function(photo, uploadUrl, callSuccess, callFailure) {
    var photoBlob = dataURLtoBlob(photo);
    var formData = new FormData();
    formData.append("file", photoBlob, 'filename.jpg');

    $http.post(uploadUrl, formData, {
      transformRequest: angular.identity,
      headers: {
        'Content-Type': undefined,
        'Authorization': networkService.getAuthenticationHeader().headers.Authorization
      }
    }).success(function(data) {
      callSuccess(data);
    }).error(function(err) {
      if (err) {
        // if err is null, server not found?
        $ionicPopup.alert({
          title: 'Error',
          template: 'Photo not uploaded! Error: ' + err.error_message
        });
      }
      callFailure(err);
    });
  };

  this.updatePerson = function( person, callSuccess, callFailure ) {
    var JSONPerson = { };

    var uploadFields = optionService.getPersonUploadInfo( );

    for( var i = 0; i < uploadFields.length; i++ ) {
      if( person[ uploadFields[ i ] ] !== "" && person[ uploadFields[ i ] ] !== undefined
        && person[ uploadFields[ i ] ] !== "undefined" ) {
        JSONPerson[uploadFields[ i ]] = fixUndefined( person[ uploadFields[ i ] ] );
      }
    }
    
    JSONPerson = JSON.stringify( JSONPerson );

    $http.put(networkService.getPeopleURL() + person.id + '/', JSONPerson,
      networkService.getAuthenticationHeader()).then(function (xhr) {
      if (xhr.status === 204) {
        callSuccess();
      } else {
        callFailure();
      }
    });
  };

  this.uploadPersonToUrl = function( person, uploadUrl, callSuccess, callFailure ) {
    var JSONPerson = { };
    var uploadFields = optionService.getPersonUploadInfo( );
    
    for( var i = 0; i < uploadFields.length; i++ ) {
      if( person[ uploadFields[ i ] ] !== "" && person[ uploadFields[ i ] ] !== undefined 
          && person[ uploadFields[ i ] ] !== "undefined" ) {
        JSONPerson[uploadFields[ i ]] = fixUndefined( person[ uploadFields[ i ] ] );
      }
    }
    
    JSONPerson = JSON.stringify( JSONPerson );

    $http.post(uploadUrl, JSONPerson, {
      transformRequest: angular.identity,
      headers: {
        'Authorization': networkService.getAuthenticationHeader().headers.Authorization
      }
    }).then(function() {
      callSuccess();
    }, function(err) {
      //TODO: Translate
      if (err.error_message)
        callFailure('Person not uploaded! Error: ' + err.error_message);
      else if (err.statusText)
        callFailure('Person not uploaded! Error: ' + err.statusText);
      else
        callFailure('Person not uploaded! Error: ' + "Undefined - check connection to server");
    });
  };

  this.deletePerson = function(person, successCallback, errorCallback) {
    $http.delete(networkService.getPeopleURL() + person.id + '/', {
      headers: {
      'Authorization': networkService.getAuthenticationHeader().headers.Authorization
    }}).then(function(xhr) {
        if (xhr.status === 204) {
          successCallback();
        } else {
          errorCallback(xhr.status);
        }
      }, function(error) {
      if (error) {
        if (error.statusText)
          errorCallback($filter('translate')('error_uploading_person') + error.statusText);
        else
          errorCallback($filter('translate')('error_uploading_person') + error);
      }});
  };

  this.convertPictureToBlob = function(newPhoto){
    return dataURLtoBlob(newPhoto);
  };
})

.factory('geofenceService', function ($rootScope, $window, $q, $log, $ionicLoading, toaster) {
  $window.geofence = $window.geofence || {
    addOrUpdate: function (fences) {
      var deffered = $q.defer();
      $log.log('Mocked geofence plugin addOrUpdate', fences);
      deffered.resolve();
      return deffered.promise;
    },
    remove: function (ids) {
      var deffered = $q.defer();
      $log.log('Mocked geofence plugin remove', ids);
      deffered.resolve();
      return deffered.promise;
    },
    removeAll: function () {
      var deffered = $q.defer();
      $log.log('Mocked geofence plugin removeAll');
      deffered.resolve();
      return deffered.promise;
    },
    receiveTransition: function (obj) {
      $rootScope.$apply(function () {
        toaster.pop('info', 'title', 'text');
      });
    }
  };
  $window.TransitionType = $window.TransitionType || {
    ENTER: 1,
    EXIT: 2,
    BOTH: 3
  };

  var geofenceService = {
    _geofences: [],
    _geofencesPromise: null,
    createdGeofenceDraft: null,
    loadFromLocalStorage: function () {
      var result = localStorage.geofences;
      var geofences = [];
      if (result) {
        try {
          geofences = angular.fromJson(result);
        } catch (ex) {

        }
      }
      this._geofences = geofences;
      return $q.when(this._geofences);
    },
    saveToLocalStorage: function () {
      localStorage.geofences = angular.toJson(this._geofences);
    },
    loadFromDevice: function () {
      var self = this;
      if ($window.geofence && $window.geofence.getWatched) {
        return $window.geofence.getWatched().then(function (geofencesJson) {
          self._geofences = angular.fromJson(geofencesJson);
          return self._geofences;
        });
      }
      return this.loadFromLocalStorage();
    },
    getAll: function () {
      var self = this;
      if (!self._geofencesPromise) {
        self._geofencesPromise = $q.defer();
        self.loadFromDevice().then(function (geofences) {
          self._geofences = geofences;
          self._geofencesPromise.resolve(geofences);
        }, function (reason) {
          $log.log("Error fetching geofences", reason);
          self._geofencesPromise.reject(reason);
        });
      }
      return self._geofencesPromise.promise;
    },
    addOrUpdate: function (geofence) {
      var self = this;
      $window.geofence.addOrUpdate(geofence).then(function () {
        if ((self.createdGeofenceDraft && self.createdGeofenceDraft === geofence) ||
          !self.findById(geofence.id)) {
          self._geofences.push(geofence);
          self.saveToLocalStorage();
        }

        if (self.createdGeofenceDraft) {
          self.createdGeofenceDraft = null;
        }
      });

    },
    findById: function (id) {
      if (this.createdGeofenceDraft && this.createdGeofenceDraft.id === id) {
        return this.createdGeofenceDraft;
      }
      var geoFences = this._geofences.filter(function (g) {
        return g.id === id;
      });
      if (geoFences.length > 0) {
        return geoFences[0];
      }
      return undefined;
    },
    remove: function (geofence) {
      var self = this;
      $ionicLoading.show({
        template: 'Removing geofence...'
      });
      $window.geofence.remove(geofence.id).then(function () {
        $ionicLoading.hide();
        self._geofences.splice(self._geofences.indexOf(geofence), 1);
        self.saveToLocalStorage();
      }, function (reason) {
        $log.log('Error while removing geofence', reason);
        $ionicLoading.show({
          template: 'Error',
          duration: 1500
        });
      });
    },
    removeAll: function () {
      var self = this;
      $ionicLoading.show({
        template: 'Removing all geofences...'
      });
      $window.geofence.removeAll().then(function () {
        $ionicLoading.hide();
        self._geofences.length = 0;
        self.saveToLocalStorage();
      }, function (reason) {
        $log.log('Error while removing all geofences', reason);
        $ionicLoading.show({
          template: 'Error',
          duration: 1500
        });
      });
    },
    getNextNotificationId: function () {
      var max = 0;
      this._geofences.forEach(function (gf) {
        if (gf.notification && gf.notification.id) {
          if (gf.notification.id > max) {
            max = gf.notification.id;
          }
        }
      });
      return max + 1;
    }
  };

  return geofenceService;
})

.factory('geolocationService', function ($q, $timeout) {
  var currentPositionCache;
  return {
    getCurrentPosition: function () {
      if (!currentPositionCache) {
        var deffered = $q.defer();
        navigator.geolocation.getCurrentPosition(function (position) {
          deffered.resolve(currentPositionCache = position);
          $timeout(function () {
            currentPositionCache = undefined;
          }, 10000);
        }, function () {
          deffered.reject();
        });
        return deffered.promise;
      }
      return $q.when(currentPositionCache);
    }
  };
})

.service('shelterService', function($http, networkService, $resource, $q, VIDA_localDB, optionService, $cordovaProgress) {
  var service = this;
  var shelters = [];
  var current_shelter = {};
  current_shelter.str = 'None';
  current_shelter.link = 'None';
  var is_updating_shelter = true;
  var came_from_details = false;

  this.addShelter = function(shelter, addToDatabase) {
    for (var i = 0; i < shelters.length; i++){
      if (shelters[i].uuid === shelter.uuid)
        return;
    }

    // Made it through return, add to list
    shelters.push(shelter);

    // There will come a time where the None will try to pass and be part of the database.
    //                            This will not be that time.
    if (shelter.name === "None" || !addToDatabase)
      return;

    // Made it through, attempt to add shelter to DB
    var whereAt = {
      restriction: 'EXACT',
      column: 'uuid',
      value: "\'" + shelter.uuid + "\'"
    };
    VIDA_localDB.queryDB_select('shelters', '*', function(result) {
      if (result.length <= 0) {
        var shelterObj = "\'" + shelter.name + "\', ";
        shelterObj += "\'" + shelter.id + "\', ";
        shelterObj += "\'" + shelter.uuid + "\', ";
        shelterObj += "\'" + shelter.description + "\', ";
        shelterObj += "\'" + shelter.street_and_number + "\', ";
        shelterObj += "\'" + shelter.neighborhood + "\', ";
        shelterObj += "\'" + shelter.city + "\', ";
        shelterObj += "\'" + shelter.province_or_state + "\', ";
        shelterObj += "\'" + shelter.notes + "\', ";
        shelterObj += "\'" + shelter.geom + "\'";
        VIDA_localDB.queryDB_insert('shelters', shelterObj, function () {
          // After inserting
        });
      }
    }, whereAt);
  };

  this.clearShelters = function() {
    shelters = [];
  };

  this.removeShelterByUUID = function(uuid) {
    for (var i = 0; i < shelters.length; i++) {
      if ((shelters[i].uuid === uuid) || (shelters[i].value === uuid)) {
        shelters.splice(i, 1);
        var whereAt = "uuid=\'" + uuid + "\'";
        VIDA_localDB.queryDB_delete('shelters', whereAt);
      }
    }
  };

  this.getAllSheltersWithPromise = function() {
    var q = $q.defer();

    if (!isDisconnected) {
      var array = [];
      var auth = networkService.getUsernamePassword();

      $.ajax({
        type: 'GET',
        xhrFields: {
          withCredentials: true
        },
        url: networkService.getShelterURL(),
        username: auth.username,
        password: auth.password,
        success: function (data) {
          if (data.objects.length > 0) {
            for (var i = 0; i < data.objects.length; i++) {
              array.push(data.objects[i]);
            }
          } else {
            console.log('No shelters returned - check url: ' + networkService.getShelterURL() + ' or none are available');
          }

          q.resolve(array);
        },
        error: function (error) {
          console.log('Error - retrieving all shelters failed');
          q.reject(error);
        }
      });
    } else {
      q.reject();
    }

    return q.promise;
  };

  this.getAll = function() {
    var allShelters = [];

    if (!isDisconnected) {
      var shelter = $resource(networkService.getShelterURL() + ':id', {}, {
        query: {
          method: 'GET',
          isArray: true,
          transformResponse: $http.defaults.transformResponse.concat([
            function (data, headersGetter) {
              allShelters.push(optionService.getDefaultShelterData());
              for (var i = 0; i < data.objects.length; i++)
                allShelters.push(data.objects[i]);
              console.log('----[ transformResponse data: ', data);
              return allShelters;
            }
          ])
        }
      });

      return shelter.query().$promise;
    } else {
      var deferred = $q.defer();

      VIDA_localDB.queryDB_select('shelters', '*', function(allSheltersFromDB) {
        allShelters.push(optionService.getDefaultShelterData());
        for (var i = 0; i < allSheltersFromDB.length; i++)
          allShelters.push(allSheltersFromDB[i]);
        deferred.resolve(allShelters);
      });

      return deferred.promise;
    }
  };

  //////////
  // Last minute way of dealing with these issues
  this.getIfCameFromDetails = function() {
    return came_from_details;
  };

  this.setIfCameFromDetails = function(boolean) {
    came_from_details = boolean;
  };

  this.getIsUpdatingShelter = function() {
    return is_updating_shelter;
  };

  this.setIsUpdatingShelter = function(boolean) {
    is_updating_shelter = boolean;
  };
  //////////


  this.getByUUID = function(uuid) {
    for(var i = 0; i < shelters.length; i++) {
      if (shelters[i].uuid === uuid)
        return shelters[i];
    }

    return undefined;
  };

  this.getByIdOnline = function(id) {
    if (!isDisconnected) {
      var promise = $q.defer();

      this.getAll().then(function(allShelters) {
        for (var i = 0; i < allShelters.length; i++){
          if (allShelters[i].id == id) {
            $cordovaProgress.hide();
            promise.resolve(allShelters[i]);
          }
        }

        $cordovaProgress.hide();
        promise.reject();
      });

      return promise.promise;
    } else {
      // Last ditch effort (check offline)
      for (var i = 0; i < shelters.length; i++) {
        if (shelters[i].id == id) {
          $cordovaProgress.hide();
          return shelters[i];
        }
      }

      $cordovaProgress.hide();
      return undefined;
    }
  };

  this.getById = function(id) {
    for (var i = 0; i < shelters.length; i++) {
      if (shelters[i].id == id)
        return shelters[i];
    }
  };

  this.getCurrentShelter = function() {
    return current_shelter;
  };

  this.setCurrentShelter = function(shelter){
    if (shelter !== 'None') {
      current_shelter.str = shelter.name;
      current_shelter.uuid = shelter.uuid;
      current_shelter.link = '#/vida/shelter-search/shelter-detail/' + shelter.id;
    } else {
      current_shelter.str = 'None';
      current_shelter.uuid = 'None';
      current_shelter.link = 'None';
    }
  };

  this.getAllLocalShelters = function() {
    return shelters;
  };

  this.getLatLngFromShelter = function(shelter) {
    // look for 'point' in wkt and get the pair of numbers in the string after it
    var trimParens = /^\s*\(?(.*?)\)?\s*$/;
    var coordinateString = shelter.geom.toLowerCase().split('point')[1].replace(trimParens, '$1').trim();
    var tokens = coordinateString.split(' ');
    var lng = parseFloat(tokens[0]);
    var lat = parseFloat(tokens[1]);
    return {lat: lat, lng: lng};
  };

  this.getLatLng = function(id) {
    var shelter = service.getById(id);
    if (shelter === undefined)
      return {lat: -1111, lng: -1111}; // Not on the server, only in the database

    // look for 'point' in wkt and get the pair of numbers in the string after it
    var trimParens = /^\s*\(?(.*?)\)?\s*$/;
    var coordinateString = shelter.geom.toLowerCase().split('point')[1].replace(trimParens, '$1').trim();
    var tokens = coordinateString.split(' ');
    var lng = parseFloat(tokens[0]);
    var lat = parseFloat(tokens[1]);
    return {lat: lat, lng: lng};
  };
})

.service('peopleService', function($http, networkService, uploadService, VIDA_localDB, $cordovaToast, $filter,
                                   optionService, $q, $cordovaFile, $ionicPopup, $cordovaFileTransfer, $rootScope) {
    var peopleInShelter = [];
    var personByID = {};
    var storedSearchQuery = "";

    this.refreshSearchQuery = function(success, error) {
      this.searchForPerson(networkService.getPeopleURL(), storedSearchQuery, success, error);
    };

    this.searchForPerson = function(URL, query, success, error) {
      if (query !== '') {
        if (!isDisconnected) {
          var newURL = (URL === networkService.getPeopleURL()) ? URL + '?custom_query=' + query + '&limit=' + networkService.getPersonRetrievalLimit()
            : URL + query + '&limit=' + networkService.getPersonRetrievalLimit(); // Change parameter prefacing
          $http.get(newURL, networkService.getAuthenticationHeader()).then(function (xhr) {
            if (xhr.status === 200) {
              if (xhr.data !== null) {
                peopleInShelter = [];    // Reset list, is safe

                if (xhr.data.objects.length > 0) {

                  for (var i = 0; i < xhr.data.objects.length; i++) {
                    var personOnServer = xhr.data.objects[i];
                    var newPerson = {};

                    newPerson.given_name = personOnServer.given_name;
                    newPerson.status = personOnServer.status;
                    newPerson.id = personOnServer.id;
                    newPerson.score = undefined;

                    peopleInShelter.push(xhr.data.objects[i]);
                  }
                } else {
                  $cordovaToast.showLongBottom($filter('translate')('error_no_results'));
                }

                if (success)
                  success();
              } else {
                if (error)
                  error(undefined);
              }
            } else {
              if (error)
                error(xhr.status);
            }
          }, function (e) {
            if (error)
              error("Error: Server - " + e.statusText);
          });
        } else {
          // Search local database instead
          var whereAt = {};
          whereAt.restriction = 'LIKE';
          whereAt.column = 'given_name';
          if (Number(query)) {
            whereAt.restriction = 'EXACT';
            whereAt.column = 'barcode';
          }
          whereAt.value = query;
          VIDA_localDB.queryDB_select('people', '*', function (results) {
            peopleInShelter = [];
            for (var i = 0; i < results.length; i++) {
              if (results[i].deleted != true)
                peopleInShelter.push(results[i]);
            }
            if (peopleInShelter.length > 0)
              peopleInShelter.sort(); // Results comes up weird sometimes, better off just sorting it
            else
              $cordovaToast.showLongBottom($filter('translate')('error_no_results'));

            if (success)
              success();
          }, whereAt);
        }
      } else {
        peopleInShelter = [];
        if (success)
          success();
      }
    };

    this.searchPersonByID = function(id, success, error) {
      if (!isDisconnected) {
        var searchURL = networkService.getSearchURL();
        searchURL += id;

        $http.get(searchURL, networkService.getAuthenticationHeader()).then(function (xhr) {
          if (xhr.status === 200) {
            if (xhr.data !== null) {
              if (xhr.data.objects.length > 0) {
                if (xhr.data.objects.length > 1) {
                  // Multiple objects returned, search for ID specifically
                  for (var i = 0; i < xhr.data.objects.length; i++) {
                    if (parseInt(id) === xhr.data.objects[i].id) {
                      personByID = xhr.data.objects[i];
                      break;
                    }
                  }
                } else
                  personByID = xhr.data.objects[0]; // Only 1 object returned

                success();
              } else {
                error(); // No objects returned
              }
            } else {
              error();
            }
          } else {
            error();
          }
        }, function (e) {
          if (e) {
            if (e.status === 401) {
              $ionicPopup.alert({
                title: 'Big Error',
                template: "Something went wrong with credentials.."
              }); // Should never get in here
            } else {
              $ionicPopup.alert({
                title: 'Error',
                template: "A problem occurred when connecting to the server. \nStatus: " + e.status + ": " + e.description
              });
            }
          }
          error();
        });
      } else {
        var whereAt = {};
        whereAt.restriction = 'EXACT';
        whereAt.column = 'id';
        whereAt.value = '\"' + id + '\"';
        VIDA_localDB.queryDB_select('people', '*', function(results){
          if (results.length > 0) {
            personByID = results[0];
            success();
          } else {
            personByID = undefined;
            error();
          }
        }, whereAt);
      }
      personByID = undefined; // Set by default
    };

    this.getRetrievedPersonByID = function (){
      return personByID;
    };

    this.setStoredSearchQuery = function (query) {
      storedSearchQuery = query;
    };

    this.getStoredSearchQuery = function (){
      return storedSearchQuery;
    };

    this.removePersonFromList = function(ID){
      for (var i = 0; i < peopleInShelter.length; i++){
        if (peopleInShelter[i].id === ID){
          peopleInShelter.splice(i, 1); // Remove that person
        }
      }
    };

    this.resetPersonList = function() {
      peopleInShelter = [];
    };

    this.testPersonForNull = function(ID, isNotNull, isNull, error){
      $http.get(networkService.getPeopleURL() + ID + "/", networkService.getAuthenticationHeader()).then(function successCallback(xhr) {
        if (xhr.status === 200) {
          if (xhr.data !== null){
            isNotNull();
          } else {
            isNull();
          }
        } else {
          isNull();
        }
      }, function errorCallback(xhr){
        // TODO: Translate
        if (xhr.status === 404)
          error("Not Found");
        else if (xhr.status === 500)
          error("Internal Server Error");
        else
          error("Undefined Error");
      });
    };

    this.createSearchResult = function(peopleArr, scoreArr){
      peopleInShelter = [];    // Reset list, is safe

      for (var i = 0; i < peopleArr.length; i++){
        var newPerson = peopleArr[i];
        newPerson.score = scoreArr[i][1].toFixed(7);
        peopleInShelter.push(peopleArr[i]);
      }
    };

    this.editPerson_saveChanges = function( newPerson, success, error ) {
      var putJSON = { };
      var hasItem = false;

      var changeList = optionService.getPersonToDBInformation( );

      for( var i = 0; i < changeList.length; i++ ) {
        if( newPerson[ changeList[ i ] ] !== undefined ) {
          putJSON[changeList[ i ]] = newPerson[ changeList[ i ] ];
          hasItem = true;
        }
      }

      // Separate photo check (has different method)
      if (newPerson.photo !== undefined) {
        var oldPictureFile = newPerson.pic_filename;

        // Photo has changed, upload it
        if (!isDisconnected) {
          uploadService.uploadPhotoToUrl(newPerson.photo, networkService.getFileServiceURL(), function (data) {
            putJSON.pic_filename = data.name;
            hasItem = true;

            newPerson.pic_filename = data.name;
            var photoFile = uploadService.convertPictureToBlob(newPerson.photo);
            var picture = data.name.split('.');
            var newFilename = picture[0] + '_thumb.' + picture[1];
            $cordovaFile.writeFile(cordova.file.dataDirectory, 'Photos/' + newFilename, photoFile, true);

            if (oldPictureFile !== undefined) {
              if (!oldPictureFile.contains('_thumb')) {
                picture = oldPictureFile.split('.');
                oldPictureFile = picture[0] + '_thumb.' + picture[1];
              }
              $cordovaFile.removeFile(cordova.file.dataDirectory, 'Photos/' + oldPictureFile);
            }

            finishHttpPut(hasItem, newPerson.id, putJSON, success, error, newPerson);
          }, function () {
            // Error
            finishHttpPut(hasItem, newPerson.id, putJSON, success, error, newPerson);
          });
        } else {
          // See if an older picture needs to be removed
          if (oldPictureFile) {
            // Attempt to remove the old file
            if (!oldPictureFile.contains('_thumb')) {
              var picture = oldPictureFile.split('.');
              oldPictureFile = picture[0] + '_thumb.' + picture[1];
            }
            $cordovaFile.removeFile(cordova.file.dataDirectory, 'Photos/' + oldPictureFile);
          }

          // Save out picture (won't be hashed yet so save temporary picture name)
          newPerson.pic_filename = 'temp_picture_' + newPerson.uuid + '.jpg';
          var photoFile = uploadService.convertPictureToBlob(newPerson.photo);
          $cordovaFile.writeFile(cordova.file.dataDirectory, 'Photos/' + newPerson.pic_filename, photoFile, true);

          putJSON.pic_filename = newPerson.pic_filename;
          hasItem = true;

          finishHttpPut(hasItem, newPerson.id, putJSON, success, error, newPerson);
        }
      } else {
        finishHttpPut(hasItem, newPerson.id, putJSON, success, error, newPerson);
      }
    };

    var finishHttpPut = function(hasItem, id, putJSON, success, error, newPerson) {
      // Put into it's own function to not have gross copy+paste everywhere
      putJSON = JSON.stringify( putJSON );

      if (hasItem === true) {
        if (!isDisconnected) {
          $http.put(networkService.getPeopleURL() + id + '/', putJSON, networkService.getAuthenticationHeader()).then(function (xhr) {
            if (xhr.status === 204) {
              success();
            } else {
              error();
            }}, function(httpErr){
            console.log(httpErr);
            if (httpErr.data)
              $cordovaToast.showShortBottom(httpErr.data.error_message);
            else if (httpErr.statusText) {
              $cordovaToast.showLongBottom("Error - " + httpErr.statusText);
            }
            else {
              if (httpErr.status) {
                // TODO: Translate
                if (httpErr.status === 404) {
                  $cordovaToast.showShortBottom("Error not found. Please try again");
                } else if (httpErr.status == 500) {
                  $cordovaToast.showShortBottom("Internal server error. Please try again.");
                } else {
                  $cordovaToast.showShortBottom("Undefined Error. Please try again.");
                }
              } else {
                $cordovaToast.showShortBottom(httpErr);
              }
            }
            if (error)
              error();
            });
        }

        // Update Database regardless
        var DBInfo = optionService.getPersonToDBInformation();
        var values = [];
        var JSONForPut = JSON.parse(putJSON);

        // Check which information needs to be updated
        for (var i = 0; i < DBInfo.length; i++) {
          if (JSONForPut[DBInfo[i]] !== undefined) {
            values.push({
              type: DBInfo[i],
              value: "\"" + JSONForPut[DBInfo[i]] + "\""
            });
          }
        }

        if (values.length > 0) {
          // There is a change, mark the DB as dirty
          var isDirty = isDisconnected ? 1 : 0; // If they are online, it doesn't need to be updated

          values.push({
            type: 'isDirty',
            value: isDirty
          });

          // Update DB
          VIDA_localDB.queryDB_update('people', values, 'uuid=\"' + newPerson.uuid + '\"', function() {

            // Check for dirty after DB update is complete. (So isDirty will be correctly updated)
            if (isDirty) {
              $rootScope.$broadcast('databaseUpdateSyncStatus');
            }

            success();
          });
        } else {
          success();
        }

        } else {
        success();
      }
    };

    this.downloadPersonalImage = function(filename, success, error) {
      $cordovaFile.checkFile(cordova.file.dataDirectory + 'Photos/', filename).then(function() {
        // Found file already
        var downloaded_image = false;
        success(downloaded_image);
      }, function(err) {
        if (err.message === "NOT_FOUND_ERR") {
          $cordovaFileTransfer.download(networkService.getFileServiceURL() + filename + '/download/',
            cordova.file.dataDirectory + 'Photos/' + filename,
            {}, true).then(function (xhr) {
            // Success
            var downloaded_image = true;
            success(downloaded_image);
          }, function (err) {
            // Error
            error();
          }, function (progress) {
            // Progress (if i wanna keep track)
            //var x = progress;
          });
        } else
          error();
      });
    };

    this.getAllPeopleWithReturn = function(success, error) {
      $http.get(networkService.getPeopleURL() + "?limit=" + networkService.getPersonRetrievalLimit(), networkService.getAuthenticationHeader()).then(
        function successCallback(xhr) {
        if (xhr.status === 200) {
          if (xhr.data !== null) {
            var temp_peopleInShelter = [];

            for (var i = 0; i < xhr.data.objects.length; i++) {
              temp_peopleInShelter.push(xhr.data.objects[i]);
            }

            success(temp_peopleInShelter);
          } else {
            // TODO: Translate
            if (error)
              error("Data retrieved was invalid!");
          }
        } else {
          // TODO: Translate
          if (error)
            error("Could not reach the server!");
        }
      }, function errorCallback(err){
        var Str = "Could not contact the server. Please try again.";
        // TODO: Translate
        if (error) {
          if (err.statusText)
            Str += " Status: " + err.statusText;

          error(Str);
        }
      });
    };

    this.getPeopleInShelter = function() {
      return peopleInShelter;
    };

    this.getAllPeopleInDatabase = function() {
      var prom = $q.defer();

      VIDA_localDB.queryDB_select('people', '*', function(allPeople){
        prom.resolve(allPeople);
      });

      return prom.promise;
    };

    this.getPersonalImage = function(pic_filename, success, error) {
      if (!isDisconnected) {
        // Get normal image from server
        if (pic_filename !== null && pic_filename !== "null")
          return networkService.getFileServiceURL() + pic_filename + '/download/';
        else
          return this.getPlaceholderImage();
      } else {
        // This is a pretty disgusting null/undefined check
        if (pic_filename !== null && pic_filename !== undefined
            && pic_filename !== "null") {
          if (!pic_filename.startsWith('temp_picture')) {
            // If it has _thumb, use it. If it doesn't, see if it can find the thumbnail version.
            if (pic_filename.contains('_thumb')) {
              // Get image from phone
              return cordova.file.dataDirectory + 'Photos/' + pic_filename;
            } else {
              // Find the thumbnail version
              var pic = pic_filename.split('.');
              var thumb = pic[0] + '_thumb.' + pic[1];
              return cordova.file.dataDirectory + 'Photos/' + thumb;
            }
          } else {
            // Is temp_picture
            return cordova.file.dataDirectory + 'Photos/' + pic_filename;
          }
        } else {
          return this.getPlaceholderImage();
        }
      }
    };

    this.getPlaceholderImage = function() {
      return cordova.file.applicationDirectory + 'www/img/profile-photo-placeholder.jpg';
    };
  })

.service('optionService', function() {
    var gender_options = [{
      "name": 'person_not_specified',
      "value": "Not Specified"
    }, {
      "name": 'person_gender_male',
      "value": "Male"
    }, {
      "name": 'person_gender_female',
      "value": "Female"
    }, {
      "name": 'person_gender_other',
      "value": "Other"
    }];

    var injury_options = [{
      "name": 'person_injury_not_injured',
      "value": "Not Injured"
    }, {
      "name": 'person_injury_moderate',
      "value": "Moderate"
    }, {
      "name": 'person_injury_severe',
      "value": "Severe"
    }];

    var language_options = [{
      "name": 'settings_language_english',
      "value": "English"
    }, {
      "name": 'settings_language_spanish',
      "value": "Spanish"
    }];

    var nationality_options = [{
      "name": 'person_not_specified',
      "value": "Not Specified"
    }, {
      "name": 'person_nationality_african',
      "value": "African American"
    }, {
      "name": 'person_nationality_american_indian',
      "value": "American Indian"
    }, {
      "name": 'person_nationality_asian',
      "value": "Asian"
    }, {
      "name": 'person_nationality_hispanic_latino',
      "value": "Hispanic/Latino"
    }, {
      "name": 'person_nationality_caucasian',
      "value": "Caucasian/White"
    }, {
      "name": 'person_nationality_other',
      "value": "Other"
    }];

    var status_options = [{
      "name": 'person_not_specified',
      "value": 'Not Specified'
    }, {
      "name": 'person_status_displaced',
      "value": 'Lost/Displaced'
    }, {
      "name": 'person_status_deceased',
      "value": 'Deceased'
    }];

    var people_table_values = [{
      column: 'id',
      type: 'INTEGER PRIMARY KEY AUTOINCREMENT'
    }, {
      column: 'uuid',
      type: 'TEXT'
    }, {
      column: 'isDirty',
      type: 'TEXT DEFAULT \"false\"'
    }, {
      column: 'deleted',
      type: 'TEXT DEFAULT \"false\"'
    }, {
      column: 'given_name',
      type: 'TEXT'
    }, {
      column: 'family_name',
      type: 'TEXT'
    }, {
      column: 'fathers_given_name',
      type: 'TEXT'
    }, {
      column: 'mothers_given_name',
      type: 'TEXT'
    }, {
      column: 'age',
      type: 'TEXT'
    }, {
      column: 'date_of_birth',
      type: 'TEXT'
    }, {
      column: 'street_and_number',
      type: 'TEXT'
    }, {
      column: 'city',
      type: 'TEXT'
    }, {
      column: 'phone_number',
      type: 'TEXT'
    }, {
      column: 'neighborhood',
      type: 'TEXT'
    }, {
      column: 'gender',
      type: 'TEXT'
    }, {
      column: 'injury',
      type: 'TEXT'
    }, {
      column: 'nationality',
      type: 'TEXT'
    }, {
      column: 'barcode',
      type: 'TEXT'
    }, {
      column: 'shelter_id',
      type: 'TEXT'
    }, {
      column: 'description',
      type: 'TEXT'
    }, {
      column: 'status',
      type: 'TEXT'
    }, {
      column: 'pic_filename',
      type: 'TEXT'
    }, {
      column: 'province_or_state',
      type: 'TEXT'
    }, {
      column: 'created_at',
      type: 'TEXT'
    }, {
      column: 'created_by',
      type: 'TEXT'
    }, {
      column: 'photo',
      type: 'TEXT'
    }, {
      column: 'geom',
      type: 'TEXT'
    }];

    var shelter_table_values = [{
      column: 'name',
      type: 'TEXT'
    }, {
      column: 'id', // used for accessing on server
      type: 'TEXT'
    }, {
      column: 'uuid',
      type: 'TEXT'
    }, {
      column: 'description',
      type: 'TEXT'
    }, {
      column: 'street_and_number',
      type: 'TEXT'
    }, {
      column: 'neighborhood',
      type: 'TEXT'
    }, {
      column: 'city',
      type: 'TEXT'
    }, {
      column: 'province_or_state',
      type: 'TEXT'
    }, {
      column: 'notes',
      type: 'TEXT'
    }, {
      column: 'geom',
      type: 'TEXT'
    }];

    var default_shelter = {name: 'None', uuid: '', id: 0, description: '', street_and_number: '', neighborhood: '',
      city: '', province_or_state: '', notes: '', geom: ''};

    var settings_and_configurations = ['serverURL', 'username', 'password', 'protocol', 'language', 'workOffline'];

    var info_to_put_to_DB = ['given_name', 'family_name', 'fathers_given_name', 'mothers_given_name', 'age', 'date_of_birth',
    'street_and_number', 'city', 'phone_number', 'neighborhood', 'gender', 'injury', 'nationality', 'barcode', 'shelter_id',
    'description', 'status', 'pic_filename', 'province_or_state', 'created_at', 'created_by', 'photo', 'geom'];

    var info_to_upload_extra = ['given_name', 'family_name', 'fathers_given_name', 'mothers_given_name', 'age', 'date_of_birth',
      'street_and_number', 'city', 'phone_number', 'neighborhood', 'gender', 'injury', 'nationality', 'barcode', 'shelter_id',
      'description', 'pic_filename', 'province_or_state', 'notes', 'status', 'uuid', 'geom'];

    var default_configurations = {};
    default_configurations.configuration = {};
    default_configurations.configuration.serverURL = "192.168.33.15";
    default_configurations.configuration.username = "vida_user";
    default_configurations.configuration.password = "vida_pass";
    default_configurations.configuration.protocol = "http";
    default_configurations.configuration.language = "English";
    default_configurations.configuration.workOffline = "false";

    this.getAllDropdownOptions = function() {
      // This is a dumb-nice looking way to get default "Not Specified", "None", etc. type options.
      //    Shown off in PersonDetailEditCtrl - in buttonPersonSave().
      var allOptions = [];

      var option = {
        dropdown: 'gender',
        options: gender_options
      };
      allOptions.push(option);

      option = {
        dropdown: 'injury',
        options: injury_options
      };

      allOptions.push(option);

      option = {
        dropdown: 'nationality',
        options: nationality_options
      };

      allOptions.push(option);

      option = {
        dropdown: 'status',
        options: status_options
      };

      allOptions.push(option);

      return allOptions;
    };

    this.getDefaultShelterData = function() {
      return default_shelter;
    };

    this.getGenderOptions = function() {
      return gender_options;
    };

    this.getInjuryOptions = function() {
      return injury_options;
    };

    this.getLanguageOptions = function() {
      return language_options;
    };

    this.getNationalityOptions = function() {
      return nationality_options;
    };

    this.getStatusOptions = function() {
      return status_options;
    };

    this.getDefaultConfigurations = function() {
      return default_configurations;
    };

    this.getDefaultPeopleTableValues = function() {
      return people_table_values;
    };

    this.getDefaultShelterTableValues = function() {
      return shelter_table_values;
    };

    this.getPersonToDBInformation = function() {
      return info_to_put_to_DB;
    };

    this.getPersonUploadInfo = function() {
      return info_to_upload_extra;
    };

    this.getCameraOptions = function(source) {
      var camera_options = {
        quality: 90,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: source,
        allowEdit: true,
        encodingType: Camera.EncodingType.JPEG,
        popoverOptions: CameraPopoverOptions,
        saveToPhotoAlbum: true
      };

      return camera_options;
    };

    this.getDefaultConfigurationsJSON = function( ) {
      var configs = settings_and_configurations;
      var JSONObject = { configuration: {}};
      
      for( var i = 0; i < configs.length; i++ ) {
        JSONObject.configuration[configs[i]] = default_configurations.configuration[configs[i]];
      }
      
      JSONObject = JSON.stringify( JSONObject );
      return JSONObject;
    };

    // CREDIT: used from user Kaizhu256 - URL: https://gist.github.com/kaizhu256/4482069
    this.generate_uuid4 = function () {
      //// return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      var uuid = '', ii;
      for (ii = 0; ii < 32; ii += 1) {
        switch (ii) {
          case 8:
          case 20:
            uuid += '-';
            uuid += (Math.random() * 16 | 0).toString(16);
            break;
          case 12:
            uuid += '-';
            uuid += '4';
            break;
          case 16:
            uuid += '-';
            uuid += (Math.random() * 4 | 8).toString(16);
            break;
          default:
            uuid += (Math.random() * 16 | 0).toString(16);
        }
      }
      return uuid;
    };
  })

.service('networkService', function(optionService, $translate) {

    var self = this;
    this.configuration = {};

    var default_config = optionService.getDefaultConfigurations();
    this.configuration.username = default_config.configuration.username;
    this.configuration.password = default_config.configuration.password;
    this.configuration.serverURL = default_config.configuration.serverURL;
    this.configuration.protocol = default_config.configuration.protocol;
    this.configuration.language = default_config.configuration.language;
    this.configuration.workOffline = (default_config.configuration.workOffline === 'true');
    this.configuration.api = {};
    this.network_personRetrievalLimit = "1000000";

    this.compute_API_URLs = function() {
      var URL = this.configuration.protocol + '://' + this.configuration.serverURL + '/api/v1';
      this.configuration.api.personURL = URL + '/person/';
      this.configuration.api.searchURL = URL + '/person/?custom_query=';
      this.configuration.api.fileServiceURL = URL + '/fileservice/';
      this.configuration.api.shelterURL = URL + '/shelter/';
      this.configuration.api.faceSearchURL = URL + '/facesearchservice/';
    };

    this.compute_API_URLs();

    this.SetConfigurationFromDB = function(DBSettings) {
      // Set DB settings
      self.configuration.username = DBSettings.configuration.username;
      self.configuration.password = DBSettings.configuration.password;
      self.configuration.serverURL = DBSettings.configuration.serverURL;
      self.configuration.protocol = DBSettings.configuration.protocol;
      self.configuration.language = DBSettings.configuration.language;
      if (self.configuration.language === "English")
        $translate.use('en');
      else if (self.configuration.language === "Spanish")
        $translate.use('es');
      else
        $translate.use('en');
      self.configuration.workOffline = DBSettings.configuration.workOffline;
      isDisconnected = (self.configuration.workOffline === true);

      self.setServerAddress(DBSettings.configuration.serverURL);
    };

    this.getServerAddress = function() {
      return this.configuration.serverURL;
    };

    this.setServerAddress = function(Addr) {
      this.configuration.serverURL = Addr;

      // Need to reset variables
      this.compute_API_URLs();
    };

    this.getBasicAuthentication = function() {
      var authentication = btoa(this.configuration.username + ':' + this.configuration.password);
      return 'Basic ' + authentication;
    };

    this.getAuthenticationHeader = function() {
      var authentication = btoa(this.configuration.username + ':' + this.configuration.password);
      var authen = {};
      authen.headers = {};
      if (authentication !== null) {
        authen.headers.Authorization = 'Basic ' + authentication;
      } else {
        authen.headers.Authorization = '';
      }

      return authen;
    };

    this.setAuthentication = function(username, password){
      this.configuration.username = username;
      this.configuration.password = password;
    };

    this.setLanguage = function(current_language){
      this.configuration.language = current_language;
    };

    this.setDisconnected = function(current_disconnect_status) {
      this.configuration.workOffline = current_disconnect_status;
    };

    this.getUsernamePassword = function() {
      var user_pass = {};
      user_pass.username = this.configuration.username;
      user_pass.password = this.configuration.password;
      return user_pass;
    };

    this.getPersonRetrievalLimit = function(){
      return this.network_personRetrievalLimit;
    };

    this.getConfiguration = function(){
      return this.configuration;
    };

    this.getPeopleURL = function() {
      return this.configuration.api.personURL;
    };

    this.getAuthenticationURL = function() {
      return this.configuration.api.personURL;
    };

    this.getSearchURL = function() {
      return this.configuration.api.searchURL;
    };

    this.getFileServiceURL = function() {
      return this.configuration.api.fileServiceURL;
    };

    this.getShelterURL = function() {
      return this.configuration.api.shelterURL;
    };

    this.getFaceSearchServiceURL = function() {
      return this.configuration.api.faceSearchURL;
    };

  })

.factory('DBHelper', function($cordovaSQLite, $q, $ionicPlatform) {
    var self = this;
    var databases = [];
    var currDB = {};

    self.addDB = function(name, db){
      var newDB = {};
      newDB.name = name;
      newDB.database = db;
      databases.push(newDB);
    };

    self.setCurrentDB = function(dbName){
      for (var i = 0; i < databases.length; i++) {
        if (databases[i].name === dbName) {
          currDB = databases[i].database;
          return;
        }
      }

      console.log("problem choosing database!! was the database chosen incorrectly? dbName: " + dbName);
    };

    self.createTableIfNotExists = function(table, parameters) {
      parameters = parameters || [];
      var q = $q.defer();

      var query = 'CREATE TABLE IF NOT EXISTS ' + table + ' (';

      for (var i = 0; i < parameters.length; i++) {
        query += parameters[i].column + ' ' + parameters[i].type;

        if (i < parameters.length - 1)
          query += ', ';
      }

      query += ')';

      $cordovaSQLite.execute(db, query).then(
        function(result){
          q.resolve(result);
        }, function(error){
          console.log("Error with Creation of DB - " + error.message);
          q.reject(error);
        }
      );

      return q.promise;
    };

    self.query = function(query, parameters) {
      parameters = parameters || [];
      var q = $q.defer();

      $ionicPlatform.ready(function() {
        $cordovaSQLite.execute(currDB, query, parameters).then(
          function(result){
            q.resolve(result);
        }, function(error){
            console.log("Error with DB - " + error.message);
            q.reject(error);
          });
      });

      return q.promise;
    };

    self.getAll = function(result) {
      var output = [];

      for (var i = 0; i < result.rows.length; i++){
        output.push(result.rows.item(i));
      }

      return output;
    };

    self.getById = function(result) {
      var output = null;
      output = angular.copy(result.rows.item(0));
      return output;
    };

    return self;
  })

.factory('VIDA_localDB', function($cordovaSQLite, DBHelper, networkService){
    var self = this;

    self.queryDB_select = function(tableName, columnName, afterQuery, where) {
      var query = "SELECT " + columnName + " FROM " + tableName;
      if (where) {
        if (where.restriction == 'LIKE')
          query += " WHERE " + where.column + " LIKE \"%" + where.value + "%\"";
        else if (where.restriction == 'EXACT')
          query += " WHERE " + where.column + "=" + where.value;
      }
      console.log(query);
      return DBHelper.query(query)
        .then(function(result){
          afterQuery(DBHelper.getAll(result));
        });
    };

    self.queryDB_delete = function(tableName, whereAt, afterQuery) {
      var query = "DELETE FROM " + tableName + " WHERE " + whereAt;
      return DBHelper.query(query).then(function(result){
        if (afterQuery)
          afterQuery(result);
      });
    };

    // PLEASE ONLY USE IF ABSOLUTELY NECESSARY
    self.queryDB_deleteAllEntries = function(tableName, afterQuery) {
      var query = "DELETE FROM " + tableName;
      return DBHelper.query(query).then(function(){
        if (afterQuery)
          afterQuery();
      });
    };

    self.queryDB_update = function(tableName, values, whereAt, afterQuery) {
      var query = "UPDATE " + tableName + " SET ";

      if (values.length > 0) {
        var length = values.length;
        for (var i = 0; i < length; i++) {
          query += values[i].type + "=" + values[i].value;

          if (i < length - 1)
            query += ", ";
          else
            query += " ";
        }

        if (whereAt) {
          query += "WHERE " + whereAt;
        }

        console.log(query);
        DBHelper.query(query)
          .then(function (result) {
            console.log(result);
            if (afterQuery)
              afterQuery();
          });
      } else {

      }
    };

    self.queryDB_update_settings = function( success ) {
      var fields = [ 'serverURL', 'username', 'password', 'protocol', 'language', 'workOffline' ];
      var currentConfiguration = networkService.getConfiguration( );
      var JSONObject = { configuration: { } };
      
      for( var i = 0; i < fields.length; i++ )
        JSONObject.configuration[fields[ i ]] = currentConfiguration[ fields[ i ] ];
      
      JSONObject = JSON.stringify( JSONObject );
      
      var query = "UPDATE configuration SET settings=\'" + JSONObject + "\'";
      console.log( query );
      
      DBHelper.query( query ).then( function( result ) {
        console.log( result );
        
        if( success )
          success( );
      } );
    };

    self.queryDB_insert_JSON = function(tableName, JSONObject, success) {
      var query = "INSERT INTO " + tableName + " VALUES ('" + JSONObject + "')";
      console.log(query);
      DBHelper.query(query)
        .then(function (result) {
          console.log(result);
          if (success)
            success();
        });
    };

    self.queryDB_insert = function(tableName, Obj, success) {
      var query = "INSERT INTO " + tableName + " VALUES (" + Obj + ")";
      console.log(query);
      DBHelper.query(query)
        .then(function (result) {
          console.log(result);
          if (success)
            success();
        });
    };

    return self;
  });
