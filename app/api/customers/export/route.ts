import { getCurrentUser } from '@/server/auth/service';
import { getCustomers, normalizeCustomerStatus } from '@/server/customers/service';

function toCsvValue(value: string | number) {
  const normalized = String(value).replace(/"/g, '""');
  return `"${normalized}"`;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatJoinedDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? undefined;
    const status = normalizeCustomerStatus(searchParams.get('status') ?? undefined);
    const customers = await getCustomers({ query, status });
    const rows = [
      ['Customer ID', 'Name', 'Email', 'Wallet Balance', 'Wallets', 'Bank Accounts', 'Transactions', 'Status', 'Joined'],
      ...customers.map((customer) => [
        customer.id,
        customer.name,
        customer.email,
        formatCurrency(customer.totalBalance),
        customer.walletCount,
        customer.bankAccountCount,
        customer.transactionCount,
        customer.status,
        formatJoinedDate(customer.joined),
      ]),
    ];

    const csv = rows.map((row) => row.map((value) => toCsvValue(value)).join(',')).join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export customers';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
