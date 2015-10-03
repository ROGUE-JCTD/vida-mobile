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
./clean-build.sh
```
Then you can say these commands to being using the app:
```
'ionic serve' - Will host the app in an internet browser

*Android*
```
# launch an android emulator
ionic emulate android

# launch the application on the connected android device
ionic run android

# build an APK (needs to be signed to install)
ionic build android --release
```
To Debug:
- launch chrome and use the developer tools. Works for emulator and you can and you can go to 'chrome://inspect/#devices'
  in the address bar to connect to a physical android device
```

*iOS*
```
# launch ios emulator (on OSX only)
ionic emulate ios

# Will build the iOS version of the app
ionic build ios
```
To run application on the iOS device:
- launch platforms/ios/vida-mobile.xcodeproj in xcode
- click the "build and then run" button to launch the app on device

To Debug:
- use Safari's developer tools / inspector to vew console output and debug DOM /js code
- in Safari console, run 'window.location.reload()' to reload the app to see console output from when the app is launched


Thank you and enjoy! 

_VIDA Team_


[0]: https://nodejs.org/en/blog/release/v0.12.2/
