import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const normalized = (slug || '')
    .trim()
    .toLowerCase()
    .replace(/^\/*/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (!normalized) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.redirect(new URL(`/estimate/${encodeURIComponent(normalized)}/contact`, request.url));
}
