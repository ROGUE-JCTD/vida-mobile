(function() {
  var translations = {
    'title_search': 'Buscar',
    'title_create': 'Crear Persona',
    'title_edit': 'Editar Persona',
    'title_details': 'Detalles',
    'title_shelters': 'Refugios',
    'title_settings': 'Ajustes',
    'title_login': 'VIDA Iniciar sesión',
    'login_username': 'Usuario',
    'login_password': 'Clave',
    'login_message': 'Inicia sesión con tu cuenta VIDA',
    'tab_search': 'Buscar',
    'tab_create': 'Crear',
    'tab_shelter': 'Refugios',
    'tab_settings': 'Ajustes',
    'tab_edit': 'Editar',
    'tab_delete': 'Borrar',
    'tab_save': 'Guardar',
    'tab_cancel': 'Cancelar',
    'person_given_name': 'Nombre de Pila',
    'person_family_name': 'Apellido',
    'person_fathers_given_name': 'Nombre Padres Dada',
    'person_mothers_given_name': 'Nombre Madres Dada',
    'person_age': 'Anos',
    'person_date_of_birth': 'Fecha de cumpleanos',
    'person_street_and_number': 'Direccion',
    'person_city': 'Ciudad',
    'person_neighborhood': 'Barrio',
    'person_description': 'Descripcion',
    'person_gender': 'Genero',
    'person_gender_not_specified': 'No especificado',
    'person_gender_male': 'Masculino',
    'person_gender_female': 'Mujer',
    'person_gender_other': 'Otros',
    'person_phone_number': 'Numero de telefono',
    'person_barcode': 'Barcode',
    'button_save': 'Guardar',
    'button_login': 'Iniciar sesion',
    'button_logout': 'Cerrar sesion',
    'button_request_account': 'O solicitar una cuenta',
    'search_searchfield': 'Buscar',
    'search_age': 'Anos',
    'settings_cache_photos': 'Cache Fotos',
    'settings_language': 'Idioma',
    'settings_language_english': 'Ingles',
    'settings_language_spanish': 'Espanol',
    'settings_server_ip': 'Servidor IP',
    'error_retrieving_info': 'La informacion no pudo ser recuperada.'
  };

  var module = angular.module('vida-translations-es', ['pascalprecht.translate']);

  module.config(function($translateProvider) {
    $translateProvider.translations('es', translations);
  });

}());
