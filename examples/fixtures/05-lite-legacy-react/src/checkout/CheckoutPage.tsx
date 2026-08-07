import { useEffect, useRef, useState } from 'react';
import { ensureInjected, onCheckoutResult } from './tonder-client';
import { SavedCards } from './SavedCards';
import { EnrollCard } from './EnrollCard';
import { cart, customer } from '../config';

type Mode = 'new-card' | 'saved-card' | 'enroll';

export function CheckoutPage() {
  const [mode, setMode] = useState<Mode>('new-card');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldsReady, setFieldsReady] = useState(false);
  const mounted = useRef(false);

  useEffect(() => onCheckoutResult((result) => setStatus(`Payment ${result.status}.`)), []);

  useEffect(() => {
    if (mode !== 'new-card' || mounted.current) return;

    let cancelled = false;

    (async () => {
      const checkout = await ensureInjected();
      if (cancelled) return;
      await checkout.mountCardFields({});
      mounted.current = true;
      setFieldsReady(true);
    })();

    return () => {
      cancelled = true;
      if (mounted.current) {
        void ensureInjected().then((checkout) => checkout.unmountCardFields('all'));
        mounted.current = false;
      }
    };
  }, [mode]);

  async function payWithNewCard() {
    setBusy(true);
    setStatus('Processing…');

    try {
      const checkout = await ensureInjected();

      checkout.configureCheckout({
        customer: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
        },
        order_reference: cart.orderReference,
      });

      const result = await checkout.payment({
        total: cart.total,
        currency: cart.currency,
        items: cart.items,
      });

      if (result.status === 'requires_action') {
        setStatus('Awaiting authentication…');
        await checkout.verify3dsTransaction();
      }

      setStatus(`Payment ${result.status}.`);
    } catch (error) {
      setStatus(`Payment failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="checkout">
      <h1>Checkout</h1>

      <section className="summary">
        <span>Order {cart.orderReference}</span>
        <strong>
          {cart.currency} {cart.total.toFixed(2)}
        </strong>
      </section>

      <nav className="modes">
        <button type="button" onClick={() => setMode('new-card')} disabled={mode === 'new-card'}>
          New card
        </button>
        <button type="button" onClick={() => setMode('saved-card')} disabled={mode === 'saved-card'}>
          Saved cards
        </button>
        <button type="button" onClick={() => setMode('enroll')} disabled={mode === 'enroll'}>
          Save a card
        </button>
      </nav>

      {mode === 'new-card' && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void payWithNewCard();
          }}
        >
          <div id="collect-cardholder-name" className="card-field" />
          <div id="collect-card-number" className="card-field" />
          <div className="card-row">
            <div id="collect-expiration-month" className="card-field" />
            <div id="collect-expiration-year" className="card-field" />
            <div id="collect-cvv" className="card-field" />
          </div>
          <button type="submit" disabled={busy || !fieldsReady}>
            Pay
          </button>
        </form>
      )}

      {mode === 'saved-card' && <SavedCards onStatus={setStatus} />}
      {mode === 'enroll' && <EnrollCard onStatus={setStatus} />}

      <p className="status">{status}</p>
    </main>
  );
}
