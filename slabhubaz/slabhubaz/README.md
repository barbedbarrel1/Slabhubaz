# SlabHub AZ — Setup Guide

## What's in this project

| File | What it does |
|---|---|
| `index.html` | Homepage with hero + recent slabs |
| `inventory.html` | Full slab grid with search + filters |
| `slab.html` | Individual slab detail page (uses ?slug= URL param) |
| `contact.html` | Contact page with form |
| `admin.html` | Admin login + full dashboard |
| `css/style.css` | All styles |
| `js/config.js` | Supabase connection (paste your keys here) |
| `js/home.js` | Homepage slab loader |
| `js/inventory.js` | Grid, search, filter, sort |
| `js/slab.js` | Detail page loader |
| `js/admin.js` | Admin auth + slab CRUD + image uploads |
| `schema.sql` | Database setup — run once in Supabase |

---

## Step 1 — Create a Supabase project (free)

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **New Project**
3. Name it `slabhubaz`, pick a region close to Arizona (US West)
4. Set a strong database password and save it
5. Wait for it to spin up (~1 min)

---

## Step 2 — Run the database schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Open `schema.sql` from this project
3. Copy everything and paste it into the SQL editor
4. Click **Run**
5. You should see "Success" — no errors

---

## Step 3 — Create the admin user

1. In Supabase, go to **Authentication → Users**
2. Click **Add User → Create New User**
3. Enter the client's email and a strong password
4. That's their login for `/admin.html`

---

## Step 4 — Add your Supabase keys

1. In Supabase, go to **Project Settings → API**
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
3. Open `js/config.js`
4. Replace the two placeholder values:

```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## Step 5 — Add the logo

1. Take the `logo.png` file (the SlabHub AZ logo)
2. Put it in the `assets/` folder as `logo.png`
3. That's it — it'll show in the nav, footer, and admin panel

### Optional: Hero background photo
- Add a photo of the showroom or stone slabs to `assets/hero-bg.jpg`
- It'll show as a subtle overlay behind the hero text

---

## Step 6 — Update contact info

Open `contact.html` and replace these placeholders with real info:

- Phone number: `(602) 000-0000`
- Email: `info@slabhubaz.com`
- Address: `Phoenix, AZ`
- Hours: update if different

---

## Step 7 — Deploy to GitHub Pages

1. Push this entire folder to a GitHub repo
2. Go to **Settings → Pages**
3. Source: **Deploy from a branch**, select `main`, root `/`
4. GitHub will give you a URL like `https://yourusername.github.io/slabhubaz/`
5. That's your live site

---

## How the client uploads slabs

1. Client goes to `yoursite.com/admin.html`
2. Logs in with their email + password
3. Clicks **Add New Slab**
4. Fills in name, material type, color, size, etc.
5. Uploads photos (drag and drop or click)
6. Checks **Published** to make it live
7. Hits **Save Slab**

The slab immediately appears on the inventory grid and gets its own detail page at `yoursite.com/slab.html?slug=slab-name`.

---

## Quick reference: slab detail page URLs

Slab URLs are auto-generated from the slab name:
- "Calacatta Gold" → `slab.html?slug=calacatta-gold`
- "Fantasy Brown Leather" → `slab.html?slug=fantasy-brown-leather`

---

## Troubleshooting

**Slabs not loading?**
- Double-check your Supabase URL and anon key in `js/config.js`
- Make sure you ran `schema.sql`
- Check browser console for errors

**Images not uploading?**
- Make sure the `slab-images` storage bucket was created (the SQL does this automatically)
- Confirm the bucket is set to **Public** in Supabase → Storage

**Admin login not working?**
- Make sure you created the user in Supabase → Authentication → Users
- Passwords are case-sensitive

**Slab shows in admin but not on the public site?**
- The slab needs to have **Published** toggled ON

---

## Supabase free tier limits (more than enough for this)

| Resource | Free limit |
|---|---|
| Database | 500MB |
| Storage | 1GB |
| Bandwidth | 5GB/month |
| Auth users | Unlimited |

This site will comfortably stay within free limits for years.
