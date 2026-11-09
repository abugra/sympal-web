# sympal-web

The waitlist page for Sympal, at camera.ahm.et.

A single static page: `index.html`, and `rolls/`, one strip of sixteen
frames for each roll of film. No build step.

## Deploying on Cloudflare Pages

- Framework preset: None
- Build command: (empty)
- Build output directory: `/`

## Collecting addresses

The form sends nowhere until `ENDPOINT`, near the end of `index.html`, is set
to a waitlist service's form address. Until then it thanks people and saves
nothing.
