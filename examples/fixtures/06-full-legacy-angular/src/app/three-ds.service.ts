import { Injectable } from '@angular/core';
import { TonderCheckoutService } from './tonder-checkout.service';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120000;

export type ThreeDsOutcome = {
  resolved: boolean;
  status: string;
  transactionId?: string;
  reason?: string;
};

/**
 * Orchestrates the legacy 3DS challenge.
 *
 * The legacy SDK hands back a transaction in `requires_action`, opens the
 * issuer challenge in its own iframe, and expects the merchant to call
 * `verify3dsTransaction()` afterwards and then poll until the status settles.
 */
@Injectable({ providedIn: 'root' })
export class ThreeDsService {
  constructor(private readonly checkout: TonderCheckoutService) {}

  needsChallenge(status: string): boolean {
    return status === 'requires_action' || status === 'pending_3ds';
  }

  async resolve(transactionId: string): Promise<ThreeDsOutcome> {
    const instance = await this.checkout.instance();

    let verified: { status?: string; decision?: string };
    try {
      verified = await instance.verify3dsTransaction();
    } catch (error) {
      return { resolved: false, status: 'error', reason: (error as Error).message };
    }

    if (verified.decision === 'failed') {
      return { resolved: true, status: 'declined', transactionId, reason: '3DS rejected' };
    }

    return this.pollUntilSettled(transactionId);
  }

  /**
   * The legacy SDK does not notify when the challenge window closes, so the
   * merchant polls their own backend mirror of the transaction.
   */
  private async pollUntilSettled(transactionId: string): Promise<ThreeDsOutcome> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const response = await fetch(`/api/orders/transaction/${transactionId}`);
      const transaction = await response.json();

      if (!this.needsChallenge(transaction.status)) {
        return { resolved: true, status: transaction.status, transactionId };
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    return { resolved: false, status: 'timeout', transactionId, reason: '3DS timed out' };
  }

  /**
   * Called on the return page after a redirect-based challenge.
   */
  async resolveFromReturnUrl(search: string): Promise<ThreeDsOutcome | null> {
    const params = new URLSearchParams(search);
    const transactionId = params.get('transaction_id');
    if (!transactionId) return null;
    return this.resolve(transactionId);
  }
}
