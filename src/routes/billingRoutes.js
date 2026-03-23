import express from "express";
import Stripe from "stripe";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

function getStripeInstance() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing in environment variables.");
  }

  return new Stripe(stripeSecretKey);
}

function getPriceIdFromPlan(plan) {
  if (plan === "pro") {
    return process.env.STRIPE_PRO_PRICE_ID;
  }

  if (plan === "auto") {
    return process.env.STRIPE_AUTO_PRICE_ID;
  }

  return null;
}

router.post("/create-checkout-session", protect, async (req, res) => {
  try {
    const stripe = getStripeInstance();
    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: "Plan is required.",
      });
    }

    const priceId = getPriceIdFromPlan(plan);

    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan selected.",
      });
    }

    if (!process.env.CLIENT_URL) {
      return res.status(500).json({
        success: false,
        message: "CLIENT_URL is missing in environment variables.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: req.user.email,
      client_reference_id: String(req.user._id),
      metadata: {
        userId: String(req.user._id),
        email: req.user.email,
        plan,
      },
      success_url: `${process.env.CLIENT_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/billing/cancel`,
    });

    return res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout session error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create checkout session.",
      error: error.message,
    });
  }
});

router.get("/stripe-config-check", async (req, res) => {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
    const autoPriceId = process.env.STRIPE_AUTO_PRICE_ID;

    if (!stripeKey || !proPriceId || !autoPriceId) {
      return res.status(500).json({
        success: false,
        message: "Missing Stripe environment variables.",
      });
    }

    const stripe = getStripeInstance();

    const proPrice = await stripe.prices.retrieve(proPriceId);
    const autoPrice = await stripe.prices.retrieve(autoPriceId);

    return res.status(200).json({
      success: true,
      keyMode: stripeKey.startsWith("sk_live_") ? "live" : "test",
      pro: {
        id: proPrice.id,
        active: proPrice.active,
        livemode: proPrice.livemode,
        type: proPrice.type,
        recurring: proPrice.recurring ? proPrice.recurring.interval : null,
        unit_amount: proPrice.unit_amount,
        currency: proPrice.currency,
      },
      auto: {
        id: autoPrice.id,
        active: autoPrice.active,
        livemode: autoPrice.livemode,
        type: autoPrice.type,
        recurring: autoPrice.recurring ? autoPrice.recurring.interval : null,
        unit_amount: autoPrice.unit_amount,
        currency: autoPrice.currency,
      },
    });
  } catch (error) {
    console.error("Stripe config check error:", error);

    return res.status(500).json({
      success: false,
      message: "Stripe config check failed.",
      error: error.message,
    });
  }
});

export default router;
