const ORDER_ID = 'PT-3390';

const form = document.getElementById('checkout-form');
const status = document.getElementById('status');
const methodSelect = document.getElementById('method');
const bankRow = document.getElementById('bank-row');
const bankSelect = document.getElementById('bank');
const cardFields = document.getElementById('card-fields');
const payButton = document.getElementById('pay');

methodSelect.addEventListener('change', () => {
  const method = methodSelect.value;
  cardFields.hidden = method !== 'CARD';
  bankRow.hidden = method !== 'SAFETYPAY';
});

async function loadBanks() {
  const response = await fetch('/api/charges/methods');
  const methods = await response.json();
  const safetypay = (methods.results ?? []).find((entry) => entry.payment_method === 'SAFETYPAY');

  for (const bank of safetypay?.banks ?? []) {
    const option = document.createElement('option');
    option.value = bank.code;
    option.textContent = bank.name;
    bankSelect.append(option);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const method = methodSelect.value;
  const email = document.getElementById('email').value.trim();

  payButton.disabled = true;
  status.textContent = 'Processing…';

  const endpoint = method === 'CARD' ? '/api/charges/card' : '/api/charges/apm';
  const body = { order_id: ORDER_ID, email, method };

  if (method === 'CARD') {
    body.card = {
      cardholder_name: document.getElementById('cardholder-name').value.trim(),
      card_number: document.getElementById('card-number').value.replace(/\s/g, ''),
      expiration_month: document.getElementById('expiration-month').value.trim(),
      expiration_year: document.getElementById('expiration-year').value.trim(),
      cvv: document.getElementById('cvv').value.trim(),
    };
  }

  if (method === 'SAFETYPAY') body.bank_code = bankSelect.value;

  const response = await fetch(endpoint, {
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

loadBanks();
