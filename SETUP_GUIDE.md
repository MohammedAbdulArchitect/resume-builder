# Setup Guide — Before Phase 1

Two critical one-time setups before you start Claude Code. Do these in order.

---

## 1. Create a Free Postgres Database (Neon or Supabase)

You need a PostgreSQL database for your app's schema. Both Neon and Supabase offer free tiers that work great for development and small production loads.

### Option A: Neon (Recommended — simpler)

1. Go to https://neon.tech
2. Sign up with email or GitHub (GitHub is faster).
3. Create a new project.
   - Name: `resume-builder` (or whatever you like)
   - Region: Pick the one closest to you (or closest to Hostinger — that's US-East)
   - Postgres version: latest (default is fine)
4. Click "Create project". Wait 30 seconds.
5. You'll see a connection string that looks like:
   ```
   postgresql://username:password@hostname/resume-builder?sslmode=require
   ```
   This is your **DATABASE_URL**. Copy the entire string.

6. **Optional but recommended:** also grab the **pooled connection string** (Neon offers both direct and pooled). Click "Connection string" and toggle "Pooling" on. This is the one you'll use in production on Hostinger. Copy that version — it looks similar but has `:6543` instead of `:5432` in the port.

7. Keep this string safe — you'll paste it into `.env.local` in step 2 below.

### Option B: Supabase (Full-featured but slightly more steps)

1. Go to https://supabase.com
2. Sign up with email or GitHub.
3. Create a new project.
   - Name: `resume-builder`
   - Database password: auto-generate (Supabase does this)
   - Region: closest to you
   - Click "Create new project". Wait 1–2 minutes.
4. Once created, go to **Settings** → **Database** (left sidebar).
5. Copy the connection string under "URI" (it says "Connection string").
   ```
   postgresql://postgres:password@db.hostname.supabase.co:5432/postgres
   ```
6. **For production on Hostinger, use the pooled connection.** In the same section, look for "Connection pooling" and enable it. Copy that URI instead (uses pgbouncer on port 6543).

7. Keep this string safe.

### Verify the connection (optional but smart)

On your laptop, if you have `psql` installed, test the connection:

```bash
psql "postgresql://username:password@hostname/database?sslmode=require"
```

You should see:
```
psql (15.0, server 15.x)
SSL connection (protocol: TLSv1.3, cipher: ..., compression: off)
Type "help" for help.

resume-builder=>
```

If it works, type `\q` to exit. You're good to go.

---

## 2. Create an Empty GitHub Repository

You'll build the app inside a clone of this repo. GitHub tracks your commits, and Hostinger will pull from here to deploy.

### Steps

1. Go to https://github.com/new (or click **New** if you're logged in).

2. Fill in:
   - **Repository name:** `resume-builder` (or `resume-cv-builder`, your choice)
   - **Description:** (optional) "ATS-friendly resume builder web app"
   - **Public** or **Private:** your choice. Private is safer if it's a commercial product.
   - **Initialize this repository with:**
     - Do NOT check "Add a README" — you'll add your own after Phase 1.
     - Do NOT check "Add .gitignore" — Claude Code will create one.
     - Do NOT check "Choose a license" — you can add one later.
   - Click **Create repository**.

3. GitHub shows you the repo page. Copy the **clone URL**:
   - Click the green **Code** button.
   - Copy the HTTPS URL (looks like `https://github.com/yourname/resume-builder.git`).

4. On your laptop, in a folder where you keep projects, run:

```bash
git clone https://github.com/yourname/resume-builder.git
cd resume-builder
```

You now have an empty folder with a `.git/` directory inside.

5. Verify it's connected to GitHub:

```bash
git remote -v
```

You should see:
```
origin  https://github.com/yourname/resume-builder.git (fetch)
origin  https://github.com/yourname/resume-builder.git (push)
```

Good. Leave the terminal open in this directory.

---

## 3. Set Up Your Local `.env.local` File

This file holds the `DATABASE_URL` for local development. **It's gitignored, so it never goes to GitHub** — that's why it's safe to put secrets here.

1. In the repo folder (the one you just cloned), create a file named `.env.local`:

```bash
touch .env.local
```

2. Open it in your editor (VS Code, Sublime, whatever) and paste:

```
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
```

Replace the entire right side with the connection string you copied from Neon or Supabase in step 1. **Paste it exactly as copied**, including the `?sslmode=require` part.

Example (NOT real):
```
DATABASE_URL=postgresql://user123:abc123xyz@db.neon.tech/resume-builder?sslmode=require
```

3. Save the file.

4. Check that `.env.local` is in `.gitignore` (it will be — Claude Code adds it in Phase 1):

```bash
cat .gitignore | grep env
```

If you see `.env.local` listed, you're good. If `.gitignore` doesn't exist yet, that's fine — Phase 1 creates it.

### For Hostinger later

When you deploy to Hostinger, you will NOT use this `.env.local` file. Instead, Hostinger has an "Environment Variables" panel where you paste `DATABASE_URL` directly into the hosting dashboard. Phase 1's README will remind you of this.

---

## 4. Before You Start Claude Code

Checklist:

- [ ] Neon or Supabase project created
- [ ] `DATABASE_URL` connection string copied
- [ ] GitHub repository created and cloned
- [ ] Terminal is open in the repo folder (`resume-builder/`)
- [ ] `.env.local` file created with `DATABASE_URL` pasted in
- [ ] You can see `.git/` folder in the repo directory

Run this to confirm everything:

```bash
ls -la
```

You should see:
```
.git/
.env.local
```

If both are there, you're ready. **Close this terminal, don't start Claude Code yet — follow the Phase 1 prompt first.**

---

## 5. Starting Claude Code (The Order Matters)

When you're ready to start Phase 1:

1. **Open Claude Code** (or start a new Claude Code session at claude.ai if using web).
2. **Point it at your repo directory** — the folder where `.git/` and `.env.local` live.
3. **Paste the entire contents of `phase1.md`** (from the claude-code-phases folder).
4. Let it propose the plan. Review it. Say "looks good, go ahead" or adjust if needed.
5. Claude Code builds. When it's done, it tells you:
   - Whether `npm run dev` works
   - A manual browser checklist for `localhost:3000`
6. You do the manual checks.
7. Push to GitHub (Claude Code can do this, or you run `git push` from your terminal).
8. Then move to Phase 2.

---

## Troubleshooting

### "Connection refused" when Claude Code tries to migrate

**Problem:** Claude Code can't reach the database.

**Solutions:**
- Confirm `DATABASE_URL` in `.env.local` is correct (no typos, copy-pasted exactly).
- Confirm the database exists in Neon/Supabase (you should see it in their dashboard).
- If using Neon, make sure you copied the connection string (not just the host) — it includes the password.
- Try connecting manually with `psql` first (see "Verify the connection" above).

### "Permission denied" when pushing to GitHub

**Problem:** `git push` fails with authentication error.

**Solutions:**
- Use an **SSH key** (secure) or a **personal access token** (simpler for first-time).
- If using HTTPS (the default), GitHub may ask for a token. Generate one here: https://github.com/settings/tokens
- Paste it as your password when Git prompts.
- Or, switch to SSH: `git remote set-url origin git@github.com:yourname/resume-builder.git` (requires SSH key setup).

### "DATABASE_URL is not set" error in Phase 1

**Problem:** Claude Code can't find the environment variable.

**Solutions:**
- Confirm `.env.local` exists in the repo root.
- Confirm it has the line `DATABASE_URL=...` (no spaces, exact spelling).
- Restart your terminal and `cd` back into the repo folder.
- Confirm Node and npm are installed: `node --version` and `npm --version` (both should show versions, not "command not found").

---

## What Comes Next

Once Phase 1 finishes:

- The repo will have a working Next.js app, database migrations, and the canonical schema.
- Push it to GitHub (`git push`).
- Later, when you're ready to deploy to Hostinger, import the GitHub repo directly into Hostinger's dashboard (Hostinger has a one-click GitHub import).
- At that point, you'll paste the **production** `DATABASE_URL` (the pooled connection string from Neon/Supabase) into Hostinger's environment variables panel.

You'll never edit or commit `.env.local` to GitHub — it stays local and secret.

