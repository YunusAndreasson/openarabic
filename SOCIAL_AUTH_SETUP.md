# Social Authentication Setup Guide

This guide covers the configuration needed to enable Apple and Google Sign In for the OpenArabic app.

## Overview

The app now supports social authentication using:

- **Apple Sign In**: Native implementation via `@invertase/react-native-apple-authentication`
- **Google Sign In**: Native implementation via `@react-native-google-signin/google-signin`

Both integrations use Supabase's `signInWithIdToken()` method for secure authentication.

---

## Installation

First, install the required dependencies:

```bash
yarn add @invertase/react-native-apple-authentication @react-native-google-signin/google-signin
```

Then rebuild your app:

```bash
npx expo prebuild
npx expo run:ios
npx expo run:android
```

---

## Apple Sign In Configuration

### 1. Apple Developer Console Setup

1. **Enable Sign in with Apple Capability**:
   - Go to your app's [Apple Developer Console](https://developer.apple.com/account)
   - Navigate to **Certificates, Identifiers & Profiles**
   - Select your App ID
   - Enable **Sign in with Apple** capability
   - Save changes

2. **Create a Services ID** (for web/Android OAuth):
   - In **Identifiers**, click **+** to create a new identifier
   - Select **Services IDs**
   - Register a new Services ID (e.g., `openarabic.auth`)
   - Enable **Sign in with Apple**
   - Configure **Domains and Subdomains**: Add your Supabase project URL domain
   - Configure **Return URLs**: Add `https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback`

3. **Create a Sign in with Apple Key**:
   - In **Keys**, click **+** to create a new key
   - Enable **Sign in with Apple**
   - Download the `.p8` private key file (keep this secure!)
   - Note the **Key ID** and **Team ID**

### 2. Supabase Dashboard Configuration

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **Providers**
3. Enable **Apple** provider
4. Configure the following:
   - **Services ID**: Your Apple Services ID (e.g., `openarabic.auth`)
   - **Team ID**: Your Apple Team ID (10-character alphanumeric)
   - **Key ID**: The Key ID from your `.p8` file
   - **Private Key**: Paste the contents of your `.p8` file
5. Save changes

### 3. App Configuration

The `app.json` has already been updated with `"usesAppleSignIn": true` in the iOS section.

**No environment variables needed** for Apple Sign In - it uses native authentication!

### 4. Android Configuration (Optional)

For Android users to use Apple Sign In (via web OAuth), update the Android configuration in `hooks/auth/useAppleAuth.ts`:

```typescript
// Replace these values in the Android section:
appleAuthAndroid.configure({
  clientId: 'openarabic.auth', // Your Apple Services ID
  redirectUri: 'https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback',
  responseType: appleAuthAndroid.ResponseType.ALL,
  scope: appleAuthAndroid.Scope.ALL,
  nonce: rawNonce,
  state,
});
```

---

## Google Sign In Configuration

### 1. Google Cloud Console Setup

1. **Create OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create or select your project
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**

2. **Create Web Client ID** (for Supabase):
   - Application type: **Web application**
   - Name: "OpenArabic Web Client"
   - Authorized redirect URIs: `https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback`
   - Save and note the **Client ID** and **Client Secret**

3. **Create iOS Client ID**:
   - Application type: **iOS**
   - Name: "OpenArabic iOS"
   - Bundle ID: `openarabic` (from app.json)
   - Save and note the **Client ID**

4. **Create Android Client ID (Debug)**:
   - Application type: **Android**
   - Name: "OpenArabic Android Debug"
   - Package name: `com.edenmind.OpenArabic` (from app.json)
   - Get SHA-1 certificate fingerprint:
     ```bash
     # For debug builds:
     cd android && ./gradlew signingReport
     # Look for "SHA1" under "Variant: debug"
     ```
   - Enter the SHA-1 fingerprint
   - Save and note the **Client ID**

