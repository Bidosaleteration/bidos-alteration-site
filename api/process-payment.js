// api/process-payment.js
//
// Serverless backend endpoint that takes the card token created in the browser
// by the Square Web Payments SDK and actually charges the card via the
// Square Payments API. This file is written for Vercel (drop it in an /api
// folder at your project root and Vercel deploys it automatically as
// https://yourdomain.com/api/process-payment). It also works on Netlify
// Functions with minor path changes (see the setup guide).
//
// REQUIRED environment variables (set these in your hosting dashboard,
// never hard-code them in this file or commit them to git):
//   SQUARE_ACCESS_TOKEN   - your Square access token (sandbox or production)
//   SQUARE_LOCATION_ID    - your Square location ID
//   SQUARE_ENVIRONMENT    - "sandbox" or "production"

const { SquareClient, SquareEnvironment } = require('square');
const crypto = require('crypto');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
          res.status(405).json({ success: false, error: 'Method not allowed' });
          return;
    }

    try {
          const { sourceId, amount, currency, items } = req.body;

      if (!sourceId || !amount || amount <= 0) {
              res.status(400).json({ success: false, error: 'Missing or invalid payment details.' });
              return;
      }

      const client = new SquareClient({
              token: process.env.SQUARE_ACCESS_TOKEN,
              environment:
                        process.env.SQUARE_ENVIRONMENT === 'production'
                  ? SquareEnvironment.Production
                          : SquareEnvironment.Sandbox
      });

      const idempotencyKey = crypto.randomUUID();

      const response = await client.payments.create({
              sourceId,
              idempotencyKey,
              amountMoney: {
                        amount: BigInt(Math.round(amount)), // amount must be an integer, in cents
                        currency: currency || 'USD'
              },
              locationId: process.env.SQUARE_LOCATION_ID,
              note: 'Bidos Alteration - Online Shop Order'
      });

      // Optional: log or email yourself the order details (items) here,
      // or write them to a database / Google Sheet / order management tool.
      console.log('Order paid:', JSON.stringify(items));

      res.status(200).json({
              success: true,
              paymentId: response.payment?.id,
              status: response.payment?.status
      });
    } catch (err) {
          console.error('Square payment error:', err);
          const message =
                  err?.errors?.[0]?.detail || err?.message || 'Payment processing failed.';
          res.status(500).json({ success: false, error: message });
    }
};
