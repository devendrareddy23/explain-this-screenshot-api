import express from "express";
import Stripe from "stripe";
import User from "../models/User.js";

const router = express.Router();

function getStripeInstance() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing in environment variables.");
  }

  return new Stripe(stripeSecretKey);
}

function normalizePlanFromPriceOrMetadata({ planType = "", priceId = "" }) {
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID || "";
  const autoPriceId = process.env.STRIPE_AUTO_PRICE_ID || "";

  if (planType === "auto") return "auto";
  if (planType === "pro") return "pro";

  if (priceId && autoPriceId && priceId === autoPriceId) return "auto";
  if (priceId && proPriceId && priceId === proPriceId) return "pro";

  return "free";
}

async function updateUserPlan({
  userId = "",
  customerEmail = "",
  subscriptionId = "",
  customerId = "",
  priceId = "",
  subscriptionStatus = "",
  planType = "",
}) {
  try {
    const normalizedPlan = normalizePlanFromPriceOrMetadata({
      planType,
      priceId,
    });

    let query = null;

    if (userId) {
      query = { _id: userId };
    } else if (customerEmail) {
      query = { email: customerEmail.toLowerCase().trim() };
    }

    if (!query) {
      console.log("Webhook: no userId or customerEmail available");
      return;
    }

    const updatedUser = await User.findOneAndUpdate(
      query,
      {
        $set: {
          plan: normalizedPlan,
          stripeCustomerId: customerId || "",
          stripeSubscriptionId: subscriptionId || "",
          stripePriceId: priceId || "",
          subscriptionStatus: subscriptionStatus || "active",
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      console.log("Webhook: user not found for update");
      return;
    }

    console.log(
      `Webhook: updated user ${updatedUser.email} to plan ${normalizedPlan}`
    );
  } catch (error) {
    console.error("updateUserPlan error:", error.message);
  }
}

async function downgradeUserBySubscriptionId(subscriptionId = "") {
  try {
    if (!subscriptionId) return;

    const updatedUser = await User.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      {
        $set: {
          plan: "free",
          subscriptionStatus: "canceled",
        },
      },
      { new: true }
    );

    if (updatedUser) {
      console.log(`Webhook: downgraded user ${updatedUser.email} to free`);
    }
  } catch (error) {
    console.error("downgradeUserBySubscriptionId error:", error.message);
  }
}

router.post("/", async (req, res) => {
  try {
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    if (!stripeWebhookSecret) {
      return res.status(500).json({
        success: false,
        message: "Stripe webhook secret is missing.",
      });
    }

    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).send("Missing stripe-signature header");
    }

    const stripe = getStripeInstance();

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        stripeWebhookSecret
      );
    } catch (error) {
      console.error("Stripe webhook signature error:", error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("Webhook session:", session);

        const userId = session.metadata?.userId || "";
        const planType = session.metadata?.plan || "";
        const customerEmail =
          session.customer_details?.email || session.customer_email || "";
        const customerId =
          typeof session.customer === "string" ? session.customer : "";
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : "";

        let priceId = "";

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );

          priceId = subscription.items?.data?.[0]?.price?.id || "";

          await updateUserPlan({
            userId,
            customerEmail,
            subscriptionId,
            customerId,
            priceId,
            subscriptionStatus: subscription.status || "active",
            planType,
          });
        } else {
          await updateUserPlan({
            userId,
            customerEmail,
            subscriptionId: "",
            customerId,
            priceId: "",
            subscriptionStatus: "active",
            planType,
          });
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;

        const userId = subscription.metadata?.userId || "";
        const planType = subscription.metadata?.plan || "";
        const customerId =
          typeof subscription.customer === "string" ? subscription.customer : "";
        const subscriptionId = subscription.id || "";
        const priceId = subscription.items?.data?.[0]?.price?.id || "";

        let customerEmail = "";

        if (customerId) {
          const customer = await stripe.customers.retrieve(customerId);
          if (!customer.deleted) {
            customerEmail = customer.email || "";
          }
        }

        await updateUserPlan({
          userId,
          customerEmail,
          subscriptionId,
          customerId,
          priceId,
          subscriptionStatus: subscription.status || "",
          planType,
        });

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await downgradeUserBySubscriptionId(subscription.id || "");
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("stripe webhook error:", error);
    return res.status(500).json({
      success: false,
      message: "Stripe webhook processing failed.",
    });
  }
});

export default router;
