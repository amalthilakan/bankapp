import { getCurrentUser } from '@/server/auth/service';
import { getTransactions } from '@/server/wallet/service';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 20;

    const { transactions, total } = await getTransactions(user.id, type, safePage, safeLimit);
    return Response.json({
      success: true,
      data: transactions,
      meta: { total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load transactions';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
