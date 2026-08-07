const AMOUNT = 480;
const CURRENCY = 'MXN';

const form = document.getElementById('checkout-form');
const status = document.getElementById('status');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  if (!email) {
    status.textContent = 'Enter your email to continue.';
    return;
  }

  // No payment provider is wired up yet.
  status.textContent = `Would charge ${CURRENCY} ${AMOUNT.toFixed(2)} for ${email}.`;
});
