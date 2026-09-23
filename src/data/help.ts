/**
 * Where to go when it cannot wait for the founder.
 *
 * A report is read within the week, and the product said nothing about what
 * to do before then: no emergency number, no helpline, anywhere in the app,
 * on a screen whose second reason is "Threatened me, or someone I know"
 * (docs/ABUSE.md). This is that line — the country's emergency number, and one
 * national, free, round-the-clock line for abuse in a relationship.
 *
 * Every number was checked against the service's own site, or a government
 * page naming it, on HELP_CHECKED. A number that could not be confirmed is
 * left out rather than guessed: Somalia's emergency numbers differ by region
 * and by source, so it gets the generic line, not a number that may ring
 * nowhere. Re-check once a year (docs/OPERATING.md) — Sweden's changed in
 * 2025 (the old 020-50 50 50 still connects).
 *
 * Static text on her own phone. Nothing is sent, nothing is logged, and the
 * country comes from what she already told the app, or nothing.
 */

export const HELP_CHECKED = '2026-09-23'

export interface Helpline {
  name: string
  /** As it is dialled, spaces for reading only. */
  number: string
}

export interface Help {
  /** Police and ambulance. */
  emergency?: string
  line?: Helpline
}

export const HELP: Record<string, Help> = {
  // thehotline.org — also text START to 88788.
  us: { emergency: '911', line: { name: 'National Domestic Violence Hotline', number: '1-800-799-7233' } },
  // awhl.org. Ontario only — Canada has no national line, and Toronto is the
  // city the door names.
  ca: { emergency: '911', line: { name: 'Assaulted Women’s Helpline (Ontario)', number: '1-866-863-0511' } },
  // nationaldahelpline.org.uk (Refuge).
  uk: { emergency: '999', line: { name: 'National Domestic Abuse Helpline', number: '0808 2000 247' } },
  // kvinnofridslinjen.se — 116 016 since April 2025.
  se: { emergency: '112', line: { name: 'Kvinnofridslinjen', number: '116 016' } },
  // volinjen.no.
  no: { emergency: '112', line: { name: 'VO-linjen', number: '116 006' } },
  // levudenvold.dk.
  dk: { emergency: '112', line: { name: 'Lev Uden Vold', number: '1888' } },
  // veiligthuis.nl.
  nl: { emergency: '112', line: { name: 'Veilig Thuis', number: '0800 2000' } },
  // nollalinja.fi (THL).
  fi: { emergency: '112', line: { name: 'Nollalinja', number: '080 005 005' } },
  // hilfetelefon.de.
  de: { emergency: '112', line: { name: 'Hilfetelefon Gewalt gegen Frauen', number: '116 016' } },
  // 1800respect.org.au.
  au: { emergency: '000', line: { name: '1800RESPECT', number: '1800 737 732' } },
  // Healthcare Assistance Kenya, with the Ministry of Gender.
  ke: { emergency: '999', line: { name: 'National GBV Helpline', number: '1195' } },
  // dfwac.ae — for all residents of the UAE, not only Dubai.
  ae: { emergency: '999', line: { name: 'Dubai Foundation for Women and Children', number: '800 111' } },
  so: {},
  other: {},
}

/** When the country is not known — the answerer on a couple link has told us nothing. */
export const EMERGENCY_ANYWHERE = '911 in the US and Canada, 999 in the UK, 112 across Europe, 000 in Australia'

/** `tel:` wants digits only. */
export const dial = (number: string) => `tel:${number.replace(/[^\d+]/g, '')}`

export function helpFor(country?: string): Help {
  return (country && HELP[country]) || {}
}
