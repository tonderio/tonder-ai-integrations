export const config = {
  tonderApiKey: import.meta.env.VITE_TONDER_API_KEY as string,
  tonderMode: (import.meta.env.VITE_TONDER_MODE ?? 'stage') as 'stage' | 'production',
};

export const customer = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
};

export const cart = {
  orderReference: 'FM-9931',
  total: 1240,
  currency: 'MXN',
  items: [
    { description: 'Cold brew kit', quantity: 1, price_unit: 890, amount_total: 890 },
    { description: 'Ceramic dripper', quantity: 1, price_unit: 350, amount_total: 350 },
  ],
};
