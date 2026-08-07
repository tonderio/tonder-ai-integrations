import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TonderCheckoutService } from './tonder-checkout.service';
import { ThreeDsService } from './three-ds.service';
import { PaymentMethodsService, type PaymentMethodOption } from './payment-methods.service';
import { environment } from '../environments/environment';

const ORDER = {
  reference: 'PT-70412',
  total: 2150,
  currency: 'MXN',
  items: [
    { description: 'Trail pack 40L', quantity: 1, price_unit: 1750, amount_total: 1750 },
    { description: 'Dry bag set', quantity: 2, price_unit: 200, amount_total: 400 },
  ],
};

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="checkout">
      <h1>Checkout</h1>

      <section class="summary">
        <span>Order {{ order.reference }}</span>
        <strong>{{ order.currency }} {{ order.total.toFixed(2) }}</strong>
      </section>

      <label for="method">Payment method</label>
      <select id="method" (change)="selectMethod($any($event.target).value)">
        <option value="">Card</option>
        @for (method of methods(); track method.code) {
          <option [value]="method.code">{{ method.label }}</option>
        }
      </select>

      <!-- The legacy SDK draws the whole checkout into this container. -->
      <div id="tonder-checkout"></div>

      <button type="button" (click)="pay()" [disabled]="busy()">Pay</button>

      <p class="status">{{ status() }}</p>
    </main>
  `,
})
export class CheckoutComponent implements OnInit, OnDestroy {
  readonly order = ORDER;
  readonly status = signal('');
  readonly busy = signal(false);
  readonly methods = signal<PaymentMethodOption[]>([]);

  private selectedMethod = '';
  private unsubscribe?: () => void;

  constructor(
    private readonly checkout: TonderCheckoutService,
    private readonly threeDs: ThreeDsService,
    private readonly paymentMethods: PaymentMethodsService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.unsubscribe = this.checkout.onResult((result) => {
      this.status.set(`Payment ${result.status}.`);
      this.busy.set(false);
    });

    const instance = await this.checkout.instance();

    instance.configureCheckout({
      customer: { email: 'shopper@example.com' },
      order_reference: this.order.reference,
    });

    this.methods.set(await this.paymentMethods.load());

    const outcome = await this.threeDs.resolveFromReturnUrl(window.location.search);
    if (outcome) {
      this.status.set(`Payment ${outcome.status}.`);
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }

  selectMethod(code: string): void {
    this.selectedMethod = code;
  }

  async pay(): Promise<void> {
    this.busy.set(true);
    this.status.set('Processing…');

    try {
      const instance = await this.checkout.instance();

      const result = await instance.payment({
        total: this.order.total,
        currency: this.order.currency,
        items: this.order.items,
        ...(this.selectedMethod ? { payment_method: this.selectedMethod } : {}),
      });

      if (this.threeDs.needsChallenge(result.status)) {
        this.status.set('Awaiting bank authentication…');
        const outcome = await this.threeDs.resolve(result.transaction_id!);
        this.status.set(
          outcome.resolved ? `Payment ${outcome.status}.` : `Authentication failed: ${outcome.reason}`,
        );
      } else {
        this.status.set(`Payment ${result.status}.`);
      }
    } catch (error) {
      this.status.set(`Payment failed: ${(error as Error).message}`);
    } finally {
      this.busy.set(false);
    }
  }

  protected readonly environment = environment;
}
