const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const { SquareClient, SquareEnvironment } = require("square");
const crypto = require("crypto");
const cors = require("cors")({ origin: true });
const nodemailer = require('nodemailer');

// Initialize Firebase Admin to access Firestore
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// Configure Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'no_reply@samosamanvt.com',
    pass: 'fahr kjbl gudj bptm'
  }
});

// --- PAYMENT FUNCTION (v2) ---
exports.processPayment = onRequest({ secrets: ["SQUARE_ACCESS_TOKEN"] }, (req, res) => {
  // Initialize SquareClient inside the handler to use the secret
  const client = new SquareClient({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: SquareEnvironment.Sandbox,
  });

  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { sourceId, amount, email, uid, shouldSaveCard, tipAmount, orderType, branch, deliveryDetails, pickupDetails, items, subtotal, tax, discount, firstName, lastName, phone, specialInstructions, scheduledTime, isRedeemingPoints } = req.body;

    try {
      if (uid && isRedeemingPoints) {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        const currentPoints = userDoc.exists ? userDoc.data().rewardPoints || 0 : 0;

        if (currentPoints < 100) {
          throw new Error("Insufficient points for redemption.");
        }

        // Deduct points
        await userRef.update({
          rewardPoints: admin.firestore.FieldValue.increment(-100)
        });

        // Record spending history
        await userRef.collection('points_history').add({
          type: 'spend',
          points: 100,
          description: 'Free Samosa Reward redemption',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        logger.info(`Deducted 100 points from ${uid} for reward redemption.`);
      }

      const idempotencyKey = crypto.randomUUID();
      let customerId = null;
      let paymentSourceId = sourceId;

      if (uid) {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (userDoc.exists && userDoc.data().squareCustomerId) {
          customerId = userDoc.data().squareCustomerId;
        } else {
          const customerReq = {
            emailAddress: email,
            referenceId: uid,
          };

          try {
            const { result } = await client.customers.create(customerReq);
            customerId = result.customer.id;

            await userRef.set({
              squareCustomerId: customerId,
              email: email
            }, { merge: true });
          } catch (e) {
            logger.error("Failed to create Square Customer", e);
          }
        }

        if (shouldSaveCard && customerId) {
          try {
            const cardReq = {
              idempotencyKey: crypto.randomUUID(),
              sourceId: sourceId,
              card: { customerId: customerId }
            };

            const { result } = await client.cards.create(cardReq);
            paymentSourceId = result.card.id;
            logger.info("Card Saved Successfully", { cardId: paymentSourceId });

          } catch (e) {
            logger.error("Failed to save card", e);
            throw new Error("Failed to save card information.");
          }
        }
      }

      const paymentReq = {
        sourceId: paymentSourceId,
        idempotencyKey: idempotencyKey,
        amountMoney: {
          amount: BigInt(Math.round(parseFloat(amount) * 100)),
          currency: 'USD',
        },
        autocomplete: true,
      };

      if (customerId) {
        paymentReq.customerId = customerId;
        paymentReq.buyerEmailAddress = email;
      } else {
        paymentReq.buyerEmailAddress = email;
      }

      const response = await client.payments.create(paymentReq);
      const data = response.result || response;

      if (!data || !data.payment) {
        console.error("Square Response Missing Payment:", JSON.stringify(data, null, 2));
        throw new Error("Payment processed, but response data was missing.");
      }

      const safePayment = JSON.parse(JSON.stringify(data.payment, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));

      if (uid) {
        const pointsEarned = Math.floor(parseFloat(amount) * 10);
        const userRef = db.collection('users').doc(uid);

        await userRef.set({
          rewardPoints: admin.firestore.FieldValue.increment(pointsEarned)
        }, { merge: true });

        // Record earning history
        await userRef.collection('points_history').add({
          type: 'earn',
          points: pointsEarned,
          description: `Points earned from Order #${safePayment.id}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        logger.info(`Awarded ${pointsEarned} points to ${uid}`);
      }

      // Save order to Firestore
      const orderData = {
        orderId: safePayment.id,
        customerId: customerId,
        uid: uid || null,
        customerName: `${firstName || ''} ${lastName || ''}`.trim(),
        customerEmail: email,
        customerPhone: phone || '',
        orderType: orderType || 'pickup',
        branch: branch || 'Burlington',
        deliveryDetails: deliveryDetails || null,
        pickupDetails: pickupDetails || null,
        items: items || [],
        subtotal: parseFloat(subtotal) || 0,
        tax: parseFloat(tax) || 0,
        tip: parseFloat(tipAmount) || 0,
        discount: parseFloat(discount) || 0,
        total: parseFloat(amount) || 0,
        specialInstructions: specialInstructions || '',
        scheduledFor: scheduledTime || null,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        squarePaymentId: safePayment.id
      };

      await db.collection('orders').doc(safePayment.id).set(orderData);
      logger.info("Order saved to Firestore", { orderId: safePayment.id });

      // Send confirmation emails
      try {
        await sendOrderConfirmationEmails(orderData);
        logger.info("Confirmation emails sent", { orderId: safePayment.id });
      } catch (emailErr) {
        logger.error("Failed to send confirmation emails", emailErr);
      }

      logger.info("Payment Success", safePayment);
      res.status(200).json({ success: true, payment: safePayment });

    } catch (error) {
      logger.error("Payment Error:", error);
      res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
    }
  });
});

// --- [UPDATED] WELCOME EMAIL FUNCTION (v2) ---
exports.sendWelcomeEmail = onDocumentCreated("users/{userId}", (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const newUser = snapshot.data();
  const email = newUser.email;
  const firstName = newUser.firstName || 'Samosa Lover';

  // ⚠️ YOU MUST PASTE YOUR PUBLIC IMAGE LINKS HERE ⚠️
  // (Use the direct links ending in .png or .jpg from ImgBB or Firebase)
  const images = {
    logo: "https://i.ibb.co/r268hyb6/231cd8a888582779c5042d2577a2ec56.png", // The SamosaMan logo
    hero: "https://i.ibb.co/Z1271V1b/bb055516724cb0fd45293f8d365b389a.jpg", // The main big Samosa image
    map: "https://i.ibb.co/mrCwhxSm/81ba2e2fc4dd48c72869d314f9479616.jpg", // The "Delivered" image
    salsa: "https://i.ibb.co/4g9jB2jY/a13574d2d1a85fb435b32b6f2be4d565.jpg", // The salsa image
    chickpea: "https://i.ibb.co/KcZy5P6b/d94db3cd09212cf00b839e543db08db4.jpg", // The chickpea image
    smile: "https://i.ibb.co/wVdqqXp/39f3fc5b2111074bc1802082f22f7728.jpg", // The smiling girl image
    footer: "https://i.ibb.co/q3vns84Y/0c81fc20f345f884289aecc44141ba05.png" // The small footer logo
  };

  const mailOptions = {
    from: '"SamosaMan" <no_reply@samosamanvt.com>',
    to: email,
    subject: 'Welcome to the SamosaMan Clan!',
    html: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><style>@media (max-width: 450px) {
        .layout-0 { display: none !important; }
      }
@media (max-width: 450px) and (min-width: 0px) {
        .layout-0-under-450 { display: table !important; }
      }</style><style>@media (max-width: 450px) {
        .layout-1 { display: none !important; }
      }
@media (max-width: 450px) and (min-width: 0px) {
        .layout-1-under-450 { display: table !important; }
      }</style><style>@media (max-width: 450px) {
        .layout-2 { display: none !important; }
      }
@media (max-width: 450px) and (min-width: 0px) {
        .layout-2-under-450 { display: table !important; }
      }</style></head><body style="width:100%;-webkit-text-size-adjust:100%;text-size-adjust:100%;background-color:#f0f1f5;margin:0;padding:0"><table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f0f1f5" style="background-color:#f0f1f5"><tbody><tr><td style="background-color:#f0f1f5"><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;min-height:600px;margin:0 auto;background-color:#ffffff"><tbody><tr><td style="vertical-align:top"></td></tr><tr><td style="vertical-align:top;padding:10px
           0px
           0px
           0px"><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"><tbody><tr><td style="padding:10px 0 10px 0;vertical-align:top"><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.4;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word"><tbody><tr><td style="padding:0px 20px"><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:130px"><tbody><tr><td style="width:100%;padding:20 0"><img src="${images.logo}" width="130" height="112" style="display:block;width:100%;height:auto;max-width:100%"></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:16px;font-weight:700;font-family:Helvetica, Arial, sans-serif;text-align:center;padding:0px 20px"><span style="white-space:pre-wrap"><br></span><span style="font-size:30px;letter-spacing:-0.03em;white-space:pre-wrap">TREAT YOURSELF.<br>YOU EARNED IT.</span><span style="font-size:53.3333px;letter-spacing:-0.03em;white-space:pre-wrap"><br></span></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td style="padding:0px 20px"><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:412px"><tbody><tr><td style="width:100%;padding:20 0"><img src="${images.hero}" width="412" height="285" style="display:block;width:100%;height:auto;max-width:100%"></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td style="padding:0px 20px"><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:300px"><tbody><tr><td style="width:100%;padding:20 0"><a href="https://samosaman-6895e.web.app/burlington.html" target="_blank" style="display:table;width:100%;height:50px;text-decoration:none;border-collapse:separate;box-sizing:border-box;border-spacing:0;padding:8px;background-color:#e96817;border-top-left-radius:100px;border-top-right-radius:100px;border-bottom-left-radius:100px;border-bottom-right-radius:100px"><span style="color:#ffffff;font-size:21.3333px;font-weight:bold;font-family:Helvetica, Arial, sans-serif;font-style:normal;text-decoration:none;direction:ltr;text-align:center;line-height:1.4em;letter-spacing:-0.03em;display:table-cell;width:100%;height:100%;vertical-align:middle;box-sizing:border-box">Order now
</span></a></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:16px;letter-spacing:-0.02em;font-family:Helvetica, Arial, sans-serif;white-space:pre-wrap;text-align:center;padding:0px 20px"><br>We dropped a Free Samosa reward into your Rewards wallet as a thank you for signing up. To redeem, add the reward to your bag at checkout.<br></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:16px;letter-spacing:-0.02em;font-family:Helvetica, Arial, sans-serif;white-space:pre-wrap;text-align:center;padding:0px 20px"><br></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:16px;letter-spacing:-0.02em;font-family:Helvetica, Arial, sans-serif;white-space:pre-wrap;text-align:center;padding:0px 20px">Visiting us in person? View your QR code in the SamosaMan app and scan it at checkout.<br></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:13.3334px;letter-spacing:-0.02em;font-family:Helvetica, Arial, sans-serif;white-space:pre-wrap;text-align:center;padding:0px 20px">*Valid for 7 days. $5 min spend required.<br></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:16px;letter-spacing:-0.02em;font-family:Helvetica, Arial, sans-serif;white-space:pre-wrap;text-align:center;padding:0px 20px"><br></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td style="padding:0px 20px"><table border="0" cellpadding="0" cellspacing="0" class="layout-0" align="center" style="display:table;border-spacing:0px;border-collapse:separate;width:100%;max-width:100%;table-layout:fixed;margin:0 auto;background-color:#ffffff"><tbody><tr><td style="text-align:center"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;max-width:560px;table-layout:fixed;margin:0 auto"><tbody><tr><td width="48.57%" style="width:48.57%;box-sizing:border-box;vertical-align:top"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;table-layout:fixed"><tbody><tr><td><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.4;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word"><tbody><tr><td><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:272px"><tbody><tr><td style="width:100%;padding:0"><img src="${images.map}" width="272" height="206" style="display:block;width:100%;height:auto;max-width:100%"></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:18.6666px;font-weight:700;letter-spacing:-0.03em;font-family:Helvetica, Arial, sans-serif;white-space:pre-wrap;text-align:left">Delivered. Right to your doorstep.<br></td></tr></tbody></table></td></tr></tbody></table></td><td width="16" style="width:16px;box-sizing:border-box;font-size:0">&nbsp;</td><td width="48.57%" style="width:48.57%;box-sizing:border-box;vertical-align:top"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;table-layout:fixed"><tbody><tr><td><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.4;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word"><tbody><tr><td><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:272px"><tbody><tr><td style="width:100%;padding:0"><img src="${images.salsa}" width="272" height="206" style="display:block;width:100%;height:auto;max-width:100%"></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:18.6666px;font-weight:700;letter-spacing:-0.03em;font-family:Helvetica, Arial, sans-serif;white-space:pre-wrap;text-align:left">Our signature salsa, as flavorful as ever.<br></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" class="layout-0-under-450" align="center" style="display:none;border-spacing:0px;border-collapse:separate;width:100%;max-width:100%;table-layout:fixed;margin:0 auto;background-color:#ffffff"><tbody><tr><td style="text-align:center"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;max-width:450px;table-layout:fixed;margin:0 auto"><tbody><tr><td width="100.00%" style="width:100.00%;box-sizing:border-box;vertical-align:top"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;table-layout:fixed"><tbody><tr><td><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.4;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word"><tbody><tr><td><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:450px"><tbody><tr><td style="width:100%;padding:0"><img src="${images.map}" width="450" height="341" style="display:block;width:100%;height:auto;max-width:100%"></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:18.6666px;font-weight:700;letter-spacing:-0.03em;font-family:Helvetica, Arial, sans-serif;white-space:pre-wrap;text-align:left">Delivered. Right to your doorstep.<br></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td width="100.00%" style="width:100.00%;box-sizing:border-box;vertical-align:top"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;table-layout:fixed"><tbody><tr><td><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.4;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word"><tbody><tr><td><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:450px"><tbody><tr><td style="width:100%;padding:0"><img src="${images.salsa}" width="450" height="341" style="display:block;width:100%;height:auto;max-width:100%"></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:18.6666px;font-weight:700;letter-spacing:-0.03em;font-family:Helvetica, Arial, sans-serif;white-space:pre-wrap;text-align:left">Our signature salsa, as flavorful as ever.<br></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td style="padding:0px 20px"><table border="0" cellpadding="0" cellspacing="0" class="layout-1" align="center" style="display:table;border-spacing:0px;border-collapse:separate;width:100%;max-width:100%;table-layout:fixed;margin:0 auto;background-color:#ffffff"><tbody><tr><td style="text-align:center"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;max-width:560px;table-layout:fixed;margin:0 auto"><tbody><tr><td width="48.57%" style="width:48.57%;box-sizing:border-box;vertical-align:top"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;table-layout:fixed"><tbody><tr><td><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.4;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word"><tbody><tr><td><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:272px"><tbody><tr><td style="width:100%;padding:0"><img src="${images.chickpea}" width="272" height="206" style="display:block;width:100%;height:auto;max-width:100%"></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:18.6666px;font-weight:700;letter-spacing:-0.03em;font-family:Helvetica, Arial, sans-serif;white-space:pre-wrap;line-height:1.2;text-align:left">Now serving Chickpea Masala.<br></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:16px;letter-spacing:-0.02em;font-family:Helvetica, Arial, sans-serif;line-height:1.2;text-align:left"><span style="white-space:pre-wrap"><br></span><span style="white-space:pre-wrap">Slow cooked chickpeas with masala seasoning, served with our ready-to-enjoy Coconut Rice.<br></span><span style="font-size:14.6667px;white-space:pre-wrap"><br></span><span style="font-size:14.6667px;text-decoration:underline;white-space:pre-wrap">Explore in detail</span><span style="font-size:14.6667px;font-weight:700;white-space:pre-wrap"><br></span></td></tr></tbody></table></td></tr></tbody></table></td><td width="16" style="width:16px;box-sizing:border-box;font-size:0">&nbsp;</td><td width="48.57%" style="width:48.57%;box-sizing:border-box;vertical-align:top"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;table-layout:fixed"><tbody><tr><td><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.4;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word"><tbody><tr><td><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:272px"><tbody><tr><td style="width:100%;padding:0"><img src="${images.smile}" width="272" height="206" style="display:block;width:100%;height:auto;max-width:100%"></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:18.6666px;letter-spacing:-0.03em;font-family:Helvetica, Arial, sans-serif;line-height:1.2;text-align:left"><span style="font-weight:700;white-space:pre-wrap">Smile-inducing. Every time.</span><span style="white-space:pre-wrap"><br></span><span style="white-space:pre-wrap"><br></span></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:16px;letter-spacing:-0.02em;font-family:Helvetica, Arial, sans-serif;line-height:1.2;text-align:left"><span style="white-space:pre-wrap">We make the best samosas. It’s what we do.<br></span><span style="font-size:14.6667px;white-space:pre-wrap"><br></span><span style="font-size:14.6667px;text-decoration:underline;white-space:pre-wrap">Explore in detail</span><span style="font-size:14.6667px;white-space:pre-wrap"><br></span></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" class="layout-1-under-450" align="center" style="display:none;border-spacing:0px;border-collapse:separate;width:100%;max-width:100%;table-layout:fixed;margin:0 auto;background-color:#ffffff"><tbody><tr><td style="text-align:center"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;max-width:450px;table-layout:fixed;margin:0 auto"><tbody><tr><td width="100.00%" style="width:100.00%;box-sizing:border-box;vertical-align:top"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;table-layout:fixed"><tbody><tr><td><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.4;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word"><tbody><tr><td><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:450px"><tbody><tr><td style="width:100%;padding:0"><img src="${images.chickpea}" width="450" height="341" style="display:block;width:100%;height:auto;max-width:100%"></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:18.6666px;font-weight:700;letter-spacing:-0.03em;font-family:Helvetica, Arial, sans-serif;white-space:pre-wrap;line-height:1.2;text-align:left">Now serving Chickpea Masala.<br></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:16px;letter-spacing:-0.02em;font-family:Helvetica, Arial, sans-serif;line-height:1.2;text-align:left"><span style="white-space:pre-wrap"><br></span><span style="white-space:pre-wrap">Slow cooked chickpeas with masala seasoning, served with our ready-to-enjoy Coconut Rice.<br></span><span style="font-size:14.6667px;white-space:pre-wrap"><br></span><span style="font-size:14.6667px;text-decoration:underline;white-space:pre-wrap">Explore in detail</span><span style="font-size:14.6667px;font-weight:700;white-space:pre-wrap"><br></span></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td width="100.00%" style="width:100.00%;box-sizing:border-box;vertical-align:top"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;table-layout:fixed"><tbody><tr><td><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.4;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word"><tbody><tr><td><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:450px"><tbody><tr><td style="width:100%;padding:0"><img src="${images.smile}" width="450" height="341" style="display:block;width:100%;height:auto;max-width:100%"></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:18.6666px;letter-spacing:-0.03em;font-family:Helvetica, Arial, sans-serif;line-height:1.2;text-align:left"><span style="font-weight:700;white-space:pre-wrap">Smile-inducing. Every time.</span><span style="white-space:pre-wrap"><br></span><span style="white-space:pre-wrap"><br></span></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:16px;letter-spacing:-0.02em;font-family:Helvetica, Arial, sans-serif;line-height:1.2;text-align:left"><span style="white-space:pre-wrap">We make the best samosas. It’s what we do.<br></span><span style="font-size:14.6667px;white-space:pre-wrap"><br></span><span style="font-size:14.6667px;text-decoration:underline;white-space:pre-wrap">Explore in detail</span><span style="font-size:14.6667px;white-space:pre-wrap"><br></span></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td style="padding:0px 20px"><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:307px"><tbody><tr><td style="width:100%;padding:20 0"><img src="${images.footer}" width="307" height="138" style="display:block;width:100%;height:auto;max-width:100%"></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td height="100%" style="height:100%;font-size:0;line-height:0" aria-hidden="true">&nbsp;</td></tr><tr><td style="vertical-align:top"><table border="0" cellpadding="0" cellspacing="0" class="layout-2" align="center" style="display:table;border-spacing:0px;border-collapse:separate;width:100%;max-width:100%;table-layout:fixed;margin:0 auto;background-color:#000000"><tbody><tr><td style="text-align:center;padding:11.130414418485458px 20px"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;max-width:522px;table-layout:fixed;margin:0 auto"><tbody><tr><td width="100.00%" style="width:100.00%;box-sizing:border-box;vertical-align:top"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;table-layout:fixed"><tbody><tr><td style="padding:7px"><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.4;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word"><tbody><tr><td dir="ltr" style="color:#ffffff;font-size:16px;letter-spacing:-0.05em;font-family:Helvetica, Arial, sans-serif;white-space:pre-wrap;line-height:1.2;text-align:center">Terms and conditions apply. <br></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:16px;font-family:Helvetica, Arial, sans-serif;line-height:1.2;text-align:center"><span style="letter-spacing:-0.05em;color:#ffffff;white-space:pre-wrap">SamosaMan</span><span style="color:#e6e8f0;white-space:pre-wrap">® 2026</span><span style="color:#e6e8f0;white-space:pre-wrap"><br></span></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" class="layout-2-under-450" align="center" style="display:none;border-spacing:0px;border-collapse:separate;width:100%;max-width:100%;table-layout:fixed;margin:0 auto;background-color:#000000"><tbody><tr><td style="text-align:center;padding:11.130414418485458px 20px"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;max-width:420px;table-layout:fixed;margin:0 auto"><tbody><tr><td width="100.00%" style="width:100.00%;box-sizing:border-box;vertical-align:top"><table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;table-layout:fixed"><tbody><tr><td style="padding:7px"><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.4;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word"><tbody><tr><td dir="ltr" style="color:#ffffff;font-size:16px;letter-spacing:-0.05em;font-family:Helvetica, Arial, sans-serif;white-space:pre-wrap;line-height:1.2;text-align:center">Terms and conditions apply. <br></td></tr><tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr><tr><td dir="ltr" style="font-size:16px;font-family:Helvetica, Arial, sans-serif;line-height:1.2;text-align:center"><span style="letter-spacing:-0.05em;color:#ffffff;white-space:pre-wrap">SamosaMan</span><span style="color:#e6e8f0;white-space:pre-wrap">® 2026</span><span style="color:#e6e8f0;white-space:pre-wrap"><br></span></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></body></html>
        `
  };

  return transporter.sendMail(mailOptions)
    .then(() => console.log(`Welcome email sent to ${email}`))
    .catch((error) => console.error('Error sending email:', error));
});

// --- ORDER CONFIRMATION EMAIL TEMPLATES ---

function getCustomerEmailTemplate(order) {
  const orderTypeText = order.orderType === 'delivery' ? 'Delivery' : 'Pickup';
  const locationText = order.orderType === 'delivery'
    ? `${order.deliveryDetails?.address || ''}, ${order.deliveryDetails?.city || ''}, ${order.deliveryDetails?.state || ''} ${order.deliveryDetails?.zip || ''}`
    : `${order.branch} Location`;

  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
        ${item.name} x${item.quantity}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">
        $${(item.price * item.quantity).toFixed(2)}
      </td>
    </tr>
  `).join('');

  const customerFirstName = (order.customerName || 'there').split(' ')[0];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - SamosaMan</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold;">SamosaMan</h1>
                  <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 18px;">Order Confirmed!</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 30px 20px;">
                  <h2 style="margin: 0 0 15px; font-size: 24px; color: #0f172a;">
                    Deliciousness is headed your way, ${customerFirstName}!
                  </h2>
                  <p style="margin: 0; color: #64748b; line-height: 1.6;">
                    We've received your order and our team is getting started. You'll receive updates as your order progresses.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 30px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 8px; padding: 20px;">
                    <tr>
                      <td style="padding: 20px;">
                        <p style="margin: 0 0 8px; font-size: 14px; color: #64748b; font-weight: 500;">ORDER NUMBER</p>
                        <p style="margin: 0 0 20px; font-size: 18px; color: #0f172a; font-weight: bold;">${(order.orderId || '').substring(0, 8).toUpperCase()}</p>
                        <p style="margin: 0 0 8px; font-size: 14px; color: #64748b; font-weight: 500;">${orderTypeText.toUpperCase()}</p>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #0f172a;">${locationText}</p>
                        ${order.scheduledFor ? `
                          <p style="margin: 0 0 8px; font-size: 14px; color: #64748b; font-weight: 500;">SCHEDULED FOR</p>
                          <p style="margin: 0; font-size: 16px; color: #0f172a;">${order.scheduledFor}</p>
                        ` : `
                          <p style="margin: 0 0 8px; font-size: 14px; color: #64748b; font-weight: 500;">ORDER TIME</p>
                          <p style="margin: 0; font-size: 16px; color: #0f172a;">ASAP (15-25 minutes)</p>
                        `}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 30px 30px;">
                  <h3 style="margin: 0 0 15px; font-size: 18px; color: #0f172a;">Your Order</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    ${itemsHtml}
                    <tr>
                      <td style="padding: 8px; color: #64748b;">Subtotal</td>
                      <td style="padding: 8px; text-align: right; color: #64748b;">$${(order.subtotal || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; color: #64748b;">Tax</td>
                      <td style="padding: 8px; text-align: right; color: #64748b;">$${(order.tax || 0).toFixed(2)}</td>
                    </tr>
                    ${order.tip > 0 ? `
                      <tr>
                        <td style="padding: 8px; color: #64748b;">Tip</td>
                        <td style="padding: 8px; text-align: right; color: #64748b;">$${order.tip.toFixed(2)}</td>
                      </tr>
                    ` : ''}
                    ${order.discount > 0 ? `
                      <tr>
                        <td style="padding: 8px; color: #16a34a;">Discount (10%)</td>
                        <td style="padding: 8px; text-align: right; color: #16a34a;">-$${order.discount.toFixed(2)}</td>
                      </tr>
                    ` : ''}
                    <tr style="background-color: #f8fafc;">
                      <td style="padding: 12px 8px; font-weight: bold; color: #0f172a; font-size: 18px;">Total</td>
                      <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #ea580c; font-size: 18px;">$${(order.total || 0).toFixed(2)}</td>
                    </tr>
                  </table>
                  ${order.specialInstructions ? `
                    <div style="margin-top: 15px; padding: 12px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                      <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Special Instructions:</strong></p>
                      <p style="margin: 5px 0 0; font-size: 14px; color: #78350f;">${order.specialInstructions}</p>
                    </div>
                  ` : ''}
                </td>
              </tr>
              <tr>
                <td style="padding: 0 30px 30px;">
                  <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">Questions about your order?</p>
                  <p style="margin: 0; color: #64748b; font-size: 14px;">
                    Reply to this email or call us and we'll be happy to help.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; 2026 SamosaMan. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function getRestaurantEmailTemplate(order) {
  const orderTypeText = order.orderType === 'delivery' ? 'DELIVERY' : 'PICKUP';
  const itemsList = (order.items || []).map(item =>
    `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`
  ).join('\n');

  return `
    <div style="font-family: monospace; background: #1e293b; color: #e2e8f0; padding: 30px; border-radius: 8px;">
      <h2 style="color: #ea580c; margin: 0 0 20px;">NEW ORDER RECEIVED</h2>
      <pre style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
ORDER ID: ${(order.orderId || '').substring(0, 8).toUpperCase()}
TYPE: ${orderTypeText}
BRANCH: ${order.branch || 'N/A'}
TIME: ${order.scheduledFor || 'ASAP'}

--- CUSTOMER ---
Name: ${order.customerName || 'N/A'}
Phone: ${order.customerPhone || 'N/A'}
Email: ${order.customerEmail || 'N/A'}

${order.orderType === 'delivery' && order.deliveryDetails ? `--- DELIVERY ADDRESS ---
${order.deliveryDetails.address || ''}
${order.deliveryDetails.city || ''}, ${order.deliveryDetails.state || ''} ${order.deliveryDetails.zip || ''}
` : ''}
--- ORDER ITEMS ---
${itemsList}

--- TOTALS ---
Subtotal:  $${(order.subtotal || 0).toFixed(2)}
Tax:       $${(order.tax || 0).toFixed(2)}
Tip:       $${(order.tip || 0).toFixed(2)}
${order.discount > 0 ? `Discount:  -$${order.discount.toFixed(2)}\n` : ''}TOTAL:     $${(order.total || 0).toFixed(2)}

${order.specialInstructions ? `SPECIAL INSTRUCTIONS:
${order.specialInstructions}
` : ''}
Payment Status: PAID
Square Payment ID: ${order.squarePaymentId || 'N/A'}
      </pre>
    </div>
  `;
}

async function sendOrderConfirmationEmails(order) {
  // Customer email
  if (order.customerEmail) {
    await transporter.sendMail({
      from: '"SamosaMan" <no_reply@samosamanvt.com>',
      to: order.customerEmail,
      subject: `Order Confirmation - ${(order.orderId || '').substring(0, 8).toUpperCase()}`,
      html: getCustomerEmailTemplate(order)
    });
  }

  // Restaurant email
  await transporter.sendMail({
    from: '"SamosaMan Orders" <no_reply@samosamanvt.com>',
    to: 'no_reply@samosamanvt.com',
    subject: `NEW ORDER - ${order.branch || 'N/A'} - ${(order.orderType || 'pickup').toUpperCase()} - $${(order.total || 0).toFixed(2)}`,
    html: getRestaurantEmailTemplate(order)
  });
}

// --- CATERING INQUIRY FUNCTION (v2) ---
exports.submitCateringInquiry = onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { location, fullName, phone, email, eventDate, eventTime, guests, serviceType, address, city, state, comments, uid } = req.body;

    try {
      // Generate unique inquiry ID
      const inquiryId = crypto.randomUUID();
      const submittedAt = admin.firestore.FieldValue.serverTimestamp();

      // Save catering inquiry to Firestore
      const cateringData = {
        inquiryId: inquiryId,
        location: location,
        customerName: fullName,
        customerPhone: phone,
        customerEmail: email,
        eventDate: eventDate,
        eventTime: eventTime,
        numberOfGuests: parseInt(guests) || 0,
        serviceType: serviceType || 'pickup',
        eventAddress: address || '',
        eventCity: city || '',
        eventState: state || '',
        comments: comments || '',
        uid: uid || null,
        status: 'pending',
        submittedAt: submittedAt,
        createdAt: submittedAt
      };

      await db.collection('catering_inquiries').doc(inquiryId).set(cateringData);
      logger.info("Catering inquiry saved to Firestore", { inquiryId: inquiryId });

      // Send confirmation emails
      try {
        await sendCateringConfirmationEmails(cateringData);
        logger.info("Catering confirmation emails sent", { inquiryId: inquiryId });
      } catch (emailErr) {
        logger.error("Failed to send catering confirmation emails", emailErr);
      }

      logger.info("Catering inquiry submitted successfully", { inquiryId });
      res.status(200).json({ success: true, inquiryId: inquiryId });

    } catch (error) {
      logger.error("Catering inquiry error:", error);
      res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
    }
  });
});

// --- CATERING EMAIL TEMPLATES ---

function getCateringRestaurantEmailTemplate(inquiry) {
  const serviceTypeText = inquiry.serviceType === 'delivery' ? 'DELIVERY' : 'PICK-UP';

  return `
    <div style="font-family: monospace; background: #1e293b; color: #e2e8f0; padding: 30px; border-radius: 8px;">
      <h2 style="color: #ea580c; margin: 0 0 20px;">NEW CATERING INQUIRY</h2>
      <pre style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
INQUIRY ID: ${inquiry.inquiryId.substring(0, 8).toUpperCase()}
LOCATION: ${inquiry.location}
SERVICE: ${serviceTypeText}

--- CUSTOMER ---
Name: ${inquiry.customerName}
Phone: ${inquiry.customerPhone}
Email: ${inquiry.customerEmail}

--- EVENT DETAILS ---
Date: ${inquiry.eventDate}
Time: ${inquiry.eventTime}
Guests: ${inquiry.numberOfGuests}
${inquiry.eventAddress ? `
--- EVENT LOCATION ---
${inquiry.eventAddress}
${inquiry.eventCity}, ${inquiry.eventState}
` : ''}
${inquiry.comments ? `--- COMMENTS ---
${inquiry.comments}
` : ''}
STATUS: Pending Review
SUBMITTED: Just now
      </pre>
    </div>
  `;
}

async function sendCateringConfirmationEmails(inquiry) {
  // Customer confirmation email
  if (inquiry.customerEmail) {
    await transporter.sendMail({
      from: '"SamosaMan Catering" <no_reply@samosamanvt.com>',
      to: inquiry.customerEmail,
      subject: `Catering Inquiry Received - #${inquiry.inquiryId.substring(0, 8).toUpperCase()}`,
      html: getCateringCustomerEmailTemplate(inquiry)
    });
  }

  // Internal team notification
  await transporter.sendMail({
    from: '"SamosaMan Catering" <no_reply@samosamanvt.com>',
    to: 'no_reply@samosamanvt.com',
    subject: `NEW CATERING INQUIRY - ${inquiry.location} - ${inquiry.eventDate} - ${inquiry.numberOfGuests} guests`,
    html: getCateringRestaurantEmailTemplate(inquiry)
  });
}

function getCateringCustomerEmailTemplate(inquiry) {
  const customerFirstName = (inquiry.customerName || 'there').split(' ')[0];
  const serviceTypeText = inquiry.serviceType === 'delivery' ? 'Delivery' : 'Pick-up';
  const eventLocation = inquiry.eventAddress
    ? `${inquiry.eventAddress}${inquiry.eventCity ? ', ' + inquiry.eventCity : ''}${inquiry.eventState ? ', ' + inquiry.eventState : ''}`
    : inquiry.location || 'Location to be confirmed';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catering Inquiry Received - SamosaMan</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f1f5;-webkit-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f1f5">
<tr><td bgcolor="#f0f1f5">
<table align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
<tr><td>

  <!-- LOGO -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:28px 20px 0;text-align:center;">
      <img src="https://i.ibb.co/r268hyb6/231cd8a888582779c5042d2577a2ec56.png"
           width="110" height="95" alt="SamosaMan"
           style="display:block;width:110px;height:auto;max-width:110px;margin:0 auto;">
    </td></tr>
  </table>

  <!-- HEADLINE -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:20px 30px 0;text-align:center;">
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:34px;font-weight:700;letter-spacing:-0.02em;line-height:1.05;color:#1a1a1a;text-transform:uppercase;">
        INQUIRY RECEIVED.<br>WE'LL BE IN TOUCH.
      </div>
    </td></tr>
  </table>

  <!-- HERO IMAGE -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:22px 20px 0;">
      <img src="https://i.ibb.co/Z1271V1b/bb055516724cb0fd45293f8d365b389a.jpg"
           width="560" alt="SamosaMan Catering"
           style="display:block;width:100%;height:auto;border-radius:8px;max-width:560px;">
    </td></tr>
  </table>

  <!-- SUBTEXT -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:20px 30px 0;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:400;color:#64748b;line-height:1.6;">
      Thanks, ${customerFirstName} — we've received your catering request.<br>
      Our team will review and reach out within <strong style="color:#1a1a1a;">24 hours</strong>.
    </td></tr>
  </table>

  <!-- INQUIRY DETAILS -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:28px 30px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:14px 18px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;width:50%;">
            <div style="font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;font-family:Helvetica,Arial,sans-serif;">Inquiry Number</div>
            <div style="font-size:13px;font-weight:500;color:#1a1a1a;font-family:Helvetica,Arial,sans-serif;">#${(inquiry.inquiryId || '').substring(0, 8).toUpperCase()}</div>
          </td>
          <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;width:50%;">
            <div style="font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;font-family:Helvetica,Arial,sans-serif;">Event Date</div>
            <div style="font-size:13px;font-weight:500;color:#1a1a1a;font-family:Helvetica,Arial,sans-serif;">${inquiry.eventDate || 'TBD'} at ${inquiry.eventTime || 'TBD'}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 18px;border-right:1px solid #e2e8f0;width:50%;">
            <div style="font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;font-family:Helvetica,Arial,sans-serif;">Location</div>
            <div style="font-size:13px;font-weight:500;color:#1a1a1a;font-family:Helvetica,Arial,sans-serif;">${eventLocation}</div>
          </td>
          <td style="padding:14px 18px;width:50%;">
            <div style="font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;font-family:Helvetica,Arial,sans-serif;">Guests &amp; Service</div>
            <div style="font-size:13px;font-weight:500;color:#1a1a1a;font-family:Helvetica,Arial,sans-serif;">${inquiry.numberOfGuests || 'TBD'} guests · ${serviceTypeText}</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>

  <!-- NEXT STEPS -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:28px 30px 32px;">
      <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:14px;text-transform:uppercase;letter-spacing:0.06em;font-family:Helvetica,Arial,sans-serif;">What Happens Next</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:7px 0;font-size:14px;color:#64748b;font-family:Helvetica,Arial,sans-serif;line-height:1.5;">&#x2192;&nbsp;&nbsp;Our catering team reviews your request</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#64748b;font-family:Helvetica,Arial,sans-serif;line-height:1.5;">&#x2192;&nbsp;&nbsp;We reach out within 24 hours to discuss options &amp; pricing</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#64748b;font-family:Helvetica,Arial,sans-serif;line-height:1.5;">&#x2192;&nbsp;&nbsp;You receive a full order confirmation with invoice &amp; payment link</td></tr>
      </table>
    </td></tr>
  </table>

</td></tr>

<!-- FOOTER -->
<tr><td bgcolor="#000000" style="padding:24px 30px;text-align:center;">
  <p style="margin:0 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.06em;text-transform:uppercase;">SamosaMan</p>
  <p style="margin:0 0 14px;font-size:10px;color:rgba(255,255,255,0.35);font-family:Helvetica,Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;">Artisan Catering</p>
  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:12px;">
    <tr>
      <td style="padding:0 8px;"><a href="https://samosamanvt.com" style="font-size:12px;color:rgba(255,255,255,0.45);text-decoration:none;font-family:Helvetica,Arial,sans-serif;">samosamanvt.com</a></td>
      <td style="font-size:12px;color:rgba(255,255,255,0.2);">·</td>
      <td style="padding:0 8px;"><a href="mailto:catering@samosamanvt.com" style="font-size:12px;color:rgba(255,255,255,0.45);text-decoration:none;font-family:Helvetica,Arial,sans-serif;">catering@samosamanvt.com</a></td>
    </tr>
  </table>
  <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);font-family:Helvetica,Arial,sans-serif;line-height:1.6;">
    Burlington, VT &nbsp;·&nbsp; Boston, MA &nbsp;·&nbsp; Hanover, NH<br>
    &copy; 2026 SamosaMan. All rights reserved.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}