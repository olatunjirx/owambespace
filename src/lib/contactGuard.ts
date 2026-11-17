/**
 * Spots contact details and off-platform payment talk in free text.
 *
 * Used by booking chat and by listing checks. This is the client-side half
 * only: anyone can get round a browser check, so a real backend has to run the
 * same rules on the server before a message is stored or delivered. It will
 * also miss determined workarounds, which is why the owner cancellation
 * penalty exists alongside it.
 */
export type ContactKind = 'phone' | 'email' | 'link' | 'social' | 'payment'

const NUMBER_WORDS: Record<string, string> = {
  zero: '0',
  oh: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
}

const PAYMENT =
  /\b(?:pay(?:ing|ment)?\s+(?:me\s+|us\s+|you\s+|him\s+|her\s+|them\s+)?(?:direct(?:ly)?|outside|offline|cash|in\s+cash|by\s+transfer)|bank\s+transfer|account\s+number|acct\s*(?:no|number)|off[-\s]?(?:the[-\s]?)?(?:platform|app)|outside\s+(?:of\s+)?(?:the\s+)?(?:platform|app|owambe)|cancel\s+(?:and|then)\s+(?:book|pay))\b/i
const EMAIL = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i
const SPELLED_EMAIL = /[\w.+-]+\s*(?:\(at\)|\[at\]|\bat\b)\s*[\w-]+\s*(?:\(dot\)|\[dot\]|\bdot\b)\s*[a-z]{2,}/i
const MAIL_PROVIDER = /\b(?:gmail|yahoo|outlook|hotmail|icloud)\b/i
const LINK = /\bhttps?:\/\/|\bwww\.|\bwa\.me\b|\b[a-z0-9-]+\.(?:com|ng|net|org|co|io|me|app|link|info)\b/i
const HANDLE = /(?:^|\s)@[a-z0-9_.]{2,}/i
const SOCIAL_APP = /\b(?:whats\s?app|watsapp|whatsap|telegram|instagram|insta|facebook|snapchat|tiktok)\b/i
// Eleven digits is a Nigerian mobile. Ten catches a dropped leading zero
// without tripping over dates, prices or head counts.
const PHONE = /(?:\+?\d[\s().-]*){10,}/

function digitsFromWords(text: string): string {
  return text.replace(/\b(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/gi, (word) => {
    return NUMBER_WORDS[word.toLowerCase()]
  })
}

/** The first kind of contact detail in the text, or null when it is clean. */
export function findContactDetails(text: string): ContactKind | null {
  if (PAYMENT.test(text)) return 'payment'
  if (EMAIL.test(text) || SPELLED_EMAIL.test(text) || MAIL_PROVIDER.test(text)) return 'email'
  if (LINK.test(text)) return 'link'
  if (HANDLE.test(text) || SOCIAL_APP.test(text)) return 'social'
  if (PHONE.test(digitsFromWords(text))) return 'phone'
  return null
}

export const CONTACT_NOUNS: Record<ContactKind, string> = {
  phone: 'phone number',
  email: 'email address',
  link: 'link',
  social: 'social media mention',
  payment: 'off-platform payment wording',
}

const CHAT_WARNINGS: Record<ContactKind, string> = {
  phone: 'Phone numbers can’t be sent in chat.',
  email: 'Email addresses can’t be sent in chat.',
  link: 'Links can’t be sent in chat.',
  social: 'Social media details can’t be sent in chat.',
  payment: 'Payments have to stay on Owambe Space.',
}

export function chatWarning(kind: ContactKind): string {
  return `${CHAT_WARNINGS[kind]} Keeping everything here is what protects the booking and the money.`
}
