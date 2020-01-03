import { Moment } from 'moment';
import { TransactionStatus } from './transaction-status';
import { Transaction, TransactionInitData } from './transaction';

export interface TransactionPendingInitData extends TransactionInitData {
	date: Moment;
	description: string;
	cardNumber?: string;
	amount: number;
	status: TransactionStatus;
}

/** Provides access to all data FNB provide for a cheque account transaction. */
export class TransactionPending extends Transaction {

	/** The reference number provided for the transaction. */
	public readonly cardNumber: string | undefined;

	constructor(init: TransactionPendingInitData) {
		super(init);
		this.cardNumber = init.cardNumber;
	}
}
