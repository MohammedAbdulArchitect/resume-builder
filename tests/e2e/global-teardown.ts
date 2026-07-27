import { Pool } from "pg";

// Multiple spec files sign in as the same fixed credentials-test identity
// (test-google-sub). Deleting it per-file in a test.afterAll races other
// spec files still using that same account — clean it up exactly once,
// after the entire run, instead.
//
// Raw SQL rather than importing src/lib/db/accounts.ts: Playwright's
// globalTeardown execution context doesn't apply the same tsconfig "@/"
// path resolution that spec files get, and this stays self-contained.
export default async function globalTeardown() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query('select id from accounts where google_sub = $1', ["test-google-sub"]);
    const account = rows[0];
    if (!account) return;

    const accountId: string = account.id;
    await pool.query(
      'delete from faq_jobs where resume_id in (select id from resumes where account_id = $1)',
      [accountId],
    );
    await pool.query('delete from usage_events where account_id = $1', [accountId]);
    await pool.query('delete from purchases where account_id = $1', [accountId]);
    await pool.query('delete from credits where account_id = $1', [accountId]);
    await pool.query('delete from resumes where account_id = $1', [accountId]);
    await pool.query('delete from accounts where id = $1', [accountId]);
  } finally {
    await pool.end();
  }
}
