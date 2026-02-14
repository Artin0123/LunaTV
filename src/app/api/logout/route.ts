import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  const isProduction = process.env.NODE_ENV === 'production';
  const response = NextResponse.json({ ok: true });

  // 清除认证 cookie（HttpOnly）
  response.cookies.set('auth', '', {
    path: '/',
    expires: new Date(0),
    sameSite: 'lax',
    httpOnly: true,
    secure: isProduction,
  });

  // 清除客户端展示 cookie（可读）
  response.cookies.set('auth_client', '', {
    path: '/',
    expires: new Date(0),
    sameSite: 'lax',
    httpOnly: false,
    secure: isProduction,
  });

  return response;
}
