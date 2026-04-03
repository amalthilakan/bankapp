import { AuthError, loginUser } from '@/server/auth/service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await loginUser(body);
    return Response.json({ success: true, data: user });
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Login failed';
    return Response.json({ success: false, error: message }, { status });
  }
}
