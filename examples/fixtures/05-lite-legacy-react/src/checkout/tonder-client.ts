import { LiteInlineCheckout } from 'tonder-web-sdk';
import { config } from '../config';

let instance: LiteInlineCheckout | null = null;
let injected = false;

type CheckoutResult = { status: string; id?: string; message?: string };

const resultListeners = new Set<(result: CheckoutResult) => void>();

export function onCheckoutResult(listener: (result: CheckoutResult) => void): () => void {
  resultListeners.add(listener);
  return () => resultListeners.delete(listener);
}

export function getCheckout(): LiteInlineCheckout {
  if (!instance) {
    instance = new LiteInlineCheckout({
      mode: config.tonderMode,
      apiKey: config.tonderApiKey,
      returnUrl: `${window.location.origin}/order/return`,
      callBack: (result: CheckoutResult) => {
        for (const listener of resultListeners) listener(result);
      },
    });
  }
  return instance;
}

export async function ensureInjected(): Promise<LiteInlineCheckout> {
  const checkout = getCheckout();
  if (!injected) {
    await checkout.injectCheckout();
    injected = true;
  }
  return checkout;
}

export function resetCheckout(): void {
  instance = null;
  injected = false;
}
