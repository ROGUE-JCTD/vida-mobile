(function() {
  var translations = {
    'title_search': 'Search',
    'title_create': 'Create Person',
    'title_edit': 'Edit Person',
    'title_details': 'Details',
    'title_shelters': 'Shelters',
    'title_settings': 'Settings',
    'title_login': 'VIDA Login',
    'login_username': 'Username',
    'login_password': 'Password',
    'login_message': 'Log in with your VIDA account',
    'tab_search': 'Search',
    'tab_create': 'Create',
    'tab_shelter': 'Shelter',
    'tab_settings': 'Settings',
    'tab_edit': 'Edit',
    'tab_delete': 'Delete',
    'tab_save': 'Save',
    'tab_cancel': 'Cancel',
    'person_given_name': 'Given Name',
    'person_family_name': 'Family Name',
    'person_fathers_given_name': 'Fathers Given Name',
    'person_mothers_given_name': 'Mothers Given Name',
    'person_age': 'Age',
    'person_date_of_birth': 'Date of Birth',
    'person_street_and_number': 'Address',
    'person_city': 'City',
    'person_neighborhood': 'Neighborhood',
    'person_description': 'Description',
    'person_gender': 'Gender',
    'person_gender_not_specified': 'Not Specified',
    'person_gender_male': 'Male',
    'person_gender_female': 'Female',
    'person_gender_other': 'Other',
    'person_phone_number': 'Phone Number',
    'person_barcode': 'Barcode',
    'button_save': 'Save',
    'button_login': 'Log in',
    'button_logout': 'Log out',
    'button_request_account': 'Or request an account',
    'search_searchfield': 'Search',
    'search_age': 'Age',
    'settings_cache_photos': 'Cache Photos',
    'settings_language': 'Language',
    'settings_language_english': 'English',
    'settings_language_spanish': 'Spanish',
    'settings_server_ip': 'Server IP',
    'error_retrieving_info': 'Information could not be retrieved.'
  };

  var module = angular.module('vida-translations-en', ['pascalprecht.translate']);

  module.config(function($translateProvider) {
    $translateProvider.translations('en', translations);
  });

}());
