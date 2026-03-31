import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isBillingActive } from '@/lib/billing';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  const isDashboardBilling = request.nextUrl.pathname.startsWith('/dashboard/billing');
  const isAuthPage =
    request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup';
  const isContractorApi = request.nextUrl.pathname.startsWith('/api/contractor/');

  if (isDashboard && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (user && (isDashboard || isContractorApi) && !isDashboardBilling) {
    const { data: userRow } = await supabase
      .from('users')
      .select('contractor_id')
      .eq('auth_id', user.id)
      .eq('is_active', true)
      .single();

    if (!userRow?.contractor_id) {
      if (isContractorApi) {
        return NextResponse.json({ error: 'Billing required' }, { status: 402 });
      }
      return NextResponse.redirect(new URL('/dashboard/billing', request.url));
    }

    const { data: contractor } = await supabase
      .from('contractors')
      .select('stripe_subscription_status')
      .eq('id', userRow.contractor_id)
      .single();

    if (!isBillingActive(contractor?.stripe_subscription_status)) {
      if (isContractorApi) {
        return NextResponse.json({ error: 'Billing required' }, { status: 402 });
      }
      return NextResponse.redirect(new URL('/dashboard/billing', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup', '/api/contractor/:path*'],
};
