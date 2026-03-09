# QuoteMyFence — Step-by-step setup (beginner-friendly)

Follow these steps in order. You can do them over multiple sessions; just pick up where you left off.

---

## Step 1: Install Node.js (if you don’t have it)

1. Go to **https://nodejs.org**
2. Download the **LTS** version (green button).
3. Run the installer and accept the defaults (Next, Next, Install).
4. When it’s done, **close any open Terminal or Command Prompt** and open a new one.

**Check it worked:**  
Open Terminal (Mac) or Command Prompt (Windows) and type:

```bash
node --version
```

You should see something like `v20.x.x`. If you get “command not found,” Node isn’t installed or not in your PATH; try installing again and restart the computer.

---

## Step 2: Open the project folder in Terminal

1. On your computer, go to the folder that contains the QuoteMyFence project (the folder that has `package.json` and the `app` folder).
2. **Mac:** Open Terminal, then type `cd ` (with a space), drag the project folder onto the Terminal window, and press Enter.  
   **Windows:** In File Explorer, go to the project folder, click the address bar, type `cmd` and press Enter (this opens Command Prompt in that folder).

You should see a prompt that includes the project folder name. All the following commands assume you’re in this folder.

---

## Step 3: Install the project’s dependencies

In that same Terminal/Command Prompt window, run:

```bash
npm install
```

Wait until it finishes (no red errors). You might see some yellow “warn” messages; that’s okay.

---

## Step 4: Create a Supabase account and project

1. Go to **https://supabase.com** and sign up (or log in).
2. Click **“New project.”**
3. Choose your organization (or create one).
4. Fill in:
   - **Name:** e.g. `quotemyfence`
   - **Database password:** create a strong password and **save it somewhere safe** (you’ll need it to connect to the database).
   - **Region:** pick one close to you.
5. Click **“Create new project”** and wait until the project is ready (green checkmark).

---

## Step 5: Run the database schema in Supabase

This step creates all the tables (contractors, products, quotes, etc.) in your database.

1. In the Supabase dashboard, click your project.
2. In the left sidebar, click **“SQL Editor.”**
3. Click **“New query.”**
4. Open the file **`supabase/schema.sql`** from your project (in Cursor or any text editor).
5. **Select all** the text in that file (Ctrl+A or Cmd+A) and **copy** it.
6. **Paste** it into the Supabase SQL Editor (the big empty box).
7. Click **“Run”** (or press Ctrl+Enter / Cmd+Enter).
8. At the bottom you should see **“Success. No rows returned.”** That’s correct — it means the tables were created.

If you see red errors, copy the error message and you can ask for help (e.g. in Cursor) with that message.

---

## Step 5b: Run storage and contractor policies (for dashboard)

For the contractor dashboard (logo uploads, product management) you need extra policies.

1. In Supabase SQL Editor, run **`supabase/storage.sql`** (creates the logo/image bucket).
2. Then run **`supabase/contractor-policies.sql`** (lets contractors manage their own products).

**Auth:** For signup to work immediately in development, go to **Authentication → Providers → Email** and turn **OFF** “Confirm email.” (You can turn it back on for production.)

---

## Step 6: Get your Supabase keys

You need two values from Supabase to put in your app.

1. In the Supabase dashboard, click **“Project Settings”** (gear icon in the left sidebar).
2. Click **“API”** in the left menu.
3. You’ll see:
   - **Project URL** — something like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string under “Project API keys”
   - **service_role** key — another long string (click “Reveal” if it’s hidden)

**Important:** Keep the **service_role** key secret. Don’t put it in public code or share it. It’s only for your own app on your own machine or your own server.

---

## Step 7: Get a Google Maps API key (for address search & satellite map)

The address autocomplete and map search need a Google Maps API key.

1. Go to **https://console.cloud.google.com** and sign in.
2. Create a project (or pick an existing one).
3. Go to **APIs & Services** → **Library**.
4. Enable **Maps JavaScript API** and **Places API**.
5. Go to **APIs & Services** → **Credentials** → **Create credentials** → **API key**.
6. Copy the key. (Optional: restrict it by HTTP referrer to your domain to keep it secure.)

## Step 8: Create the `.env.local` file in your project

This file holds your secret keys so the app can talk to Supabase and Google.

1. In your project folder, look for a file named **`.env.example`**. Open it (in Cursor or Notepad).
2. Create a **new file** in the same folder (same level as `package.json`).
3. Name it **exactly:** `.env.local`  
   (including the dot at the start; no `.txt` at the end).
4. Copy the contents of `.env.example` into `.env.local`.
5. Replace the placeholder values with your real values:
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = paste your **Google Maps API key** from Step 7.
   - `NEXT_PUBLIC_SUPABASE_URL` = paste your **Project URL** from Step 6.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = paste the **anon public** key.
   - `SUPABASE_SERVICE_ROLE_KEY` = paste the **service_role** key.

Example (your values will be different):

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

6. Save the file.  
**Important:** Don’t commit `.env.local` to Git or share it; it’s in `.gitignore` so it stays private.

---

## Step 9: Add a test contractor (optional — or sign up via the app)

You can either:

**A) Sign up through the app:** Go to http://localhost:3000, click **Contractor Sign up**, and create an account. You’ll enter company info, pick an accent color, and then manage products in the dashboard.

**B) Add a contractor manually in Supabase** (if you want to test the homeowner flow without signing up):

