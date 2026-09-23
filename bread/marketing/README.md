# Marketing files

Ready-to-use files for getting the order link to customers. None of this is served by the
site; it lives here so it can be regenerated.

| File | Use |
| --- | --- |
| `sign.pdf` | Print on US Letter. A sign to post (with permission) or hand out. |
| `sign.png` | The same sign as an image, for sharing or printing from a phone. |
| `phone-card.png` | 1080×1920. An Instagram or Facebook story, or keep it on a phone to show someone at the desk. |

Every fact on them (name, prices, pickup days and hours, place, order cutoff, phone number)
is read from `../shared/config.ts`, and the QR code points to `SITE_URL`. When any of those
change, regenerate so the sign matches the site.

## Regenerate

The script needs three small packages that are deliberately **not** app dependencies, plus
Playwright with Chromium. From this folder:

```sh
npm install --no-save qrcode jsqr pngjs playwright
npx playwright install chromium   # skip if Chromium is already installed
node --experimental-strip-types make-sign.mjs
```

If Playwright lives elsewhere, point to it with `PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs`
and `CHROMIUM_PATH=/path/to/chromium`.

The script stops with an error if anything overflows its page, and it decodes each rendered
QR code and checks that it matches `SITE_URL` exactly before finishing. `sign.html` and
`phone-card.html` are the generated pages, kept for reference.
