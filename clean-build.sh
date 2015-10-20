rm -rf node_modules
npm install
rm -rf platforms
ionic platform add android
ionic platform add ios
ionic plugin add ionic-plugin-keyboard
ionic plugin add cordova-plugin-whitelist
ionic plugin add cordova-plugin-device
ionic plugin add cordova-plugin-console
ionic plugin add cordova-plugin-network-information
ionic plugin add cordova-plugin-camera
ionic plugin add https://github.com/wildabeast/BarcodeScanner.git
ionic plugin add cordova-plugin-geofence
ionic plugin add cordova-plugin-dialogs
ionic plugin add https://github.com/EddyVerbruggen/cordova-plugin-actionsheet.git
