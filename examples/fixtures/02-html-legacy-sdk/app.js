import { LiteInlineCheckout } from 'tonder-web-sdk';

const AMOUNT = 320;
const CURRENCY = 'MXN';

const form = document.getElementById('checkout-form');
const status = document.getElementById('status');
const payButton = document.getElementById('pay');

const checkout = new LiteInlineCheckout({
  mode: 'stage',
  apiKey: window.__VELA_CONFIG__.tonderApiKey,
  returnUrl: `${window.location.origin}/return.html`,
  callBack: (result) => {
    status.textContent = `Payment ${result.status}.`;
  },
});

async function start() {
  await checkout.injectCheckout();
  await checkout.mountCardFields({});
  payButton.disabled = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  if (!email) {
    status.textContent = 'Enter your email to continue.';
    return;
  }

  payButton.disabled = true;
  status.textContent = 'Processing…';

  checkout.configureCheckout({
    customer: { email },
    order_reference: 'VB-8871',
  });

  try {
    const result = await checkout.payment({
      total: AMOUNT,
      currency: CURRENCY,
      items: [{ description: 'Paperback bundle', amount_total: AMOUNT, quantity: 1 }],
    });
    status.textContent = `Payment ${result.status}.`;
  } catch (error) {
    status.textContent = `Payment failed: ${error.message}`;
    payButton.disabled = false;
  }
});

start();
