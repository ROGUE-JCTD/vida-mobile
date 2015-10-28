// Global Functions
function dataURLtoBlob(dataURI) {
  var binary = atob(dataURI.split(',')[1]);
  var array = [];
  for(var i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
}

angular.module('vida.services', [])

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

.service('uploadService', ['$http', function($http) {
  this.uploadPhotoToUrl = function(photo, uploadUrl, callSuccess, callFailure) {

    var photoBlob = dataURLtoBlob(photo);
    var formData = new FormData();
    formData.append("file", photoBlob, 'filename.jpg');

    $http.post(uploadUrl, formData, {
      transformRequest: angular.identity,
      headers: {
        'Content-Type': undefined,
        'Authorization': 'Basic ' + btoa('admin:admin')
      }
    }).success(function(data) {
      callSuccess(data);
    }).error(function(err) {
      // can be moved to callFailure(err)
      // if err is null, server not found?
      alert('Photo not uploaded! Error: ' + err.error_message);
      callFailure();
    });
  };

  this.uploadPersonToUrl = function(person, uploadUrl, callSuccess, callFailure) {

    var JSONPerson = '{' +
      '"age":"' + person.age + '", ' +
      '"barcode":"' + person.barcode + '", ' +
      '"city":"' + person.city + '", ' +
      '"description":"' + person.description + '", ' +
      '"family_name":"' + person.family_name + '", ' +
      '"fathers_given_name":"' + person.fathers_given_name + '", ' +
      '"gender":"' + person.gender + '", ' +
      '"given_name":"' + person.given_name + '", ' +
      '"mothers_given_name":"' + person.mothers_given_name + '", ' +
      '"neighborhood":"' + person.neighborhood + '", ' +
      '"notes":"' + person.notes + '", ' +
      '"pic_filename":"' + person.pic_filename + '", ' +
      '"province_or_state":"' + person.province_or_state + '", ' +
      '"street_and_number":"' + person.street_and_number + '"' + '}';

    $http.post(uploadUrl, JSONPerson, {
      transformRequest: angular.identity,
      headers: {
        'Authorization': 'Basic ' + btoa('admin:admin')
      }
    }).success(function() {
      callSuccess();
    }).error(function(err) {
      // can be moved to callFailure(err)
      alert('Person not uploaded! Error: ' + err.error_message);
      callFailure();
    });
  };
}])

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

.service('peopleService', function($http, networkService) {
    var peopleInShelter = [];
    var personByID = {};
    var testPhoto = {};

    this.getPerson = function(URL, query, success, error) {
      $http.get(URL, networkService.getAuthentication()).then(function(xhr) {
        if (xhr.status === 200) {
          if (xhr.data !== null) {
            peopleInShelter = [];    // Reset list, is safe

            if (query !== '') { // Temporary fix (search with '' returns all objects (since all contain ''))
              for (var i = 0; i < xhr.data.objects.length; i++) {
                var personOnServer = xhr.data.objects[i];
                var newPerson = {};

                newPerson.given_name = personOnServer.given_name;
                newPerson.status = 'On Server';
                newPerson.id = personOnServer.id;

                peopleInShelter.push(xhr.data.objects[i]);
              }
            }

            success();
          } else {
            error(undefined);
          }
        } else {
          error(xhr.status);
        }
      }, function(e) {
        error(e.statusText);
      });
    };

    this.searchPersonByID = function(id, success, error) {
      var searchURL = networkService.getSearchURL();
      searchURL += id;

      $http.get(searchURL, networkService.getAuthentication()).then(function(xhr) {
        if (xhr.status === 200) {
          if (xhr.data !== null) {
            if (xhr.data.objects.length > 0) {
              if (xhr.data.objects.length > 1) {
                // Multiple objects returned, search for ID specifically
                for (var i = 0; i < xhr.data.objects.length; i++){
                  if (parseInt(id) === xhr.data.objects[i].id){
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
      }, function(e) {
        if (e) {
          if (e.status === 401) {
            alert("Something went wrong with credentials.."); // Should never get in here
          } else {
            alert("A problem occurred when connecting to the server. \nStatus: " + e.status + ": " + e.description)
          }
        }
        error();
      });

      personByID = undefined; // Set by default
    };

    this.getRetrievedPersonByID = function (){
      return personByID;
    };

    this.updateAllPeople = function(URL) {
      $http.get(URL, networkService.getAuthentication()).then(function(xhr) {
        if (xhr.status === 200) {
          if (xhr.data !== null) {
            peopleInShelter = [];

            for (var i = 0; i < xhr.data.objects.length; i++) {
              var personOnServer = xhr.data.objects[i];

              // Check for duplicates (only names - then ID so far)
              var duplicate = false;
              for (var j = 0; j < peopleInShelter.length; j++) {
                if (peopleInShelter[j].given_name === personOnServer.given_name){
                  if (peopleInShelter[j].id === personOnServer.id){
                    duplicate = true;
                    break;
                  }
                }
              }

              if (!duplicate) {
                personOnServer.status = "On Server";  //TEMPORARY
                personOnServer.photo = {};

                peopleInShelter.push(personOnServer);
              }
            }

            alert("Person list retrieval completed!");
          }
        }
      });
    };

    this.printToConsole = function() {
      for (var i = 0; i < peopleInShelter.length; i++) {
        console.log(peopleInShelter[i].given_name);
      }
    };

    this.getPeopleInShelter = function() {
      return peopleInShelter;
    };

    this.getPhoto = function() {
      return testPhoto;
    };

    this.getPlaceholderImage = function() {
      return "https://www.passpack.com/wp-content/uploads/2014/01/profile-photo-placeholder.jpg";
    };

    this.downloadPhotos = function() {
      var array = peopleInShelter;
      for (var i = 0; i < array.length; i++) {
        if (array[i].pic_filename && array[i].pic_filename !== "undefined") {
          var thisURL = networkService.getFileServiceURL() + array[i].pic_filename + '/download/';
          $http.get(thisURL).then(function (xhr) {
            if (xhr.status === 200) {
              if (xhr.data.status !== "file not found") {
                testPhoto = xhr.data;
                if (false) {
                  var reader = new window.FileReader();
                  reader.readAsDataURL(new Blob([xhr.data]));
                  reader.onloadend = function () {
                    var start = reader.result.split(',');
                    testPhoto = "data:image/jpeg;base64," + start[1];
                  };
                }
              }
            }
          }, function (error) {
            // Error
          });
        }
      }
    };
  })

.service('networkService', function($http) {
    var networkIP = '192.168.1.55'; // Needs to be set by something else

    var authentication = btoa("admin:admin"); // Should be set through login, will use admin:admin by default for now
    var authenURL = 'http://' + networkIP + '/api/v1/person/';
    var peopleURL = 'http://' + networkIP + '/api/v1/person/';
    var searchURL = 'http://' + networkIP + '/api/v1/person/?custom_query=';
    var serviceURL = 'http://' + networkIP + '/api/v1/fileservice/';

    this.getServerAddress = function() {
      return networkIP;
    };

    this.setServerAddress = function(Addr) {
      networkIP = Addr;

      // Need to reset variables
      authenURL = 'http://' + networkIP + '/api/v1/person/';
      peopleURL = 'http://' + networkIP + '/api/v1/person/';
      searchURL = 'http://' + networkIP + '/api/v1/person/?custom_query=';
      serviceURL = 'http://' + networkIP + '/api/v1/fileservice/';
    };

    this.doLogin = function(credentials, success, error){
      var _authentication = btoa(credentials.username + ":" + credentials.password);
      var config = {};
      config.headers = {};
      if (_authentication !== null){
        config.headers.Authorization = 'Basic ' + _authentication;
      } else {
        config.headers.Authorization = '';
      }

      $http.get(authenURL, config).then(function(xhr) {
        if (xhr.status === 200){
          authentication = _authentication;
          success();
        } else {
          error(xhr.status);
          alert(xhr.status);
        }
      }, function(e) {
        if (e) {
          if (e.status === 401) {
            alert("Incorrect Username or Password!");
          } else {
            alert("A problem occurred when connecting to the server. \nStatus: " + e.status + ": " + e.description)
          }
        }

        error(e);
      });
    };

    this.setCredentials = function(authen){
      authentication = authen;
    };

    this.getAuthentication = function() {
      var authen = {};
      authen.headers = {};
      if (authentication !== null) {
        authen.headers.Authorization = 'Basic ' + authentication;
      } else {
        authen.headers.Authorization = '';
      }

      return authen;
    };

    this.getPeopleURL = function() {
      return peopleURL;
    };

    this.getAuthenticationURL = function() {
      return authenURL;
    };

    this.getSearchURL = function() {
      return searchURL;
    };

    this.getFileServiceURL = function() {
      return serviceURL;
    };
  });