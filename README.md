# vida-mobile
---
### How to install:

VIDA requires _Ionic_ which can be downloaded by using this command:
```
$ npm install -g ionic
```

VIDA will also require [NodeJS (v0.12.2 tested)](0) to be installed.


Once both are installed, you can begin by cloning the repo, and following these steps:
```sh
git clone <this repo>
cd vida-mobile
ionic plugin add cordova-plugin-camera
ionic plugin add cordova-plugin-device
ionic plugin add com.ionic.keyboard
ionic platform add android
ionic platform add ios
npm install
```
Then you can say these commands to being using the app:
```
'ionic serve' - Will host the app in an internet browser

Android:
'ionic build android --release' - Will build an APK (needs to be signed to install)
'ionic emulate android' - Will launch an emulator alongside the app (if available)

iOS:
'ionic build ios' - Will build the iOS version of the app
'ionic emulate ios' - Will launch an emulator alongside the app (if available)
```

Thank you and enjoy! 

_VIDA Team_


[0]: https://nodejs.org/en/blog/release/v0.12.2/