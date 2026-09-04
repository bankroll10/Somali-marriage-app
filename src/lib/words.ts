import type { Script } from '../data/read'
import { instrumentLink } from './links'

/**
 * The words, as they travel.
 *
 * Everything this product produces ends in words a person can say. When she
 * sends a friend the exact question that worked, the friend has the value
 * before opening anything — the message is the words, one line of why, and a
 * footnote saying where they came from and what the link opens. The product
 * is the footnote. There is no reward for sending, no count of sends, and the
 * link carries only what kind of thing was shared (see src/lib/entry.ts).
 */
export type WordsSource = 'read' | 'guide' | 'eleven' | 'couple' | 'family'

/** Where the recipient lands: the instrument the sender's words came from. */
export function wordsLink(source: WordsSource): string {
  switch (source) {
    case 'read':
    case 'guide':
      return instrumentLink('read', 'words')
    case 'eleven':
      return instrumentLink('eleven', 'eleven')
    case 'couple':
      return instrumentLink('eleven', 'couple')
    case 'family':
      return instrumentLink('families', 'family')
  }
}

/** The recipient's gender is unknown, so the footnote says "they". */
const FOOTNOTE: Record<WordsSource, string> = {
  read: 'If you’re talking to someone, it reads what they’ve actually done and gives you the one question to ask. No account.',
  guide: 'If you’re talking to someone, it reads what they’ve actually done and gives you the one question to ask. No account.',
  eleven: 'Eleven conversations to have before you say yes. It tells you which one to open, and gives you the words. No account.',
  couple: 'Eleven conversations to have before you say yes. It tells you which one to open, and gives you the words. No account.',
  family: 'The conversations with your family, word for word. No account.',
}

export function wordsMessage(script: Script, source: WordsSource): { text: string; url: string } {
  const why = script.why.trim()
  const lines = [`“${script.words.trim()}”`]
  if (why) lines.push('', why)
  lines.push('', `Words from Niyyah, built for us. ${FOOTNOTE[source]}`)
  return { text: lines.join('\n'), url: wordsLink(source) }
}
