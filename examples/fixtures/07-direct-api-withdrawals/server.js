import express from 'express';
import { charges } from './src/routes/charges.js';
import { withdrawals } from './src/routes/withdrawals.js';
import { webhooks } from './src/routes/webhooks.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use(charges);
app.use(withdrawals);
app.use(webhooks);

app.listen(3000, () => console.log('Checkout on http://localhost:3000'));
