import { Page } from 'puppeteer';
import { Account } from '../models/account';
import { AccountType } from '../models/account-type';
import { getAccountType } from './scrape-util';
import { navigateToAccount } from './navigator';
import { Transaction } from '../models/transaction';
import { TransactionCheque, TransactionChequeInitData } from '../models/transaction-cheque';
import { TransactionSavings, TransactionSavingsInitData } from '../models/transaction-savings';
import { TransactionPending } from '../models/transaction-pending';
import { TransactionCredit } from '../models/transaction-credit';
import { TransactionStatus } from '../models/transaction-status';
import moment from 'moment';


export interface TransactionsResponse {
	transactions: Transaction[];
	accountType: AccountType;
}

function cleanNumber(text: string) {
	const amount: string = text.replace(/\s+/, '').replace('R', '').replace(',', '').replace('eB', '');
	const num: number = parseInt(Math.round(parseFloat(amount) * 100) as any, 10);
	return num;
}

async function scrapeChequeOrSavings<T extends TransactionChequeInitData>(page: Page): Promise<T[]> {
	const rows = await page.evaluate(() => {
		/* tslint:disable */

		var data = [];

		var rows = $('.tableRow');
		for (var i = 0; i < rows.length; i++) {
			var row = $(rows[i]);
			var cells = row.find('.tableCell .tableCellItem');

			data.push({
				date: cells[0].innerText as any,
				description: cells[1].innerText,
				reference: cells[2].innerText,
				serviceFee: cells[3].innerText as any,
				amount: cells[4].innerText as any,
				balance: cells[5].innerText as any,
				status: 'Successful'
			});
		}

		return data;
		/* tslint:enable */
	});

	return rows.map((x: any) => ({
		date: moment(x.date, 'DD MMM YYYY'),
		description: x.description,
		reference: x.reference,
		serviceFee: cleanNumber(x.serviceFee),
		amount: cleanNumber(x.amount),
		balance: cleanNumber(x.balance),
		status: TransactionStatus.Successful
	}) as T);
}

const scrapeCheque = async (page: Page): Promise<TransactionCheque[]> => {
	const rows = await page.evaluate(() => {
		/* tslint:disable */

		var data = [];

		var rows = $('.tableRow');
		for (var i = 0; i < rows.length; i++) {
			var row = $(rows[i]);
			var cells = row.find('.tableCell .tableCellItem');

			data.push({
				date: cells[0].innerText as any,
				description: cells[1].innerText,
				reference: cells[2].innerText,
				serviceFee: cells[3].innerText as any,
				amount: cells[4].innerText as any,
				balance: cells[5].innerText as any,
				status: 'Successful'
			});
		}

		return data;
		/* tslint:enable */
	});

	return rows.map((x: any) => ({
		date: moment(x.date, 'DD MMM YYYY'),
		description: x.description,
		reference: x.reference,
		serviceFee: cleanNumber(x.serviceFee),
		amount: cleanNumber(x.amount),
		balance: cleanNumber(x.balance),
		status: TransactionStatus.Successful
	}));
};

const scrapeSavings = async (page: Page): Promise<TransactionSavings[]> => {
	const rows = await page.evaluate(() => {
		/* tslint:disable */

		var data = [];

		var rows = $('.tableRow');
		for (var i = 0; i < rows.length; i++) {
			var row = $(rows[i]);
			var cells = row.find('.tableCell .tableCellItem');

			data.push({
				date: cells[0].innerText as any,
				description: cells[1].innerText,
				amount: cells[2].innerText as any,
				balance: cells[3].innerText as any,
				status: 'Successful'
			});
		}

		return data;
		/* tslint:enable */
	});

	return rows.map((x: any) => ({
		date: moment(x.date, 'DD MMM YYYY'),
		description: x.description,
		amount: cleanNumber(x.amount),
		balance: cleanNumber(x.balance),
		status: TransactionStatus.Successful,
		reference: undefined,
		serviceFee: undefined
	}));
};

const scrapeCredit = async (page: Page): Promise<TransactionCredit[]> => {
	const rows = await page.evaluate(() => {
		/* tslint:disable */

		var data = [];

		var rows = $('.tableRow');
		for (var i = 0; i < rows.length; i++) {
			var row = $(rows[i]);
			var cells = row.find('.tableCell .tableCellItem');

			data.push({
				date: cells[0].innerText as any,
				description: cells[1].innerText,
				amount: cells[2].innerText as any,
				status: 'Successful'
			});
		}

		return data;
		/* tslint:enable */
	});

	return rows.map((x: any) => new TransactionCredit({
		date: moment(x.date, 'DD MMM YYYY'),
		description: x.description,
		amount: cleanNumber(x.amount),
		status: TransactionStatus.Successful
	}));
};

const scrapePending = async (page: Page): Promise<TransactionPending[]> => {
	const rows = await page.evaluate(() => {
		/* tslint:disable */

		var data = [];

		var rows = $('.tableRow');
		for (var i = 0; i < rows.length; i++) {
			var row = $(rows[i]);
			var cells = row.find('.tableCell .tableCellItem');

			data.push({
				date: cells[0].innerText as any,
				cardNumber: cells[1].innerText,
				description: cells[2].innerText,
				amount: cells[3].innerText as any,
				status: 'Pending'
			});
		}

		return data;
		/* tslint:enable */
	});

	return rows.map((x: any) => ({
		date: moment(x.date, 'DD MMM YYYY'),
		cardNumber: x.cardNumber,
		description: x.description,
		amount: cleanNumber(x.amount),
		status: TransactionStatus.Pending
	}));
}

export const scrapeTransactions = async (page: Page, account: Account, pending: boolean = false): Promise<TransactionsResponse> => {
	await navigateToAccount(page, account, 'Transaction', pending ? 'tableSwitcherButton_2' : 'tableSwitcherButton_1'); // TODO: Look for pending and successful

	const accountTypeString = await page.evaluate(() => $('.dlTitle:contains("Type") + div').text().trim());
	const accountType = getAccountType(accountTypeString);

	let promise: Promise<Transaction[]>;

	if (pending) {
		if ([AccountType.Savings, AccountType.Other].indexOf(accountType) !== -1) {
			return {accountType, transactions: []};
		}
		promise = scrapePending(page);
	} else {
		switch (accountType) {
			case AccountType.Cheque:
				promise = scrapeCheque(page);
				break;
			case AccountType.Credit:
				promise = scrapeCredit(page);
				break;
			case AccountType.Savings:
				promise = scrapeSavings(page);
				break;
			default:
				promise = Promise.resolve([]);
				break;
		}
	}

	const transactions = await promise;

	return {
		transactions,
		accountType
	};
};
