import { getCurrentUser } from '@/server/auth/service';
import { addWalletAccount, getWalletSummary, getWalletAccounts, getChartData } from '@/server/wallet/service';
import type { Currency } from '@/shared/types';

const SUPPORTED_CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR', 'INR'];

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [summary, walletAccounts, chartData] = await Promise.all([
      getWalletSummary(user.id),
      getWalletAccounts(user.id),
      getChartData(user.id),
    ]);

    return Response.json({ success: true, data: { summary, walletAccounts, chartData } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load wallet data';
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
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const balance = Number(body.balance);
    const currency = SUPPORTED_CURRENCIES.includes(body.currency as Currency)
      ? (body.currency as Currency)
      : 'USD';

    if (name.length < 2) {
      return Response.json({ success: false, error: 'Wallet name must be at least 2 characters long' }, { status: 400 });
    }

    if (!Number.isFinite(balance) || balance < 0) {
      return Response.json({ success: false, error: 'Opening balance must be a valid non-negative number' }, { status: 400 });
    }

    const wallet = await addWalletAccount(user.id, {
      name,
      balance,
      currency,
    });

    return Response.json({ success: true, data: wallet }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create wallet';
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