5. **Create Android Client ID (Production)**:
   - Same as debug, but use production keystore SHA-1
   - Get production SHA-1 from your release keystore or Google Play Console

### 2. Supabase Dashboard Configuration

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **Providers**
3. Enable **Google** provider
4. Configure:
   - **Client ID**: Your **Web** Client ID from Google Cloud Console
   - **Client Secret**: Your Web Client Secret
   - **Authorized Client IDs**: Add all your client IDs (Web, iOS, Android debug, Android production) as a comma-separated list
5. Save changes

### 3. Environment Variables

Add these to your `.env` file (create it if it doesn't exist):

```bash
# Google Sign In Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

**Important**: The Web Client ID is **required** (used for token validation with Supabase).

### 4. Android Additional Setup

The `@react-native-google-signin/google-signin` library requires Google Play Services on Android. The hook automatically handles this with a user-friendly error message if Play Services are unavailable.

---

## Testing

### iOS Testing

1. **Apple Sign In**:
   - Works on **real devices** only (simulators have limitations)
   - Test with a real Apple ID or use sandbox Apple IDs from Apple Developer Console
   - On first sign-in, Apple will prompt for name/email permissions
   - Subsequent sign-ins will be automatic

2. **Google Sign In**:
   - Works on both simulators and real devices
   - Requires Google account

### Android Testing

1. **Apple Sign In**:
   - Uses web OAuth flow
   - Opens browser for authentication
   - Requires Apple Services ID configuration

2. **Google Sign In**:
   - Requires Google Play Services
   - Test with both debug and release builds (different SHA-1 fingerprints)
   - Release builds require production SHA-1 registered in Google Cloud Console

---

## Troubleshooting

### Apple Sign In

**iOS Simulator Issues**:

- Error: "The operation couldn't be completed"
- Solution: Test on a real device

**Android Issues**:

- Error: "Invalid client"
- Solution: Verify Services ID configuration in Apple Developer Console
- Solution: Check redirect URI matches Supabase project URL

**Name/Email Missing**:

- Apple only provides full name and email on the **first sign-in**
- The app captures this in `user_metadata` automatically
- For testing, delete the app and sign in again to receive name/email

### Google Sign In

**"DEVELOPER_ERROR" on Android**:

- Solution: Verify SHA-1 fingerprint is correct for your build type
- Solution: Ensure package name matches `com.edenmind.OpenArabic`
- Solution: Check Client IDs are registered in Supabase dashboard

**"Sign in cancelled"**:

- This is expected when users close the sign-in modal
- App handles this silently without error messages

**"Play Services not available"**:

- Android emulator may need Google Play Services installed
- Use emulator image with Google APIs

### General Issues

**"No session created"**:

- Verify Supabase provider is enabled and configured correctly
- Check Supabase logs in Dashboard → Authentication → Logs
- Ensure redirect URIs match exactly (including trailing slashes)

**Environment variables not loading**:

- Restart Metro bundler: `npx expo start -c`
- Verify `.env` file is in project root
- Check `EXPO_PUBLIC_` prefix is used

---

## Security Notes

1. **Never commit** `.env` file to version control (add to `.gitignore`)
2. **Keep private keys secure** - never expose Apple `.p8` files or Google Client Secrets
3. **Rotate keys regularly** - Apple requires key rotation every 6 months
4. **Use environment-specific configs** - separate credentials for dev/staging/production

---

## Analytics

Social authentication events are automatically tracked via Mixpanel:

- **Sign In** with `method: 'apple'` or `method: 'google'`
- **Sign Up** with `method: 'apple'` or `method: 'google'`

This allows you to monitor which authentication methods users prefer.

---

## Additional Resources

- [Supabase Social Auth Docs](https://supabase.com/docs/guides/auth/social-login)
- [Apple Sign In Setup](https://github.com/invertase/react-native-apple-authentication)
- [Google Sign In Setup](https://github.com/react-native-google-signin/google-signin)
- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication/)
