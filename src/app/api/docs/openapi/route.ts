import { NextRequest, NextResponse } from 'next/server';

import { generateOpenApiDocument } from '@/lib/openapi';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;
  const document = generateOpenApiDocument(baseUrl);
  return NextResponse.json(document, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
