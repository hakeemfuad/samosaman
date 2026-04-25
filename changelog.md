# Samosaman Website - Change Log

Running log of updates and refinements to the Samosaman website.

## 2026-02-15

### Bug Fixes
- **Payment Processing**: Fixed "Cannot access 'safePayment' before initialization" error in `functions/index.js`. Moved `safePayment` variable declaration to execute before it's used in points history recording (line 156 → after payment response).

### Form Validation
- **Contact Information & Delivery Details Validation**: Implemented comprehensive form validation across both checkout pages:
  - `checkout.html` and `guest-checkout.html` now have required field validation
  - Red border styling (border-red-500, border-2) applied to empty required fields on form submission
  - Red styling automatically clears when user starts typing
  - Smart scrolling to highest positioned invalid section (Contact Information takes priority over Delivery Details)
  - Added "*All fields must be filled out" helper text under both section headers
  - Contact fields: fname, lname, email, phone
  - Delivery fields: del-address, del-city, del-state, del-zip, delivery-branch

### Catering Inquiry Confirmation Flow
- **Backend Function**: Created new Cloud Function `submitCateringInquiry` in `functions/index.js` to handle catering inquiries
- **Data Persistence**: Catering inquiries now saved to Firestore `catering_inquiries` collection with full details
- **Email Confirmations**: Implemented dual email system:
  - Beautiful customer confirmation email with inquiry details and 24-hour response promise
  - Terminal-style restaurant notification email with all order details
  - Both emails use professional HTML templates with SamosaMan branding
- **Frontend Integration**: Updated `catering.html` with:
  - Loading overlay animation ("Submitting your inquiry...")
  - Enhanced success modal with personalized customer name display
  - Form submission now calls backend API at `submitCateringInquiry`
  - Error handling with detailed console logging for debugging
- **Processing Flow**: User sees loading spinner → success modal → confirmation email

### SEO Optimization
- **Meta Tags**: Added comprehensive SEO meta tags to 4 key pages:
  - `index.html` - Homepage with local business keywords
  - `menu.html` - Menu page with ordering keywords
  - `catering.html` - Catering page with event/corporate keywords
  - `our-story.html` - Brand story page with brand keywords

- **Open Graph & Twitter Cards**: All pages now have:
  - Proper social media sharing metadata
  - og:image pointing to `assets/og-image.jpg` (1200x630px)
  - Twitter card support for X/Twitter sharing

- **Structured Data**: Added LocalBusiness schema to homepage (`index.html`):
  - Restaurant type with all 3 locations
  - Complete address information for Burlington, Boston, Hanover
  - Geographic coordinates for each location
  - Opening hours specification
  - Social media links (Facebook, Instagram)

- **Sitemaps & Robots**: Created new files in `/public/`:
  - `sitemap.xml` - Complete XML sitemap with all 13 pages, priorities, and update frequencies
  - `robots.txt` - Search engine crawler guidelines, disallows checkout/account pages from indexing

- **Canonical URLs**: All pages now have canonical URL meta tags to prevent duplicate content issues

### Files Created
- `/public/sitemap.xml` - XML sitemap for search engines
- `/public/robots.txt` - Search engine crawler guidelines

### Files Modified
- `functions/index.js` - Added `submitCateringInquiry` function + email templates
- `public/index.html` - Added SEO meta tags + structured data
- `public/menu.html` - Added SEO meta tags
- `public/catering.html` - Added SEO meta tags + backend integration
- `public/our-story.html` - Added SEO meta tags
- `public/checkout.html` - Added form validation
- `public/guest-checkout.html` - Added form validation

### Next Steps (TODO)
- [ ] Update structured data in index.html with real phone numbers and addresses
- [ ] Create og-image.jpg (1200x630px) and upload to `/assets/`
- [ ] Update all domain URLs if not using samosamanvt.com
- [ ] Submit sitemap to Google Search Console
- [ ] Create Google My Business profiles for each location
- [ ] Add alt text to all images across the site
- [ ] Optimize images to WebP format and compress sizes
- [ ] Add lazy loading to images
- [ ] Optimize remaining location pages (burlington.html, boston.html, hanover.html) with SEO tags
- [ ] Deploy updated functions to Firebase

## 2026-02-10
### Refinements
- **Closed Store Modal**: Removed the "Today" option from the "We're Closed Right Now" modal on both `checkout.html` and `guest-checkout.html`.
- **Scheduling Logic**: Updated `js/store-hours.js` to ensure pre-orders start from tomorrow when the store is closed.
- **UI Improvements**: Refined date selection labels in the scheduling modal to improve readability.

### Backend & Firebase
- **Cloud Functions (v2)**: Implemented v2 Cloud Functions for payment processing (`processPayment`) and welcome emails (`sendWelcomeEmail`).
- **Loyalty & Rewards**: Added Firestore triggers to award points on payment and automatically send welcome emails to new users.
- **Security & Secrets**: Integrated Firebase Secrets Management for Square API tokens.
- **Verification**: Address validation proximity checks integrated with Google Maps and Firebase backend logic.

## 2026-02-09

### Footer & Navigation
- **Footer Componentization**: Applied the reusable footer component across all remaining HTML pages.
- **Smooth Scroll**: Implemented a custom smooth-scrolling animation for the "Locations" link with specific offsets and durations for better user experience.
- **Anchor Handling**: Added logic to prevent instant browser jumps to anchors, allowing for animated transitions on page load.
