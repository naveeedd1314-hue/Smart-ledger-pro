# SmartLedger Pro — Firebase account sign-in setup

SmartLedger supports persistent Google and email/password sign-in through Firebase Authentication. The app can still be used in offline mode before Firebase is connected.

## 1. Create and configure Firebase

1. Open https://console.firebase.google.com/ and create a project.
2. In **Build → Authentication → Sign-in method**, enable **Email/Password** and **Google**.
3. In **Project settings → General**, add a **Web app** and copy its Firebase configuration.
4. In **Authentication → Settings → Authorized domains**, add the GitHub Pages host:
   `naveeedd1314-hue.github.io`
   Also keep the Firebase `*.firebaseapp.com` auth domain listed.

## 2. Add GitHub Actions secrets

Open the SmartLedger Pro repository → **Settings → Secrets and variables → Actions → New repository secret**. Add these four secrets using the values from the Firebase Web app configuration:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

The API key in a Firebase web configuration is a client identifier, not a server credential. Do not put service-account private keys in the app.

## 3. Build and test

After adding the secrets, run the **Build SmartLedger Pro APK** and **Deploy SmartLedger Pro PWA** workflows from the Actions tab, or push a new commit. Test Google sign-in and email/password sign-in on the actual Android device.

## Data handling

The first Firebase account used on a device receives the existing unscoped local SmartLedger records. Thereafter, local SmartLedger data is separated by Firebase user ID on that device. This is local device storage, not cloud backup or multi-device synchronization. Export a SmartLedger backup before changing accounts or reinstalling the app.
