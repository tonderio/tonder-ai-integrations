import { Injectable } from '@angular/core';
import { InlineCheckout } from 'tonder-web-sdk';
import { environment } from '../environments/environment';

export type CheckoutCallbackResult = {
  status: string;
  transaction_id?: string;
  message?: string;
};

@Injectable({ providedIn: 'root' })
export class TonderCheckoutService {
  private checkout?: InlineCheckout;
  private injected = false;
  private readonly listeners = new Set<(result: CheckoutCallbackResult) => void>();

  onResult(listener: (result: CheckoutCallbackResult) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async instance(): Promise<InlineCheckout> {
    if (!this.checkout) {
      this.checkout = new InlineCheckout({
        mode: environment.tonderMode,
        apiKey: environment.tonderApiKey,
        returnUrl: `${window.location.origin}/order/return`,
        callBack: (result: CheckoutCallbackResult) => {
          for (const listener of this.listeners) listener(result);
        },
      });
    }

    if (!this.injected) {
      await this.checkout.injectCheckout();
      this.injected = true;
    }

    return this.checkout;
  }

  async reset(): Promise<void> {
    this.checkout = undefined;
    this.injected = false;
  }
}
