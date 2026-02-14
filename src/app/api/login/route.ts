/* eslint-disable no-console,@typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { loginSchema, validateBody } from '@/lib/api-schemas';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// 读取存储类型环境变量
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'upstash'
    | undefined) || 'localstorage';

// Cookie 安全配置
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const AUTH_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  httpOnly: true, // 认证信息仅服务端可读，降低 XSS 窃取风险
  secure: IS_PRODUCTION, // 生产环境强制 HTTPS
};
const CLIENT_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  httpOnly: false,
  secure: IS_PRODUCTION,
};

// 生成签名
async function generateSignature(
  data: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  // 导入密钥
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  // 生成签名
  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  // 转换为十六进制字符串
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 生成认证Cookie（带签名 + 时间戳）
async function generateAuthCookie(
  username?: string,
  password?: string,
  role?: 'owner' | 'admin' | 'user',
  includePassword = false,
): Promise<string> {
  const authData: any = { role: role || 'user' };

  // 只在 localstorage 模式时包含 password
  if (includePassword && password) {
    authData.password = password;
  }

  if (username && process.env.PASSWORD) {
    authData.username = username;
    const timestamp = Date.now();
    authData.timestamp = timestamp;
    // 签名包含时间戳，防止重放攻击
    const signature = await generateSignature(
      `${username}:${timestamp}`,
      process.env.PASSWORD || '',
    );
    authData.signature = signature;
  }

  return encodeURIComponent(JSON.stringify(authData));
}

function generateClientAuthCookie(
  username?: string,
  role: 'owner' | 'admin' | 'user' = 'user',
): string {
  return encodeURIComponent(
    JSON.stringify({
      username,
      role,
    }),
  );
}

export async function POST(req: NextRequest) {
  try {
    // 本地 / localStorage 模式——仅校验固定密码
    if (STORAGE_TYPE === 'localstorage') {
      const envPassword = process.env.PASSWORD;

      // 未配置 PASSWORD 时直接放行
      if (!envPassword) {
        const response = NextResponse.json({ ok: true });

        // 清除可能存在的认证 cookie
        response.cookies.set('auth', '', {
          ...AUTH_COOKIE_OPTIONS,
          expires: new Date(0),
        });
        response.cookies.set('auth_client', '', {
          ...CLIENT_COOKIE_OPTIONS,
          expires: new Date(0),
        });

        return response;
      }

      const body = await req.json();
      const parsed = validateBody(loginSchema, body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      const { password } = parsed.data;

      if (password !== envPassword) {
        return NextResponse.json(
          { ok: false, error: '密码错误' },
          { status: 401 },
        );
      }

      // 验证成功，设置认证cookie
      const response = NextResponse.json({ ok: true });
      const cookieValue = await generateAuthCookie(
        undefined,
        password,
        'user',
        true,
      ); // localstorage 模式包含 password
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7天过期

      response.cookies.set('auth', cookieValue, {
        ...AUTH_COOKIE_OPTIONS,
        expires,
      });
      response.cookies.set(
        'auth_client',
        generateClientAuthCookie(undefined, 'user'),
        {
          ...CLIENT_COOKIE_OPTIONS,
          expires,
        },
      );

      return response;
    }

    // 数据库模式（upstash）——校验用户名并尝试连接数据库
    const body = await req.json();
    const parsed = validateBody(loginSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { username, password } = parsed.data;

    if (!username) {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
    }

    // 可能是站长，直接读环境变量
    if (
      username === process.env.USERNAME &&
      password === process.env.PASSWORD
    ) {
      // 验证成功，设置认证cookie
      const response = NextResponse.json({ ok: true });
      const cookieValue = await generateAuthCookie(
        username,
        password,
        'owner',
        false,
      ); // 数据库模式不包含 password
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7天过期

      response.cookies.set('auth', cookieValue, {
        ...AUTH_COOKIE_OPTIONS,
        expires,
      });
      response.cookies.set(
        'auth_client',
        generateClientAuthCookie(username, 'owner'),
        {
          ...CLIENT_COOKIE_OPTIONS,
          expires,
        },
      );

      return response;
    } else if (username === process.env.USERNAME) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const config = await getConfig();
    const user = config.UserConfig.Users.find((u) => u.username === username);
    if (user && user.banned) {
      return NextResponse.json({ error: '用户被封禁' }, { status: 401 });
    }

    // 校验用户密码
    try {
      const pass = await db.verifyUser(username, password);
      if (!pass) {
        return NextResponse.json(
          { error: '用户名或密码错误' },
          { status: 401 },
        );
      }

      // 验证成功，设置认证cookie
      const response = NextResponse.json({ ok: true });
      const cookieValue = await generateAuthCookie(
        username,
        password,
        user?.role || 'user',
        false,
      ); // 数据库模式不包含 password
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7天过期

      response.cookies.set('auth', cookieValue, {
        ...AUTH_COOKIE_OPTIONS,
        expires,
      });
      response.cookies.set(
        'auth_client',
        generateClientAuthCookie(username, user?.role || 'user'),
        {
          ...CLIENT_COOKIE_OPTIONS,
          expires,
        },
      );

      return response;
    } catch (err) {
      console.error('数据库验证失败', err);
      return NextResponse.json({ error: '数据库错误' }, { status: 500 });
    }
  } catch (error) {
    console.error('登录接口异常', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
