# sympal-web

The TestFlight waitlist page for Sympal, at camera.ahm.et.

- `public/`: the site. `index.html`, the privacy policy, the Sympal mark
  and one strip of sixteen frames for each roll of film. No build step.
- `functions/api/join.js`: takes the form and keeps the address in a D1
  database, with the time and the words it was agreed to. Nothing else.

## Deploying on Cloudflare Pages

Build settings:

- Framework preset: None
- Build command: (empty)
- Build output directory: `public`

The waitlist needs a D1 database bound to the project:

1. Storage & Databases → D1 → Create, named `sympal-waitlist`.
2. The Pages project → Settings → Bindings → Add → D1 database.
   Variable name `DB`, database `sympal-waitlist`.
3. Deploy again: bindings only reach a new deployment.

The table makes itself on the first sign-up.

## The list

In D1 → `sympal-waitlist` → Console:

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

The consent line on the page and `CONSENT` in `functions/api/join.js` are
the same words: the second is the record of what each person agreed to.
Change one, change both, and update `public/privacy.html` if what is kept or
why changes.

## Running it locally

```sh
npx wrangler pages dev public --d1 DB=sympal-waitlist
```
