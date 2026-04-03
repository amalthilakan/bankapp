import { AuthError, updateCurrentUserProfile } from '@/server/auth/service';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const user = await updateCurrentUserProfile(body);
    return Response.json({ success: true, data: user });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    return Response.json({ success: false, error: message }, { status });
  }
}
