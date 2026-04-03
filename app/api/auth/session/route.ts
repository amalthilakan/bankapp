import { getCurrentUser } from '@/server/auth/service';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return Response.json({ success: true, data: user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load session';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
