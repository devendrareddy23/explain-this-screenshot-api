const express = require("express");
const Stripe = require("stripe");

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function isProStatus(status) {
  return ["active", "trialing"].includes(status);
}

router.get("/ping", (req, res) => {
  return res.json({
    success: true,
    message: "billing route working",
  });
});

router.post("/create-checkout-session", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${process.env.FRONTEND_URL}?checkout=success&email=${encodeURIComponent(email)}`,
      cancel_url: `${process.env.FRONTEND_URL}?checkout=cancel`,
    });

    return res.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout session error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create checkout session.",
      error: error.message,
    });
  }
});

router.post("/create-portal-session", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    const customer = customers.data[0];

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "No Stripe customer found for this email.",
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: process.env.FRONTEND_URL,
    });

    return res.json({
      success: true,
      url: portalSession.url,
    });
  } catch (error) {
    console.error("Stripe portal session error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create portal session.",
      error: error.message,
    });
  }
});

router.get("/status", async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    const customer = customers.data[0];

    if (!customer) {
      return res.json({
        success: true,
        email,
        isPro: false,
        subscriptionStatus: "none",
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 10,
    });

    const activeSubscription = subscriptions.data.find((sub) =>
      isProStatus(sub.status)
    );

    return res.json({
      success: true,
      email,
      isPro: !!activeSubscription,
      subscriptionStatus: activeSubscription ? activeSubscription.status : "none",
      customerId: customer.id,
    });
  } catch (error) {
    console.error("Stripe status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch billing status.",
      error: error.message,
    });
  }
});

module.exports = router;
