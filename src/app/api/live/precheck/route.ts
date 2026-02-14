/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';

import { getLiveDefaultUA, getLiveSourceByKey } from '@/lib/live';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const source = searchParams.get('moontv-source');

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
    let response = await fetch(decodedUrl, {
      method: 'HEAD',
      cache: 'no-cache',
      redirect: 'follow',
      headers: {
        'User-Agent': ua,
      },
    });

    // 某些源不支持 HEAD，回退到 GET。
    if (response.status === 405 || response.status === 501) {
      response = await fetch(decodedUrl, {
        method: 'GET',
        cache: 'no-cache',
        redirect: 'follow',
        headers: {
          'User-Agent': ua,
        },
      });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch', message: response.statusText },
        { status: 500 },
      );
    }

    const contentType =
      response.headers.get('Content-Type')?.toLowerCase() || '';
    if (response.body) {
      response.body.cancel();
    }
    if (contentType.includes('video/mp4')) {
      return NextResponse.json({ success: true, type: 'mp4' }, { status: 200 });
    }
    if (contentType.includes('video/x-flv')) {
      return NextResponse.json({ success: true, type: 'flv' }, { status: 200 });
    }
    return NextResponse.json({ success: true, type: 'm3u8' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
