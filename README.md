# QuoteMyFence — Multi-tenant fence quoting platform

A **Next.js** app that provides:

- **Homeowner flow**: Contact → Location → Draw fence (map) → Design (product/price) → Review → Submit → Completion (with sales team).
- **Contractor side**: Dashboard, products, pricing, branding (Phase 2: full auth + CRUD).

## Tech stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Leaflet (map), React Hook Form, Zod.
- **Backend**: Next.js API routes + Supabase (Postgres, Auth, Storage).
- **Email**: Resend (optional; configure `RESEND_API_KEY` and `EMAIL_FROM`).

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: email (Resend)
RESEND_API_KEY=re_xxxx
EMAIL_FROM=quotes@yourdomain.com
```

### 3. Database schema

In the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql), run the contents of:

```
supabase/schema.sql
```

This creates: `contractors`, `users`, `sales_team_members`, `lead_sources`, `products`, `product_options`, `pricing_rules`, `quote_sessions`, `customers`, `properties`, `fences`, `fence_segments`, `gates`, `quote_totals`, `notifications`, and RLS policies.

### 4. Seed a contractor (for testing)

Run in SQL or use Supabase Table Editor:

```sql
INSERT INTO contractors (company_name, slug, email, phone, primary_color)
VALUES ('Demo Fence Co', 'demo-fence', 'you@example.com', '+16135551234', '#2563eb');

-- Get the contractor id, then:
INSERT INTO products (contractor_id, name, material, default_height_ft, is_active)
VALUES ('<contractor-uuid>', 'Privacy Vinyl', 'Vinyl', 6, true);

-- Get product id, then add product_options:
INSERT INTO product_options (product_id, height_ft, color, is_active)
VALUES ('<product-id>', 6, 'White', true);

-- Get product_option id, then add pricing_rule:
INSERT INTO pricing_rules (contractor_id, product_option_id, base_price_per_ft_low, base_price_per_ft_high, single_gate_low, single_gate_high, double_gate_low, double_gate_high, removal_price_per_ft_low, removal_price_per_ft_high, minimum_job_low, minimum_job_high)
VALUES ('<contractor-uuid>', '<option-id>', 70, 85, 400, 500, 700, 900, 5, 5, 1500, 2000);
```

### 5. Run the app

```bash
npm run dev
```

- **Home**: http://localhost:3000  
- **Estimate flow**: http://localhost:3000/estimate/demo-fence/contact  

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing + slug input to start estimate |
| `/estimate/redirect?slug=xxx` | Redirects to `/estimate/:slug/contact` |
| `/estimate/:slug/contact` | Contact form → creates quote_session + customer |
| `/estimate/:slug/location` | Address → saves property |
| `/estimate/:slug/draw` | Map drawing (Leaflet) + gates + removal prompt |
| `/estimate/:slug/design` | Product option selection + price range |
| `/estimate/:slug/review` | Summary + submit |
| `/estimate/:slug/complete` | Thank you + sales team |
| `/login` | Contractor login (placeholder) |
| `/dashboard` | Contractor dashboard (placeholder) |

## API (public)

- `POST /api/public/quote-session` — create session + customer (body: `contractorSlug`, `contact`).
- `POST /api/public/quote-session/[id]/property` — save property (body: `formattedAddress`, etc.).
- `POST /api/public/quote-session/[id]/drawing` — save fence + segments + gates (body: `points`, `segments`, `gates`, `total_length_ft`, `has_removal`).
- `POST /api/public/quote-session/calculate` — pricing calculation (body: `total_length_ft`, `product_option_id`, `single_gate_qty`, `double_gate_qty`, `has_removal`).
- `POST /api/public/quote-session/[id]/design` — save selected option + totals.
- `POST /api/public/quote-session/[id]/submit` — mark submitted, send contractor + customer emails (if Resend configured).

## Phase 2 (suggested)

- Supabase Auth for contractors; RLS so users only see their `contractor_id`.
- Dashboard: list quotes, edit products/pricing/branding, team, lead sources.
- Optional: PDF export, SMS, abandoned lead recovery.

## Legacy files

The previous static HTML app (e.g. `index.html`, `calculator.html`, `draw.html`, `dashboard.html`, `login.html`, `products.html`) and Netlify function `netlify/functions/send-quote.js` are still in the repo. You can remove them once you have migrated to this Next.js app and updated hosting (e.g. Vercel or Netlify with Next.js).
