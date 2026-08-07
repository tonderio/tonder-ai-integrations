const form = document.getElementById('checkout-form');
const status = document.getElementById('status');
const methodSelect = document.getElementById('method');
const cardFields = document.getElementById('card-fields');
const payButton = document.getElementById('pay');

methodSelect.addEventListener('change', () => {
  cardFields.hidden = methodSelect.value !== 'CARD';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const method = methodSelect.value;
  const body = {
    order_id: 'VB-CART',
    email: document.getElementById('email').value.trim(),
    method,
  };

  if (method === 'CARD') {
    body.card = {
      cardholder_name: document.getElementById('cardholder-name').value.trim(),
      card_number: document.getElementById('card-number').value.replace(/\s/g, ''),
      expiration_month: document.getElementById('expiration-month').value.trim(),
      expiration_year: document.getElementById('expiration-year').value.trim(),
      cvv: document.getElementById('cvv').value.trim(),
    };
  }

  payButton.disabled = true;
  status.textContent = 'Processing…';

  const response = await fetch('/api/charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const transaction = await response.json();

  if (!response.ok) {
    status.textContent = 'Payment failed.';
    payButton.disabled = false;
    return;
  }

  status.textContent = `Payment ${transaction.status}.`;
});
