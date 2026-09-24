import { useState } from 'react'
import { SHOP_NAME, SITE_URL } from '../../../shared/config.ts'
import { SHARE_DIR, SHARE_FILES } from '../../../shared/share.ts'
import { Button, Page, Title } from '../ui.tsx'

/**
 * Getting the order link to customers: the link to copy, the QR code to
 * scan or save, and the ready-made sign and story card. Nothing here talks
 * to the server; the files are static, under public/share/.
 */
export default function Share({ onBack }: { onBack: () => void }) {
  const [copied, setCopied] = useState<'yes' | 'failed' | null>(null)
  const shown = SITE_URL.replace(/^https:\/\//, '')

  async function copy() {
    try {
      await navigator.clipboard.writeText(SITE_URL)
      setCopied('yes')
    } catch {
      setCopied('failed')
    }
  }

  return (
    <Page width="max-w-2xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <Title kicker={SHOP_NAME} sub="Send people the link, or let them scan the code. Both open the order page.">
          Share
        </Title>
        <Button variant="ghost" className="shrink-0" onClick={onBack}>
          ← Orders
        </Button>
      </div>

      <section className="mb-4 rounded-2xl border border-line bg-white p-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-cocoa-soft">Your link</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <a className="min-w-0 break-all text-[17px] font-semibold text-crust-dark underline underline-offset-2" href={SITE_URL} target="_blank" rel="noreferrer">
            {shown}
          </a>
          <Button variant="secondary" onClick={copy}>
            {copied === 'yes' ? 'Copied ✓' : 'Copy link'}
          </Button>
        </div>
        {copied === 'failed' && <p className="mt-2 text-[13px] text-cocoa-soft">This browser wouldn't copy. Press and hold the link above to copy it.</p>}
        <p className="mt-2 text-[13px] text-cocoa-soft">Pasted into a text, Instagram or Facebook, it shows a "{SHOP_NAME}" preview card.</p>
      </section>

      <section className="mb-4 rounded-2xl border border-line bg-white p-4 text-center">
        <p className="text-left text-[12px] font-semibold uppercase tracking-[0.14em] text-cocoa-soft">Your QR code</p>
        <img src={`${SHARE_DIR}qr.png`} alt={`QR code that opens ${shown}`} className="mx-auto mt-3 w-full max-w-[320px] rounded-xl border border-line" />
        <p className="mt-2 text-[13px] text-cocoa-soft">Point a phone camera at it to try it. It opens the order page.</p>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-cocoa-soft">Download</p>
        <ul className="mt-2 divide-y divide-line">
          {SHARE_FILES.map((f) => (
            <li key={f.file} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-cocoa">{f.label}</span>
                <span className="block text-[13px] text-cocoa-soft">{f.note}</span>
              </span>
              <a
                className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-cream-2 px-4 text-[15px] font-semibold text-cocoa hover:bg-line"
                href={`${SHARE_DIR}${f.file}`}
                download={`fresh-bread-${f.file}`}
              >
                Download
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-cocoa-soft">On iPhone, if a file opens instead of saving, press and hold it, then tap Save.</p>
      </section>
    </Page>
  )
}
