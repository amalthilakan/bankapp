import { getCurrentUser } from '@/server/auth/service';
import { deleteBankAccount, selectBankAccount } from '@/server/wallet/service';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await deleteBankAccount(user.id, id);
    if (!deleted) {
      return Response.json({ success: false, error: 'Bank account not found' }, { status: 404 });
    }
    return Response.json({ success: true, data: { id } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete bank account';
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const account = await selectBankAccount(user.id, id);

    return Response.json({ success: true, data: account });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to select bank account';
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
