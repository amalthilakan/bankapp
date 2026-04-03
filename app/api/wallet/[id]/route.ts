import { getCurrentUser } from '@/server/auth/service';
import { deleteWalletAccount } from '@/server/wallet/service';

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
    const deleted = await deleteWalletAccount(user.id, id);

    if (!deleted) {
      return Response.json({ success: false, error: 'Wallet not found' }, { status: 404 });
    }

    return Response.json({ success: true, data: { id } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete wallet';
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
