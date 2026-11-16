# Tinto for Android

The Android app is the same editor as the desktop app (`src/renderer`), packaged with
[Capacitor](https://capacitorjs.com). GitHub Actions builds it (the `android` job in
`.github/workflows/build.yml`):

1. copies `src/renderer` into `mobile/www`
2. `npx cap add android` creates the Android project
3. `@capacitor/assets` makes the icons and launch screen from `mobile/assets`
4. Gradle builds the APK, which is signed with the key in the `ANDROID_KEYSTORE_B64`
   and `ANDROID_KEYSTORE_PASSWORD` repository secrets

To build it yourself you need Node 22, JDK 21 and the Android SDK; run the same steps.
