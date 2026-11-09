# sympal-web

The TestFlight waitlist page for Sympal, at sympal.ahm.et.

- `public/`: the site. `index.html`, the privacy policy, the Sympal mark
  and one strip of sixteen frames for each roll of film. No build step.
- `src/worker.js`: a Cloudflare Worker for the one request a file cannot
  answer, `POST /api/join`. It keeps the address in D1, with the time and
  the words it was agreed to. Nothing else.
- `wrangler.jsonc`: the Worker (`sympal-web`), its files, the D1
  database `sympal-waitlist` bound as `DB`, and `NOTIFY`, which mails
  abavcilar@gmail.com from waitlist@ahm.et for each new address.

## Before the first deploy with NOTIFY

Mail from a Worker goes through Cloudflare Email Routing, once:

1. The `ahm.et` zone → Email → Email Routing → enable it. Cloudflare adds
   MX and SPF records for ahm.et: if ahm.et already takes mail somewhere
   else, stop here, as this would take that over.
2. Email Routing → Destination addresses → add abavcilar@gmail.com, and
   click the link in the mail Cloudflare sends.

Without them a sign-up is still kept; only the mail about it is lost.

## Deploying

```sh
npx wrangler deploy
```

If the repository is connected to the Worker in Cloudflare (Workers
Builds), a push to `main` does this by itself.

The table makes itself on the first sign-up.

## The list

In Cloudflare: Storage & Databases → D1 → `sympal-waitlist` → Console:

```sql
SELECT email, consented_at FROM waitlist ORDER BY consented_at;
```

Or as JSON, to import into a mail service:

```sh
npx wrangler d1 execute sympal-waitlist --remote --json \
  --command "SELECT email FROM waitlist"
```

Someone asks to be removed (the privacy policy promises it within a month):

```sql
DELETE FROM waitlist WHERE email = 'them@example.com';
```

When the TestFlight beta ends, the privacy policy says the list goes:

```sql
DROP TABLE waitlist;
```

## Changing the wording

The consent line on the page and `CONSENT` in `src/worker.js` are the same
words: the second is the record of what each person agreed to. Change one,
change both, and update `public/privacy.html` if what is kept or why
changes.

## Running it locally

```sh
npx wrangler dev
```

This uses a local copy of the database, not the real list.
