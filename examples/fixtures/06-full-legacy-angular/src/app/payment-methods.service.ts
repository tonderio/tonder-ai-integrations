import { Injectable } from '@angular/core';
import { TonderCheckoutService } from './tonder-checkout.service';

export type PaymentMethodOption = {
  code: string;
  label: string;
  category?: string;
};

@Injectable({ providedIn: 'root' })
export class PaymentMethodsService {
  constructor(private readonly checkout: TonderCheckoutService) {}

  async load(): Promise<PaymentMethodOption[]> {
    const instance = await this.checkout.instance();
    const response = await instance.getCustomerPaymentMethods();

    return (response.results ?? []).map((method: Record<string, string>) => ({
      code: method.payment_method,
      label: method.label ?? method.payment_method,
      category: method.category,
    }));
  }
}
