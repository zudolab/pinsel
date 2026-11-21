# Verification index

Each report records the commit it tested. A result holds only for that commit. A later head needs its own run, and a historical local result is never evidence for a newer head. Nothing listed here involved a deployment, a live Cloudflare or GitHub request, or a real inquiry.

| Report | What it proves | Tested on |
| --- | --- | --- |
| [public-site.md](public-site.md) | The public site against the approved prototype (zudolab/pinsel#17): fresh-clone build, strict checker 14/14, 84 screenshot pairs at 0.00%, no-JS, keyboard, fragments, TOC, motion, contact, overflow and zoom, contrast, axe, isolation. Two fixes: token layers and accessible names. | Historical local results: `pinsel-site-cms/confirm-site`, base `532bb8d`, fixes verified at `6b1199f`. |
