import { logoutCurrentUser } from '@/server/auth/service';

export async function POST() {
  try {
    await logoutCurrentUser();
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Logout failed';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
