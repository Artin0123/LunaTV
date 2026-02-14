/* eslint-disable no-console,@typescript-eslint/no-explicit-any */

import { NextResponse } from 'next/server';

import { getLiveDefaultUA, getLiveSourceByKey } from '@/lib/live';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const source =
    searchParams.get('moontv-source') || searchParams.get('source');
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  const liveSource = await getLiveSourceByKey(source);
  if (!liveSource) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }
  const ua = liveSource.ua || getLiveDefaultUA();

  try {
    const decodedUrl = decodeURIComponent(url);
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': ua,
      },
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch segment' },
        { status: 500 },
      );
    }

    const headers = new Headers();
    headers.set('Content-Type', 'video/mp2t');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Range, Origin, Accept',
    );
    headers.set('Accept-Ranges', 'bytes');
    headers.set(
      'Access-Control-Expose-Headers',
      'Content-Length, Content-Range',
    );
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // 直接透传上游流，减少 JS 层读写开销
    return new Response(response.body, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch segment' },
      { status: 500 },
    );
  }
}
