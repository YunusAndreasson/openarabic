# Social Auth Setup - Step-by-Step Guide

This guide will walk you through **exactly** what you need to do to enable Apple and Google Sign In in your OpenArabic app. Follow each step in order.

**Estimated time: 45-60 minutes**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Install Dependencies](#step-1-install-dependencies)
3. [Step 2: Set Up Apple Sign In](#step-2-set-up-apple-sign-in)
4. [Step 3: Set Up Google Sign In](#step-3-set-up-google-sign-in)
5. [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
6. [Step 5: Rebuild and Test](#step-5-rebuild-and-test)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you start, make sure you have:

- [ ] An Apple Developer account ($99/year) - **Required for Apple Sign In**
- [ ] A Google Cloud account (free) - **Required for Google Sign In**
- [ ] Your Supabase project dashboard access
- [ ] Your app's bundle identifier: `openarabic` (iOS) and package name: `com.edenmind.OpenArabic` (Android)

---

## Step 1: Install Dependencies

### 1.1 Install the Required Packages

Open your terminal in the project root (`/home/yunus/Desktop/oa3`) and run:

```bash
yarn add @invertase/react-native-apple-authentication @react-native-google-signin/google-signin
```

**Expected output**: You should see the packages being installed with no errors.

### 1.2 Verify Installation

Check that the packages were added to `package.json`:

```bash
grep -A2 "@invertase/react-native-apple-authentication\|@react-native-google-signin/google-signin" package.json
```

**Expected output**: You should see both packages listed in the dependencies section.

✅ **Checkpoint**: Dependencies installed successfully

---

## Step 2: Set Up Apple Sign In

This section has 3 main parts:

- A. Configure Apple Developer Console
- B. Configure Supabase Dashboard
- C. Update App Code

### Part A: Apple Developer Console Configuration

#### 2.A.1 Enable Sign in with Apple for Your App ID

1. Go to [Apple Developer Account](https://developer.apple.com/account)
2. Click **Certificates, Identifiers & Profiles** in the left sidebar
3. Click **Identifiers** in the left sidebar
4. Find and click on your App ID (should be `openarabic`)
5. Scroll down to **Capabilities** section
6. Find **Sign in with Apple** and check the box to enable it
7. Click **Save** in the top right corner
8. Click **Confirm** in the popup

✅ **Checkpoint**: "Sign in with Apple" is now enabled for your App ID

#### 2.A.2 Create a Services ID (for Web/Android)

1. Still in **Identifiers**, click the **+** button (top left)
2. Select **Services IDs** radio button
3. Click **Continue**
4. Fill in the form:
   - **Description**: `OpenArabic Auth Service`
   - **Identifier**: `openarabic.auth` (write this down!)
5. Click **Continue**, then **Register**

Now configure the Services ID:

6. Click on the Services ID you just created (`openarabic.auth`)
7. Check the box next to **Sign in with Apple**
8. Click **Configure** button next to "Sign in with Apple"
9. In the popup:
   - **Primary App ID**: Select `openarabic` from dropdown
   - **Domains and Subdomains**: Click the **+** button and add:

     ```
     kkmnzbeugdoajtzfjkxg.supabase.co
     ```

     _(This is from your SUPABASE_URL from the codebase)_

   - **Return URLs**: Click the **+** button and add:
     ```
     https://kkmnzbeugdoajtzfjkxg.supabase.co/auth/v1/callback
     ```

10. Click **Save** (bottom right of popup)
11. Click **Continue** (top right)
12. Click **Save** (top right again)

✅ **Checkpoint**: Services ID created with identifier `openarabic.auth`

#### 2.A.3 Create a Sign in with Apple Key

1. In the left sidebar, click **Keys**
2. Click the **+** button (top left)
3. Fill in:
   - **Key Name**: `OpenArabic Sign in with Apple Key`
4. Check the box next to **Sign in with Apple**
5. Click **Configure** button next to "Sign in with Apple"
6. In the popup:
   - **Primary App ID**: Select `openarabic`
7. Click **Save** (bottom right of popup)
8. Click **Continue** (top right)
9. Click **Register** (top right)

**IMPORTANT - Download the Key:**

10. You'll see a download button - click **Download** immediately
11. The file will be named something like `AuthKey_ABC123XYZ.p8`
12. **Save this file safely** - you can only download it once!
13. Note down the **Key ID** shown on the page (looks like `ABC123XYZ`)
14. Click **Done**

**Also note your Team ID:**

15. In the top right corner of the page, click your name/account
16. Your **Team ID** is shown (10-character alphanumeric, e.g., `X1Y2Z3A4B5`)
17. Write this down!

✅ **Checkpoint**: You should have:

- [ ] `.p8` file downloaded
- [ ] Key ID written down (e.g., `ABC123XYZ`)
- [ ] Team ID written down (e.g., `X1Y2Z3A4B5`)

### Part B: Supabase Dashboard Configuration

#### 2.B.1 Configure Apple Provider in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your **OpenArabic** project
3. Click **Authentication** in the left sidebar
4. Click **Providers** tab
5. Scroll down and find **Apple** provider
6. Click to expand it
7. Toggle **Enable Sign in with Apple** to ON
8. Fill in the form:
   - **Apple Services ID**:

     ```
     openarabic.auth
     ```

     _(The identifier from step 2.A.2)_

   - **Apple Team ID**:

     ```
     [Your Team ID from step 2.A.3]
     ```

     _(Example: X1Y2Z3A4B5)_

   - **Apple Key ID**:

     ```
     [Your Key ID from step 2.A.3]
     ```

     _(Example: ABC123XYZ)_

   - **Apple Secret Key**:
     - Open the `.p8` file you downloaded in a text editor
     - Copy the **entire contents** including the header and footer:
       ```
       -----BEGIN PRIVATE KEY-----
       [lots of characters]
       -----END PRIVATE KEY-----
       ```
     - Paste it into this field

9. Click **Save** at the bottom

✅ **Checkpoint**: Apple provider is enabled and configured in Supabase

### Part C: Update App Code for Android

#### 2.C.1 Update Android Configuration

1. Open `hooks/auth/useAppleAuth.ts` in your code editor
2. Find line ~59 where it says:

   ```typescript
   appleAuthAndroid.configure({
     clientId: 'YOUR_APPLE_SERVICE_ID', // TODO: Add to env vars
     redirectUri: 'https://your-project.supabase.co/auth/v1/callback', // TODO: Configure
   ```

3. Replace with:

   ```typescript
   appleAuthAndroid.configure({
     clientId: 'openarabic.auth',
     redirectUri: 'https://kkmnzbeugdoajtzfjkxg.supabase.co/auth/v1/callback',
   ```

4. Save the file

✅ **Checkpoint**: Apple Sign In is fully configured!

---

## Step 3: Set Up Google Sign In

This section has 3 main parts:

- A. Create OAuth Credentials in Google Cloud Console
- B. Configure Supabase Dashboard
- C. Add Environment Variables

### Part A: Google Cloud Console - OAuth Credentials

#### 3.A.1 Create/Select a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with your Google account
3. Either:
   - **If you have an existing project**: Select it from the dropdown at the top
   - **If you need a new project**:
     - Click the project dropdown at the top
     - Click **New Project**
     - Name it `OpenArabic`
     - Click **Create**
     - Wait for it to be created, then select it

✅ **Checkpoint**: You have a Google Cloud project selected

#### 3.A.2 Enable Required APIs

1. In the left sidebar, click **APIs & Services** → **Library**
2. Search for `Google Sign-In API`
3. Click on it, then click **Enable**
4. Wait for it to enable

#### 3.A.3 Configure OAuth Consent Screen

**This is required before creating credentials**

1. In the left sidebar, click **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace)
3. Click **Create**
4. Fill in the form:

   **App information:**
   - **App name**: `OpenArabic`
   - **User support email**: [Your email]

   **App domain (optional but recommended):**
   - **Application home page**: `https://openarabic.io` (or your website)

   **Developer contact information:**
   - **Email addresses**: [Your email]

5. Click **Save and Continue**
6. On **Scopes** page, click **Save and Continue** (default scopes are fine)
7. On **Test users** page, click **Save and Continue**
8. Review and click **Back to Dashboard**

✅ **Checkpoint**: OAuth consent screen configured

#### 3.A.4 Create Web Client ID (for Supabase)

1. In the left sidebar, click **APIs & Services** → **Credentials**
2. Click **Create Credentials** at the top
3. Select **OAuth client ID**
4. **Application type**: Select **Web application**
5. Fill in:
   - **Name**: `OpenArabic Web Client`
   - **Authorized JavaScript origins**: Leave empty
   - **Authorized redirect URIs**: Click **+ ADD URI** and enter:
     ```
     https://kkmnzbeugdoajtzfjkxg.supabase.co/auth/v1/callback
     ```
6. Click **Create**
7. A popup will show your credentials:
   - **Copy the Client ID** - it looks like: `123456789-abcdefg.apps.googleusercontent.com`
   - **Copy the Client Secret** - it looks like: `GOCSPX-abc123xyz`
   - **Write both down safely!**
8. Click **OK**

✅ **Checkpoint**: Web Client ID and Secret saved

#### 3.A.5 Create iOS Client ID

1. Still in **Credentials** page, click **Create Credentials** again
2. Select **OAuth client ID**
3. **Application type**: Select **iOS**
4. Fill in:
   - **Name**: `OpenArabic iOS`
   - **Bundle ID**: `openarabic`
5. Click **Create**
6. **Copy the Client ID** (format: `123456789-abcdefg.apps.googleusercontent.com`)
7. **Write it down** - label it as "iOS Client ID"
8. Click **OK**

✅ **Checkpoint**: iOS Client ID saved

#### 3.A.6 Get Android Debug SHA-1 Fingerprint

**You need your debug keystore SHA-1 to create the Android credentials**

1. Open terminal in your project root
2. Run this command:

   ```bash
   cd android && ./gradlew signingReport && cd ..
   ```

3. Look for output like this (in the "Variant: debug" section):

   ```
   Variant: debug
   Config: debug
   Store: /home/yunus/.android/debug.keystore
   Alias: AndroidDebugKey
   MD5: XX:XX:XX:...
   SHA1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0
   SHA-256: XX:XX:XX:...
   ```

4. **Copy the SHA1 value** (the line with colons, like `A1:B2:C3:D4:...`)
5. **Write it down** - label it as "Android Debug SHA-1"

✅ **Checkpoint**: Android Debug SHA-1 fingerprint obtained

#### 3.A.7 Create Android Client ID (Debug)

1. Back in **Google Cloud Console** → **Credentials**, click **Create Credentials**
2. Select **OAuth client ID**
3. **Application type**: Select **Android**
4. Fill in:
   - **Name**: `OpenArabic Android Debug`
   - **Package name**: `com.edenmind.OpenArabic`
   - **SHA-1 certificate fingerprint**: Paste your SHA-1 from step 3.A.6
5. Click **Create**
6. Click **OK** (Android clients don't show a secret)

✅ **Checkpoint**: Android Debug Client ID created

#### 3.A.8 Create Android Client ID (Production) - Optional for Now

**You can do this later when you have a production keystore**

When you're ready for production:

1. Get your production keystore SHA-1 (from your release keystore or Google Play Console)
2. Create another **Android** OAuth client ID
3. Use the same package name but production SHA-1

### Part B: Supabase Dashboard - Google Provider

#### 3.B.1 Configure Google Provider in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your **OpenArabic** project
3. Click **Authentication** in the left sidebar
4. Click **Providers** tab
5. Find **Google** provider (should be near the top)
6. Click to expand it
7. Toggle **Enable Sign in with Google** to ON
8. Fill in the form:
   - **Client ID (for OAuth)**:

     ```
     [Your WEB Client ID from step 3.A.4]
     ```

     _(Format: `123456789-abcdefg.apps.googleusercontent.com`)_

   - **Client Secret (for OAuth)**:

     ```
     [Your Web Client Secret from step 3.A.4]
     ```

     _(Format: `GOCSPX-abc123xyz`)_

   - **Authorized Client IDs** (click to expand this section):

     ```
     [Web Client ID],[iOS Client ID]
     ```

     **Example format:**

     ```
     123456789-abcdefg.apps.googleusercontent.com,987654321-hijklmn.apps.googleusercontent.com
     ```

     **Important**:
     - Comma-separated, NO spaces
     - Include: Web Client ID, iOS Client ID
     - You can add Android Client IDs later when needed

9. Click **Save** at the bottom

✅ **Checkpoint**: Google provider enabled and configured in Supabase

---

## Step 4: Configure Environment Variables

#### 4.1 Create .env File

1. In your project root, check if `.env` file exists:

   ```bash
   ls -la .env
   ```

2. If it doesn't exist, copy from the example:

   ```bash
   cp .env.example .env
   ```

3. If you already have a `.env` file, just open it in your editor

#### 4.2 Add Google Credentials

1. Open `.env` file in your code editor
2. Add these lines (or update if they exist):

   ```bash
   # Google Sign In Configuration
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=[Your Web Client ID from step 3.A.4]
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=[Your iOS Client ID from step 3.A.5]
   ```

   **Example (with your actual values):**

   ```bash
   # Google Sign In Configuration
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=987654321-hijklmn.apps.googleusercontent.com
   ```

3. Save the file

#### 4.3 Verify .gitignore

Make sure `.env` is NOT committed to git:

```bash
grep "^\.env$" .gitignore
```

**Expected output**: `.env`

If you don't see it, add `.env` to your `.gitignore` file.

✅ **Checkpoint**: Environment variables configured

---

## Step 5: Rebuild and Test

### 5.1 Prebuild Native Projects

The native code needs to be regenerated to include the new libraries:

```bash
npx expo prebuild --clean
```

**Expected output**:

- Should complete without errors
- You'll see "iOS project configured" and "Android project configured"

**This will take 2-3 minutes**

✅ **Checkpoint**: Prebuild completed successfully

### 5.2 Install iOS Pods

```bash
cd ios && pod install && cd ..
```

**Expected output**:

- Pods installed successfully
- Should see "Installing @invertase/react-native-apple-authentication"
- Should see "Installing @react-native-google-signin/google-signin"

**This will take 2-5 minutes**

✅ **Checkpoint**: iOS dependencies installed

### 5.3 Test on iOS

#### Option A: iOS Simulator (Limited Testing)

```bash
npx expo run:ios
```

**What you can test:**

- ✅ App launches without crashes
- ✅ Social auth buttons appear
- ✅ Google Sign In works (opens browser/Google modal)
- ❌ Apple Sign In won't fully work (needs real device)

#### Option B: iOS Real Device (Full Testing)

1. Connect your iPhone via USB
2. Open Xcode: `open ios/OpenArabic.xcworkspace`
3. Select your device from the device dropdown
4. Click the Play button or press Cmd+R
5. You may need to trust your developer certificate on the device

**What you can test:**

- ✅ App launches
- ✅ Social auth buttons appear
- ✅ Google Sign In works completely
- ✅ Apple Sign In works completely

### 5.4 Test on Android

```bash
npx expo run:android
```

**Requirements:**

- Android device connected via USB or emulator running
- Make sure the emulator has Google Play Services (use a "Google APIs" image)

**What you can test:**

- ✅ App launches
- ✅ Social auth buttons appear
- ✅ Google Sign In works (if Play Services available)
- ✅ Apple Sign In opens web browser for OAuth

✅ **Checkpoint**: App builds and runs!

### 5.5 Test the Authentication Flow

#### Testing Apple Sign In:

1. Tap "Sign in with Apple" button
2. **On iOS device**: Native Apple Sign In modal appears
   - Sign in with your Apple ID
   - Choose to share your email (or hide it)
   - Optionally share your name
3. **On Android**: Browser opens for Apple OAuth
4. After successful sign-in, you should be redirected to the Library tab
5. Check that your profile shows up (if you shared info)

**Expected behavior:**

- First sign-in: Apple asks for email/name permissions
- Subsequent sign-ins: Automatic (no permissions prompt)
- App redirects to Library tab on success
- User is authenticated in Supabase

#### Testing Google Sign In:

1. Tap "Sign in with Google" button
2. Google account picker appears
3. Select your Google account
4. After successful sign-in, you should be redirected to Library tab

**Expected behavior:**

- Google account picker shown
- No permissions prompt (just account selection)
- App redirects to Library tab on success
- User is authenticated in Supabase

#### Testing Email/Password (ensure it still works):

1. Try signing in with email/password
2. Try creating an account with email/password
3. Both should still work as before

✅ **Checkpoint**: All authentication methods working!

---

## Troubleshooting

### General Issues

#### "Module not found" errors after installation

**Solution:**

```bash
# Clear cache and reinstall
rm -rf node_modules
yarn install
npx expo prebuild --clean
```

#### Environment variables not loading

**Solution:**

```bash
# Restart Metro with cache clear
npx expo start -c
```

Make sure your env variables have the `EXPO_PUBLIC_` prefix!

---

### Apple Sign In Issues

#### iOS Simulator: "The operation couldn't be completed"

**This is expected!** Apple Sign In doesn't fully work on iOS simulators.

**Solution:** Test on a real iOS device

#### iOS Device: "Invalid client" or "Invalid redirect URI"

**Cause:** Mismatch between Apple Developer Console and Supabase config

**Solution:**

1. Double-check Services ID in Apple Developer Console: `openarabic.auth`
2. Verify redirect URI includes correct Supabase project ID
3. Make sure you clicked "Save" in both the popup AND the main page in Apple Console

#### Android: "Invalid client"

**Solution:**

1. Verify `clientId` in `hooks/auth/useAppleAuth.ts` line ~59 is `openarabic.auth`
2. Verify `redirectUri` matches Supabase URL exactly
3. Make sure Services ID has the web domain configured in Apple Developer Console

#### "Name and email are null"

**This is partially expected!**

Apple only provides name and email **on the first sign-in**.

**Solution for testing:**

1. Delete the app from your device
2. Go to Settings → Apple ID → Password & Security → Apps Using Apple ID
3. Remove OpenArabic from the list
4. Reinstall and sign in again - you'll get name/email

**Solution for production:**

- The app saves name/email in user_metadata on first sign-in
- It's stored in Supabase and won't be lost

---

### Google Sign In Issues

#### Android: "DEVELOPER_ERROR" or "10" error code

**Cause:** SHA-1 fingerprint mismatch or package name mismatch

**Solution:**

1. Verify your SHA-1 fingerprint is correct:
   ```bash
   cd android && ./gradlew signingReport
   ```
2. Copy the SHA1 from "Variant: debug" section
3. Make sure it matches what you entered in Google Cloud Console
4. Verify package name is exactly: `com.edenmind.OpenArabic`
5. Wait 5-10 minutes after creating/updating OAuth client (Google needs time to propagate)

#### Android: "Sign in failed: Play Services not available"

**Cause:** Android emulator doesn't have Google Play Services

**Solution:**

- Use an emulator image with Google APIs (not the basic AOSP image)
- Or test on a real Android device

#### iOS/Android: "Sign in failed" with no specific error

**Cause:** Client IDs not registered in Supabase

**Solution:**

1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Check "Authorized Client IDs" field
3. Make sure it includes both Web and iOS Client IDs
4. Format: `web-id,ios-id` (comma-separated, no spaces)

#### "No response" or sign-in hangs

**Cause:** Web Client ID not configured or incorrect

**Solution:**

1. Verify `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env` file
2. Make sure it's the **Web** Client ID (not iOS or Android)
3. Restart Metro: `npx expo start -c`
4. Rebuild: `npx expo run:ios` or `npx expo run:android`

---

### Supabase Issues

#### "User already exists" when using different provider

**Scenario:** You signed up with email, then try to use Google with same email

**This is expected behavior** - Supabase treats each provider separately

**Solutions:**

1. Sign in with the original method you used
2. Or enable "Allow Multiple Accounts with Same Email" in Supabase Dashboard (not recommended)
3. Or link accounts programmatically (advanced)

#### Checking Supabase Auth Logs

If you're having authentication issues:

1. Go to Supabase Dashboard → Authentication → Logs
2. Click on recent log entries to see details
3. Look for error messages that indicate what went wrong

---

## Verification Checklist

After completing all steps, verify:

**Apple Sign In:**

- [ ] Services ID created in Apple Developer Console
- [ ] Sign in with Apple key created and `.p8` file downloaded
- [ ] Apple provider enabled in Supabase with all credentials
- [ ] Android config updated in `useAppleAuth.ts`
- [ ] Works on iOS real device
- [ ] Works on Android (web flow)

**Google Sign In:**

- [ ] Web OAuth client created in Google Cloud Console
- [ ] iOS OAuth client created
- [ ] Android OAuth client created (at least debug version)
- [ ] Google provider enabled in Supabase with credentials
- [ ] Environment variables set in `.env` file
- [ ] Works on iOS simulator/device
- [ ] Works on Android device/emulator with Play Services

**General:**

- [ ] App builds without errors
- [ ] Social auth buttons appear on login screen
- [ ] Email/password auth still works
- [ ] Users are redirected to Library tab after successful sign-in
- [ ] Analytics tracks sign-in method

---

## What to Do If You're Stuck

1. **Check the console/logs:**
   - Metro bundler output
   - Xcode console (iOS)
   - Logcat (Android)
   - Supabase Dashboard → Authentication → Logs

2. **Verify credentials match:**
   - Apple Services ID in Developer Console vs Supabase vs code
   - Google Client IDs in Cloud Console vs Supabase vs `.env`

3. **Try the "nuclear option":**

   ```bash
   # Clean everything
   rm -rf node_modules ios android
   yarn install
   npx expo prebuild --clean
   cd ios && pod install && cd ..

   # Rebuild
   npx expo run:ios
   npx expo run:android
   ```

4. **Still stuck?** Check:
   - `SOCIAL_AUTH_SETUP.md` for more detailed technical info
   - Supabase docs: https://supabase.com/docs/guides/auth/social-login
   - Google Sign-In docs: https://github.com/react-native-google-signin/google-signin
   - Apple Sign-In docs: https://github.com/invertase/react-native-apple-authentication

---

## Success! 🎉

If you've completed all steps and both providers work:

1. Commit your changes:

   ```bash
   git add .
   git commit -m "feat: add Apple and Google Sign In support"
   ```

2. **Do NOT commit:**
   - `.env` file (should be in `.gitignore`)
   - Your `.p8` private key
   - Any secrets or credentials

3. Test thoroughly:
   - Try signing in with all three methods (Apple, Google, Email)
   - Try signing up with each method
   - Test on both iOS and Android
   - Test on real devices

You're now ready to deploy! 🚀
