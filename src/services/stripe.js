const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const createPaymentIntent = async ({amountUSD, currency = 'usd', metadata = {} }) => {
    const intent = await stripe.paymentIntents.create({
        amount: Math.round(amountUSD * 100), // Convert to cents
        currency,
        capture_method: 'manual',
        metadata,
    });
    return { clientSecret: intent.client_secret, paymentIntentid: intent.id };
};

const capturePayment = async (paymentIntentId) => {
    return stripe.paymentIntents.capture(paymentIntentId);
};

const cancelPayment = async (paymentIntentId) => {
    return stripe.paymentIntents.cancel(paymentIntentId);
};

const refundPayment = async (paymentIntentId) => {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return stripe.refunds.create({ payment_intent: paymentIntentId });
};

module.exports = { createPaymentIntent, capturePayment, cancelPayment, refundPayment };