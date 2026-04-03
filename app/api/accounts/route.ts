import { getCurrentUser } from '@/server/auth/service';
import { getBankAccounts, addBankAccount } from '@/server/wallet/service';
import type { Currency } from '@/shared/types';

const SUPPORTED_CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR', 'INR'];

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await getBankAccounts(user.id);
    return Response.json({ success: true, data: accounts });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load bank accounts';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const bankName = typeof body.bankName === 'string' ? body.bankName.trim() : '';
    const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.trim() : '';
    const accountHolder = typeof body.accountHolder === 'string' ? body.accountHolder.trim() : '';
    const balance = Number(body.balance);
    const currency = SUPPORTED_CURRENCIES.includes(body.currency as Currency)
      ? (body.currency as Currency)
      : 'USD';

    if (!bankName || !accountNumber || !accountHolder) {
      return Response.json({ success: false, error: 'Bank name, account number, and account holder are required' }, { status: 400 });
    }

    if (!Number.isFinite(balance) || balance < 0) {
      return Response.json({ success: false, error: 'Opening balance must be a valid non-negative number' }, { status: 400 });
    }

    const account = await addBankAccount(user.id, {
      bankName,
      accountNumber,
      accountHolder,
      currency,
      balance,
    });

    return Response.json({ success: true, data: account }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add bank account';
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
