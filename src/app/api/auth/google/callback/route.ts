import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // User denied access
  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=google_denied', request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXTAUTH_URL || 'https://your-production-domain.com');
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(new URL('/login?error=google_failed', request.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;

    // 2. Fetch user info from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      return NextResponse.redirect(new URL('/login?error=google_failed', request.url));
    }

    const googleUser = await userInfoRes.json() as {
      id: string;
      email: string;
      name: string;
      picture?: string;
    };

    if (!googleUser.email) {
      return NextResponse.redirect(new URL('/login?error=google_no_email', request.url));
    }

    // 3. Find or create user in DB
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleUser.id },
          { email: googleUser.email },
        ],
      },
    });

    if (!user) {
      // New user — create with Google info
      user = await prisma.user.create({
        data: {
          name: googleUser.name,
          email: googleUser.email,
          googleId: googleUser.id,
          role: 'user',
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'register_google',
          details: 'User registered via Google OAuth',
        },
      });
    } else if (!user.googleId) {
      // Existing email/password user — link Google account
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.id },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'google_link',
          details: 'Google account linked to existing user',
        },
      });
    } else {
      // Returning Google user
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'login_google',
          details: 'User signed in via Google OAuth',
        },
      });
    }

    // 4. Sign JWT token and set cookie (same as regular login)
    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

      const redirectTarget = decodeURIComponent(searchParams.get('state') || '/catalog');
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(new URL('/login?error=google_failed', request.url));
  }
}
