# Google Auth Custom Domain Change

Date: June 28, 2026

## Summary

Google sign-in was showing:

```text
to continue to samosaman-6895e.firebaseapp.com
```

The website Firebase config was still using the default Firebase Auth domain. The local config has been changed so Firebase Auth uses the public website domain instead:

```text
samosamanvt.com
```

## Repository Changes

Changed:

```text
Website/public/js/firebase-init.js
```

From:

```js
authDomain: "samosaman-6895e.firebaseapp.com",
```

To:

```js
authDomain: "samosamanvt.com",
```

Updated:

```text
Website/test/myaccount-order-history.test.js
```

The test now asserts that Firebase Auth uses `samosamanvt.com` and does not use `samosaman-6895e.firebaseapp.com`.

## Playwright Verification

Before the change, Playwright reproduced the Google sign-in popup and confirmed the visible text:

```text
to continue to samosaman-6895e.firebaseapp.com
```

After the change, Firebase generated the new redirect URI:

```text
https://samosamanvt.com/__/auth/handler
```

Google then returned:

```text
Error 400: redirect_uri_mismatch
```

That means the code change is working, but the Google OAuth client still needs to authorize the new redirect URI.

## Required Google Cloud Settings

Project:

```text
samosaman-6895e
```

OAuth client ID:

```text
315563373437-jc22jt4ri62v6qp0eh0m816hdr4rt9oa.apps.googleusercontent.com
```

In the Google Cloud OAuth client, keep both the old Firebase redirect URI and the new custom-domain redirect URI.

Authorized JavaScript origins:

```text
https://samosamanvt.com
```

Authorized redirect URIs:

```text
https://samosamanvt.com/__/auth/handler
https://samosaman-6895e.firebaseapp.com/__/auth/handler
```

Important: `https://samosamanvt.com/__/auth/handler` belongs in Authorized redirect URIs, not Authorized JavaScript origins. If entered into origins, Google shows an "invalid origin" error because origins cannot contain a path.

## Required Firebase Setting

In Firebase Authentication settings, Authorized domains should include:

```text
samosamanvt.com
```

## Verification Command

The local regression test passed with:

```sh
node --test test/myaccount-order-history.test.js
```

## Deployment Note

After deploying the website change and saving the Google OAuth client settings, retry Google sign-in. Google OAuth setting changes can take a few minutes to propagate.
