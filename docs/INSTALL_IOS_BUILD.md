# Fix: "No development build installed" / xcodebuild error 70

## What’s going wrong

- **"No development build (com.rhoodapp.mobile) for this project is installed"**  
  The iOS Simulator doesn’t have your app yet. You need to build and install it once.

- **"xcodebuild exited with error code 70" / "Unable to find a destination" / "iOS 26.2 is not installed"**  
  Your Xcode is set up to use **iOS 26.2**, but that platform isn’t installed. Until it is, Xcode won’t offer any simulators or devices as valid destinations.

## Fix: Install the iOS 26.2 platform in Xcode

1. Open **Xcode**.
2. Go to **Xcode → Settings…** (or **Preferences…**).
3. Open the **Platforms** tab (or **Components** in older Xcode).
4. Find **iOS 26.2** (or the version mentioned in the error).
5. Click **Get** / the download button and wait for the install to finish.
6. Quit Xcode, then in your project folder run:

   ```bash
   npm run ios
   ```

   This builds your app and installs it on the default (or booted) simulator.

## After the first install

- Start the dev server: **`npm run start`**
- Press **`i`** to open the app on the iOS Simulator (the dev build you installed will launch).

## Optional: Use an older simulator (e.g. iOS 18.6)

After you’ve installed the iOS 26.2 platform so builds succeed:

1. Boot the **older** simulator (e.g. iPhone 16 Pro, which is usually iOS 18.6):
   ```bash
   npm run ios:sim
   ```
2. With that simulator running, build and install the app on it:
   ```bash
   npm run ios
   ```
   The app is installed on whichever simulator is currently booted, so you can preview on the older OS.

**Note:** Until iOS 26.2 is installed in Xcode, no simulator (old or new) will be offered as a build destination. Installing 26.2 fixes that; you can still choose to run on an older simulator by booting it first, then running `npm run ios`.
