/**
 * The files Biz downloads from Admin → Share, served from public/share/.
 * bread/marketing/make-sign.mjs writes them (and checks every QR code reads
 * SITE_URL); tests/deploy-layout.test.ts checks each one exists, so a
 * download button can't point at nothing.
 */
export const SHARE_FILES = [
  { file: 'qr.png', label: 'QR code', note: 'Image, for phones, posts and most printing' },
  { file: 'qr.svg', label: 'QR code for printing', note: 'Stays sharp at any size — business cards, banners' },
  { file: 'sign.pdf', label: 'Sign to print', note: 'Letter size, with prices, pickup and the QR code' },
  { file: 'phone-card.png', label: 'Phone / story card', note: 'For an Instagram or Facebook story, or to show on your phone' },
] as const

export const SHARE_DIR = '/share/'
