import { AuthError, changeCurrentUserPassword } from '@/server/auth/service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await changeCurrentUserPassword(body);
    return Response.json({ success: true });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Failed to update password';
    return Response.json({ success: false, error: message }, { status });
  }
}
