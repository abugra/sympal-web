// The site is the files in public/, which Cloudflare serves before this
// Worker is ever reached. The Worker answers the one thing a file cannot:
// POST /api/join, one address onto the TestFlight waitlist.
//
// Kept to what consent needs and no more: the address, when it was given,
// and the words it was given to. No IP address, no browser, nothing else.
// The table is made on first use, so the D1 database only has to exist and
// be bound as `DB` (see wrangler.jsonc).

import { EmailMessage } from "cloudflare:email";

// Each new address is also mailed to the maker, from an address on ahm.et,
// where Email Routing sends; the binding in wrangler.jsonc only ever lets it
// write to his own, verified address.
const NOTIFY_FROM = "waitlist@ahm.et";
const NOTIFY_TO = "abavcilar@gmail.com";

// Word for word what the box on the page says. If one changes, change both:
// this is the record of what each person agreed to.
const CONSENT = "Sympal may keep this address to send me a TestFlight invite, and for nothing else";

// Short links on the home page: sympal.ahm.et/?open=beta goes straight to
// the public TestFlight invite. Any other value, or none, is the page itself.
const OPEN = Object.assign(Object.create(null), {
  beta: "https://testflight.apple.com/join/21z7HFkk"
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers }
  });

async function join(request, env, ctx) {
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
  const added = await env.DB.prepare(
    "INSERT OR IGNORE INTO waitlist (email, consented_at, consent) VALUES (?1, ?2, ?3)"
  ).bind(email, new Date().toISOString(), CONSENT).run();

  // Only for someone new, and after the answer has gone: a mail that cannot
  // be sent must not cost anyone their place on the list.
  if (added.meta.changes > 0 && env.NOTIFY) ctx.waitUntil(notify(env, email));

  return json({ ok: true });
}

async function notify(env, email) {
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM waitlist").first();
    const n = row?.n ?? 0;
    // The address passed the check above, which allows no spaces or line
    // breaks, so it cannot add a header of its own.
    const raw = [
      `From: Sympal waitlist <${NOTIFY_FROM}>`,
      `To: <${NOTIFY_TO}>`,
      `Subject: New on the Sympal waitlist: ${email}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@ahm.et>`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      `${email} joined the TestFlight waitlist`,
      "",
      `That makes ${n} on the list`
    ].join("\r\n");
    await env.NOTIFY.send(new EmailMessage(NOTIFY_FROM, NOTIFY_TO, raw));
  } catch (error) {
    console.error("Waitlist: the mail about a new address was not sent", error);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === "/") {
      const to = OPEN[url.searchParams.get("open")];
      if (to) return Response.redirect(to, 302);
    }
    if (pathname === "/api/join") {
      if (request.method !== "POST") return json({ error: "method not allowed" }, 405, { allow: "POST" });
      return join(request, env, ctx);
    }
    // Anything else that is not a file: the assets say so (a 404).
    return env.ASSETS.fetch(request);
  }
};
