import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const baseUrl = request.nextUrl.origin;
  
  // Preserve the page the user was on (or a default) to redirect after login
  const referer = request.headers.get('referer') || `${baseUrl}/catalog`;
  const state = encodeURIComponent(referer);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });

  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
