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
 * nowhere. Re-check once a year (docs/OPS.md) — Sweden's changed in
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
  /** Abuse in a relationship — the line under a report, a threat or force. */
  line?: Helpline
  /** Thoughts of suicide or self-harm — the line under a crisis (tests/guide-eval). */
  crisis?: Helpline & { hours?: string }
}

export const HELP: Record<string, Help> = {
  // thehotline.org — also text START to 88788.
  us: { emergency: '911', line: { name: 'National Domestic Violence Hotline', number: '1-800-799-7233' }, crisis: { name: '988 Suicide & Crisis Lifeline', number: '988' } },
  // awhl.org. Ontario only — Canada has no national line, and Toronto is the
  // city scenes.ts names.
  ca: { emergency: '911', line: { name: 'Assaulted Women’s Helpline (Ontario)', number: '1-866-863-0511' }, crisis: { name: '9-8-8 Suicide Crisis Helpline', number: '988' } },
  // nationaldahelpline.org.uk (Refuge).
  uk: { emergency: '999', line: { name: 'National Domestic Abuse Helpline', number: '0808 2000 247' }, crisis: { name: 'Samaritans', number: '116 123' } },
  // kvinnofridslinjen.se — 116 016 since April 2025.
  se: { emergency: '112', line: { name: 'Kvinnofridslinjen', number: '116 016' }, crisis: { name: 'Mind Självmordslinjen', number: '90101' } },
  // volinjen.no.
  no: { emergency: '112', line: { name: 'VO-linjen', number: '116 006' }, crisis: { name: 'Mental Helse Hjelpetelefonen', number: '116 123' } },
  // levudenvold.dk.
  dk: { emergency: '112', line: { name: 'Lev Uden Vold', number: '1888' }, crisis: { name: 'Livslinien', number: '70 201 201', hours: 'daily, 09:00–05:00' } },
  // veiligthuis.nl.
  nl: { emergency: '112', line: { name: 'Veilig Thuis', number: '0800 2000' }, crisis: { name: '113 Zelfmoordpreventie', number: '0800 0113' } },
  // nollalinja.fi (THL).
  fi: { emergency: '112', line: { name: 'Nollalinja', number: '080 005 005' }, crisis: { name: 'MIELI Kriisipuhelin', number: '09 2525 0111' } },
  // hilfetelefon.de.
  de: { emergency: '112', line: { name: 'Hilfetelefon Gewalt gegen Frauen', number: '116 016' }, crisis: { name: 'TelefonSeelsorge', number: '0800 111 0 111' } },
  // 1800respect.org.au.
  au: { emergency: '000', line: { name: '1800RESPECT', number: '1800 737 732' }, crisis: { name: 'Lifeline', number: '13 11 14' } },
  // Healthcare Assistance Kenya, with the Ministry of Gender.
  ke: { emergency: '999', line: { name: 'National GBV Helpline', number: '1195' }, crisis: { name: 'Befrienders Kenya', number: '+254 722 178 177', hours: 'weekdays, 9am–5pm' } },
  // dfwac.ae — for all residents of the UAE, not only Dubai.
  ae: { emergency: '999', line: { name: 'Dubai Foundation for Women and Children', number: '800 111' }, crisis: { name: '800HOPE Mental Support Line', number: '800 4673', hours: '8am–8pm' } },
  so: {},
  other: {},
}

// The crisis lines were checked the same way, on 2026-09-24, for the Guide's
// evaluation (docs/GUIDE-EVAL.md). Three are not open round the clock and say
// so: Denmark's, Kenya's and the UAE's. Outside those hours, and wherever there
// is no line, the emergency number is the line.

/** When the country is not known — the answerer on a couple link has told us nothing. */
export const EMERGENCY_ANYWHERE = '911 in the US and Canada, 999 in the UK, 112 across Europe, 000 in Australia'
export const CRISIS_ANYWHERE = '988 in the US and Canada, 116 123 in the UK'

/** `tel:` wants digits only. */
export const dial = (number: string) => `tel:${number.replace(/[^\d+]/g, '')}`

export function helpFor(country?: string): Help {
  return (country && HELP[country]) || {}
}
