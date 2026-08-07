import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { createTonder } from '@tonder.io/web-sdk';
import { environment } from '../environments/environment';

const ORDER_REFERENCE = 'OS-5520';
const AMOUNT = 890;
const CURRENCY = 'MXN';

@Component({
  selector: 'app-checkout',
  standalone: true,
  template: `
    <main class="checkout">
      <h1>Checkout</h1>

      <section class="summary">
        <span>Order {{ orderReference }}</span>
        <strong>MXN 890.00</strong>
      </section>

      <div id="tonder-apple-pay-button" [hidden]="!applePayReady()"></div>

      <button type="button" (click)="payWithCard()">Pay with card</button>

      <p class="status">{{ status() }}</p>
    </main>
  `,
  styles: [
    `
      #tonder-apple-pay-button {
        margin-block: 12px;
      }
    `,
  ],
})
export class CheckoutComponent implements OnInit, OnDestroy {
  readonly orderReference = ORDER_REFERENCE;
  readonly status = signal('');
  readonly applePayReady = signal(false);

  private tonder?: ReturnType<typeof createTonder>;
  private applePayButton?: { unmount: () => void };

  async ngOnInit(): Promise<void> {
    this.tonder = createTonder({
      api_key: environment.tonderApiKey,
      environment: environment.tonderEnvironment,
      session: { customer: { email: 'shopper@example.com' } },
      events: {
        payment: {
          on_completed: ({ transaction }) => this.status.set(`Payment ${transaction.status}.`),
          on_error: (error) => this.status.set(`Payment error: ${error.message}`),
          on_cancel: () => this.status.set('Payment cancelled.'),
        },
      },
    });

    await this.tonder.init();

    const availability = this.tonder.isApplePayAvailable();
    if (!availability.available) {
      console.info('Apple Pay hidden:', availability.code);
      return;
    }

    this.applePayReady.set(true);

    this.applePayButton = this.tonder.create('apple_pay_button', {
      payment: () => ({
        amount: AMOUNT,
        currency: CURRENCY,
        client_reference: ORDER_REFERENCE,
        idempotency_key: crypto.randomUUID(),
      }),
    });

    await this.applePayButton.mount();
  }

  ngOnDestroy(): void {
    this.applePayButton?.unmount();
  }

  payWithCard(): void {
    this.status.set('Card flow not wired up in this fixture.');
  }
}
