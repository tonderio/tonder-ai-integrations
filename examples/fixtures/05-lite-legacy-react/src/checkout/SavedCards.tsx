import { useEffect, useState } from 'react';
import { ensureInjected } from './tonder-client';
import { cart, customer } from '../config';

type SavedCard = {
  skyflow_id: string;
  card_scheme: string;
  last_four: string;
  expiration_month: string;
  expiration_year: string;
};

export function SavedCards({ onStatus }: { onStatus: (message: string) => void }) {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const checkout = await ensureInjected();
      const result = await checkout.getCustomerCards();
      if (cancelled) return;
      setCards(result.cards ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(skyflowId: string) {
    const checkout = await ensureInjected();
    await checkout.removeCustomerCard(skyflowId);
    setCards((current) => current.filter((card) => card.skyflow_id !== skyflowId));
    if (selected === skyflowId) setSelected(null);
  }

  async function pay() {
    if (!selected) return;

    onStatus('Processing…');

    const checkout = await ensureInjected();

    checkout.configureCheckout({
      customer: { email: customer.email },
      order_reference: cart.orderReference,
    });

    const result = await checkout.payment({
      total: cart.total,
      currency: cart.currency,
      items: cart.items,
      card: selected,
    });

    if (result.status === 'requires_action') {
      await checkout.verify3dsTransaction();
    }

    onStatus(`Payment ${result.status}.`);
  }

  if (loading) return <p>Loading saved cards…</p>;
  if (cards.length === 0) return <p>No saved cards yet.</p>;

  return (
    <div className="saved-cards">
      <ul>
        {cards.map((card) => (
          <li key={card.skyflow_id}>
            <label>
              <input
                type="radio"
                name="saved-card"
                checked={selected === card.skyflow_id}
                onChange={() => setSelected(card.skyflow_id)}
              />
              {card.card_scheme} •••• {card.last_four} — {card.expiration_month}/
              {card.expiration_year}
            </label>
            <button type="button" onClick={() => void remove(card.skyflow_id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div id="collect-cvv" className="card-field" />

      <button type="button" onClick={() => void pay()} disabled={!selected}>
        Pay with selected card
      </button>
    </div>
  );
}