1. In Supabase, go to **“Table Editor”** in the left sidebar.
2. Click the **`contractors`** table.
3. Click **“Insert row”** (or “Insert”).
4. Fill in at least:
   - **company_name:** e.g. `Demo Fence Co`
   - **slug:** e.g. `demo-fence` (no spaces; this is the bit that goes in the URL)
   - **email:** your real email (so you can get test emails)
   - **is_active:** leave as `true`
5. Click **“Save.”**
6. In the new row, **copy the value in the `id` column** (a long UUID like `a1b2c3d4-...`). You’ll need it in the next step.

Then add a product:

7. Open the **`products`** table.
8. Click **“Insert row.”**
9. Fill in:
   - **contractor_id:** paste the **contractors** `id` you just copied.
   - **name:** e.g. `Privacy Vinyl`
   - **is_active:** `true`
10. Click **“Save.”**
11. Copy this product’s **`id`** (you’ll use it for product_options).

Add a product option (height/color):

12. Open the **`product_options`** table.
13. Click **“Insert row.”**
14. Fill in:
    - **product_id:** paste the **products** `id` you copied.
    - **height_ft:** `6`
    - **color:** `White`
    - **is_active:** `true`
15. Click **“Save.”**
16. Copy this row’s **`id`** (product_options id).

Add pricing for that option:

17. Open the **`pricing_rules`** table.
18. Click **“Insert row.”**
19. Fill in:
    - **contractor_id:** same **contractors** `id` from step 6.
    - **product_option_id:** the **product_options** `id` you just copied.
    - **base_price_per_ft_low:** `70`
    - **base_price_per_ft_high:** `85`
    - **single_gate_low:** `400` (additional charge per single gate; varies by material)
    - **single_gate_high:** `500`
    - **double_gate_low:** `700`
    - **double_gate_high:** `900`
    - **removal_price_per_ft_low:** `5` (old fence removal, $/ft)
    - **removal_price_per_ft_high:** `5`
    - **minimum_job_low:** `1500`
    - **minimum_job_high:** `2000`
    - **is_active:** `true`
20. Click **“Save.”**

After this, the app will have one contractor (“Demo Fence Co”) with one fence option and pricing.

---

## Step 10: Run the app on your computer

1. Make sure you’re still in the project folder in Terminal (see Step 2).
2. Run:

```bash
npm run dev
```

3. Wait until you see something like:

```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

4. Open your browser and go to: **http://localhost:3000**

You should see the QuoteMyFence landing page.

---

## Step 11: Try the full estimate flow

1. On the home page, in the **“Contractor slug”** box, type: **`demo-fence`** (the slug you used in Step 8).
2. Click **“Start estimate.”**
3. You should be on the contractor’s contact page. Fill in:
   - First name, last name, email, phone.
4. Click **“Continue.”**
5. On the **Location** step, type any address (e.g. your city or a real address) and click **“Continue to draw fence.”**
6. On the **Draw** step, click on the map a few times to add points (you’ll see a line and total feet). Optionally click **“+ Single gate”** or **“+ Double gate.”** Then click **“Continue.”**
7. Choose **“Add fence removal?”** — click **Yes** or **No.**
8. On **Design**, you should see “Privacy Vinyl • 6 ft • White.” Click it, then **“Continue to review.”**
9. On **Review**, check the summary and click **“Submit quote request.”**
10. You should see the **Thank you** / completion page.

If anything doesn’t load or you get a blank page or error, note the exact message or step and you can ask for help with that.

---

## Optional: Send real emails when someone submits

Right now, submit still works and saves to the database; emails are optional.

1. Sign up at **https://resend.com** and get an API key.
2. Add to your **`.env.local`** file:
   - `RESEND_API_KEY=re_xxxxxxxx` (your key)
   - `EMAIL_FROM=quotes@yourdomain.com` (use a domain you’re allowed to send from in Resend)
3. Restart the app: in Terminal press **Ctrl+C**, then run **`npm run dev`** again.

After that, when a homeowner submits a quote, the contractor and customer emails will be sent through Resend.

---

## Quick reference

| What you want to do        | Command or place              |
|---------------------------|-------------------------------|
| Install dependencies      | `npm install`                 |
| Run the app locally       | `npm run dev`                 |
| Stop the app              | In Terminal: **Ctrl+C**       |
| Open the app in browser   | http://localhost:3000         |
| Test the estimate flow    | Use slug: `demo-fence`        |
| Change database (tables)  | Supabase → SQL Editor         |
| Change data (contractors) | Supabase → Table Editor       |
| Change secret keys        | Edit `.env.local` and restart |

---

## If something goes wrong

- **“Cannot find module” or “command not found”**  
  Run `npm install` again from the project folder and make sure Node is installed (Step 1).

- **Blank page or “Failed to fetch”**  
  Check that `.env.local` has the correct Supabase URL and keys (Steps 6–7) and that you ran the schema (Step 5).

- **“Contractor not found” or no products on Design**  
  Make sure you added the contractor, product, product_option, and pricing_rule (Step 8) and used the slug `demo-fence` (or whatever slug you set) on the home page.

- **Port 3000 already in use**  
  Either close the other app using port 3000, or run:  
  `npm run dev -- -p 3001`  
  Then open http://localhost:3001 instead.

If you tell me the exact step number and the error message (or a screenshot), I can give you the next fix.
