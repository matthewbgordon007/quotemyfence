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
  const isDashboardSettings = request.nextUrl.pathname.startsWith('/dashboard/settings');
  const isCompleteSetupApi =
    request.nextUrl.pathname === '/api/contractor/complete-setup' && request.method === 'POST';

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
      .maybeSingle();

    if (!userRow?.contractor_id) {
      if (isCompleteSetupApi) {
        return response;
      }
      if (isContractorApi) {
        return NextResponse.json(
          { error: 'Complete company setup first or contact support.' },
          { status: 403 }
        );
      }
      if (isDashboardSettings) {
        return response;
      }
      if (isDashboard) {
        return NextResponse.redirect(new URL('/dashboard/settings', request.url));
      }
    } else {
      const { data: contractor } = await supabase
        .from('contractors')
        .select('stripe_subscription_status, billing_access_override')
        .eq('id', userRow.contractor_id)
        .single();

      const hasOverride = contractor?.billing_access_override === true;
      if (!hasOverride && !isBillingActive(contractor?.stripe_subscription_status)) {
        if (isContractorApi) {
          return NextResponse.json({ error: 'Billing required' }, { status: 402 });
        }
        return NextResponse.redirect(new URL('/dashboard/billing', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup', '/api/contractor/:path*'],
};
