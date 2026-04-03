import { getCurrentUser } from '@/server/auth/service';
import { deposit } from '@/server/wallet/service';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { walletId, amount, currency } = body;

    if (!walletId || !amount || amount <= 0) {
      return Response.json({ success: false, error: 'Invalid deposit parameters' }, { status: 400 });
    }

    const wallet = await deposit(user.id, walletId, Number(amount), currency || 'USD');
    return Response.json({ success: true, data: wallet });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deposit failed';
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
