// The site is the files in public/, which Cloudflare serves before this
// Worker is ever reached. The Worker answers the one thing a file cannot:
// POST /api/join, one address onto the TestFlight waitlist.
//
// Kept to what consent needs and no more: the address, when it was given,
// and the words it was given to. No IP address, no browser, nothing else.
// The table is made on first use, so the D1 database only has to exist and
// be bound as `DB` (see wrangler.jsonc).

// Word for word what the box on the page says. If one changes, change both:
// this is the record of what each person agreed to.
const CONSENT = "Sympal may keep this address to send me a TestFlight invite, and for nothing else";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers }
  });

async function join(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "bad request" }, 400);
  }

  // Filled in only by bots: the field is hidden from people. They are
  // thanked like anyone else and nothing is kept.
  if (String(form.get("website") || "").trim()) return json({ ok: true });

  const email = String(form.get("email") || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return json({ error: "email" }, 400);
  if (form.get("consent") !== "yes") return json({ error: "consent" }, 400);

  if (!env.DB) return json({ error: "no database bound" }, 500);

  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS waitlist (email TEXT PRIMARY KEY, consented_at TEXT NOT NULL, consent TEXT NOT NULL)"
  ).run();
  // Joining twice keeps the first consent and says nothing different, so the
  // page never tells anyone whether an address is already on the list.
  await env.DB.prepare(
    "INSERT OR IGNORE INTO waitlist (email, consented_at, consent) VALUES (?1, ?2, ?3)"
  ).bind(email, new Date().toISOString(), CONSENT).run();

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/join") {
      if (request.method !== "POST") return json({ error: "method not allowed" }, 405, { allow: "POST" });
      return join(request, env);
    }
    // Anything else that is not a file: the assets say so (a 404).
    return env.ASSETS.fetch(request);
  }
};
