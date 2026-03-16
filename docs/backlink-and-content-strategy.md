# Backlink & Ongoing Content Strategy — QuoteMyFence

This doc is your playbook for earning backlinks and keeping content fresh so the site can rank and stay relevant.

---

## 1. Backlinks: Where to Get Them

### A. **Partner & contractor backlinks (easiest)**
- **Partners page** (`/partners`): Contractors, suppliers, and industry sites can add a “Powered by QuoteMyFence” badge or text link. Every adoption = one backlink.
- **Action:** Email existing customers and friendly contractors: “Add our badge to your site and we’ll feature you.” Link to `/partners` for the code.
- **Action:** Reach out to fence/landscaping suppliers, lumber yards, and trade associations. Offer a free “resource” or “tools” link in exchange for a link to QuoteMyFence (e.g. “Fence quote tool” → your site).

### B. **Directories & listings**
- Submit to:
  - **Software directories:** G2, Capterra, GetApp, Software Advice, Product Hunt (as “fence estimate software” or “contractor software”).
  - **Local/niche:** Canadian business directories, contractor-tool lists, “best software for fence contractors,” “home improvement tools.”
- Use the **Press** page (`/press`) in submissions: “Media kit and facts: [link].”

### C. **Guest posts & roundups**
- **Guest posts:** Pitch 1–2 posts to home-improvement blogs, contractor blogs, or small-business sites. Topics: “How to quote fence jobs faster,” “Tools every fence contractor needs,” “Instant quotes vs. traditional quoting.” In the bio, link to QuoteMyFence (home or signup).
- **Roundups:** Find “best fence software,” “best contractor software Canada,” “tools for fence companies.” Email the author: “We’re QuoteMyFence, we do X. Would you consider adding us?” Link to `/press` for logos and facts.

### D. **HARO / journalist requests**
- Sign up for **HARO** (Help A Reporter Out) or **Qwoted**. When requests mention fencing, contractors, home improvement, or SaaS, reply with a short quote and link to your site or `/press`.

### E. **Resource / linkable content**
- **Blog:** The new posts (fence cost guide Canada, best fence software comparison, spring rush) are linkable. When you see “fence cost” or “fence software” discussions, share the relevant post and ask for a link if it fits.
- **Press page:** Use it as the “official source” link in outreach: “For logos and company info: [link].”

---

## 2. Outreach Email Templates

### Template 1: Partner badge (contractors / suppliers)
**Subject:** Free “Powered by QuoteMyFence” badge for your site

Hi [Name],

We’re QuoteMyFence—instant fence estimate software used by contractors across Canada. We’ve got a simple “Powered by QuoteMyFence” badge and link that partners can add to their site (footer, resources, or tools page). It’s free and takes 2 minutes.

If you’d like to offer your visitors a way to get instant fence quotes, you can grab the code here: [YOUR_SITE]/partners

We’re happy to mention partners in our own materials too. If you have questions, just reply.

Best,  
[Your name]

---

### Template 2: Roundup / list inclusion
**Subject:** Suggestion for your [“Best fence software”] list

Hi [Name],

I saw your roundup on [topic] and thought QuoteMyFence might be a fit. We’re a Canadian fence estimate tool that lets contractors offer instant, map-based quotes and capture leads 24/7. We’d be grateful to be considered for your list.

Details and media kit: [YOUR_SITE]/press

Thanks,  
[Your name]

---

### Template 3: Guest post pitch
**Subject:** Guest post idea: [How to quote fence jobs 3x faster]

Hi [Name],

I’d like to pitch a guest post for [Publication]: “[How to quote fence jobs 3x faster]” — aimed at fence contractors and small trade businesses. I’d cover instant quoting, satellite mapping, and lead capture, with practical steps (no sales pitch in the body). I run QuoteMyFence ([YOUR_SITE]) and work with contractors daily.

I can deliver 800–1,200 words and am happy to follow your guidelines. Would this be a fit?

Best,  
[Your name]

---

## 3. Ongoing Content: What to Publish

### Already added (in codebase)
- **Fence Cost Guide Canada 2025** — by material, height, province; supports “fence cost” searches.
- **Best Fence Contractor Software Canada (2025)** — comparison, linkable.
- **Spring Fence Season: How to Prepare** — seasonal, leads + capacity.

### Content calendar ideas (ongoing)
- **Monthly (or bi-weekly):**
  - One “how-to” or “tips” post (e.g. “How to get more fence leads from Google Business,” “Pricing fence jobs by linear foot”).
  - One “data” or “guide” post (e.g. “Fence permit requirements by province,” “PVC vs wood fence cost 2025”).
- **Quarterly:**
  - “State of fence contracting” or “Fence software comparison” update.
  - Customer story or short case study (with permission).
- **Seasonal:**
  - Spring: rush prep, lead capture (done).
  - Summer: capacity, scheduling.
  - Fall: year-end tips, planning for next season.
  - Winter: planning, marketing for spring.

### Target keywords to weave in
- Fence estimate software, fence quote software, fence contractor software  
- Instant fence estimate, fence quote calculator  
- Fence lead generation, fence contractor leads  
- Canada fence software, fence business software  
- Satellite fence mapping, fence estimate tool  

### Where to publish
- **Blog** (already set up): All posts live at `/blog` and each post has its own URL. Share new posts on LinkedIn, in email, and in partner outreach.
- **Sitemap:** New blog posts are included automatically via `blogPosts` in the sitemap.

---

## 4. Quick Wins Checklist

- [ ] Add Press and Partners to main nav or footer (done in footer).
- [ ] Submit to 3–5 software or contractor directories with link to `/press`.
- [ ] Email 5–10 existing customers: “Add our badge from /partners.”
- [ ] Sign up for HARO or Qwoted; reply to 1–2 relevant requests with a quote + link.
- [ ] Pitch 1 guest post or 1 roundup inclusion using the templates above.
- [ ] Schedule next 2 blog posts (use content ideas above) and add them to `lib/blog-posts.ts`.

---

## 5. How New Blog Posts Get Indexed

1. Add the post to `lib/blog-posts.ts` (slug, title, excerpt, date, author, content).
2. The sitemap includes all `blogPosts` automatically.
3. Deploy; then share the URL on social/email and optionally submit the new URL in Google Search Console.

No other code changes are required for a new post to appear on the blog and in the sitemap.
