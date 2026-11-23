import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { MemberReceiptRequest } from './bond.model';

/**
 * In-app domain events for the bonds feature.
 *
 * Decouples the two bond screens: the payments side announces that a
 * receipt was recorded, and anything that depends on it (maintenance
 * differences' paid/remaining balances) reacts — without the payments
 * service having to know who is listening.
 */
@Injectable({ providedIn: 'root' })
export class BondEventsService {
  private readonly receiptRecordedSubject = new Subject<MemberReceiptRequest>();

  /** Emits once per successfully-recorded maintenance-difference payment. */
  readonly receiptRecorded$: Observable<MemberReceiptRequest> = this.receiptRecordedSubject.asObservable();

  notifyReceiptRecorded(receipt: MemberReceiptRequest): void {
    this.receiptRecordedSubject.next(receipt);
  }
}
