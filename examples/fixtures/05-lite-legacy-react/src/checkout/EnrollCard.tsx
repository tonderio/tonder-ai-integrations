import { useEffect, useRef, useState } from 'react';
import { ensureInjected } from './tonder-client';
import { customer } from '../config';

export function EnrollCard({ onStatus }: { onStatus: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const checkout = await ensureInjected();
      if (cancelled) return;
      await checkout.mountCardFields({});
      mounted.current = true;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (mounted.current) {
        void ensureInjected().then((checkout) => checkout.unmountCardFields('all'));
        mounted.current = false;
      }
    };
  }, []);

  async function save() {
    setBusy(true);
    onStatus('Saving card…');

    try {
      const checkout = await ensureInjected();
      checkout.configureCheckout({ customer: { email: customer.email } });
      const saved = await checkout.saveCustomerCard();
      onStatus(`Card saved (${saved.skyflow_id}).`);
    } catch (error) {
      onStatus(`Could not save card: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div id="collect-cardholder-name" className="card-field" />
      <div id="collect-card-number" className="card-field" />
      <div className="card-row">
        <div id="collect-expiration-month" className="card-field" />
        <div id="collect-expiration-year" className="card-field" />
        <div id="collect-cvv" className="card-field" />
      </div>
      <button type="submit" disabled={busy || !ready}>
        Save card
      </button>
    </form>
  );
}
