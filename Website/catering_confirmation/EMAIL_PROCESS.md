# Catering Email Process — Samosaman

## Overview

Manual catering confirmation email flow. Emails are hand-crafted HTML files sent via Gmail (or another client). No automated sending is currently wired up.

---

## Files

| File | Purpose |
|------|---------|
| `catering_confirmation/email.html` | Base/template confirmation email |
| `catering_confirmation/email-dahiro.html` | Customized email for Dahiro (first customer test) |
| `catering_confirmation/images/` | Local copies of email images (not used in sent email) |
| `public/assets/catering-email/` | **Live hosted** image copies — these are the URLs used in the email HTML |

---

## Image Hosting

Images are deployed via **Firebase Hosting** at:

```
https://samosaman-6895e.web.app/assets/catering-email/<filename>
```

The `email-dahiro.html` already references these full URLs. Any new customer email should do the same — copy the image to `public/assets/catering-email/` and deploy before sending.

---

## Email Sequence (Intended Flow)

1. **Catering Inquiry Confirmation** — sent automatically when a customer submits an inquiry form (not yet implemented as automated)
2. **Catering Order Confirmation** — sent manually by the team after reviewing the inquiry (~24 hours later), includes invoice and payment details

Pricing: **$4.00 per samosa**

---

## Sending an Email to a Customer

### Step 1 — Preview
```bash
open /Users/hakeem/Desktop/Samosaman/Website/catering_confirmation/email-<customer>.html
```

### Step 2 — Deploy any new images
```bash
firebase deploy --only hosting
```

### Step 3 — Send via Gmail
Use a browser extension like **"Inline Google Analytics"** or **"Yet Another Mail Merge"**, or:

1. Open the HTML file in Chrome
2. Select All → Copy
3. Paste into Gmail compose (not as attachment — paste the rendered content)

> Gmail strips raw HTML if you paste source code. Always paste the *rendered* page, not the HTML source.

---

## Creating a New Customer Email

1. Duplicate `email-dahiro.html` → rename to `email-<customername>.html`
2. Update: customer name, event date, event location, item quantities, invoice totals
3. If using new images, copy them to `public/assets/catering-email/` and run `firebase deploy --only hosting`
4. Preview in browser, then send via Gmail

---

## Current Status (as of 2026-03-13)

- `email-dahiro.html` — complete, images live on Firebase, ready to send
- Automated email triggers via Firebase Cloud Functions — **reverted / not active**
- The `functions/` directory has email templates but auto-send is not deployed

---

## Next Steps (When Ready to Automate)

- Re-implement Firebase Cloud Function triggers for inquiry confirmation
- Wire catering order confirmation to send after team approval step
- Consider using **SendGrid** or **Nodemailer + Gmail SMTP** inside Cloud Functions
