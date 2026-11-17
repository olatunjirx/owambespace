import { motion } from 'framer-motion'

import { OwnerShell } from './OwnerShell'
import { PLATFORM_FEE_PERCENT } from '../../lib/owner'
import { riseIn } from '../../motion/variants'

const TOPICS: { title: string; questions: { q: string; a: string }[] }[] = [
  {
    title: 'Listing your venue',
    questions: [
      {
        q: 'How long does review take?',
        a: 'Usually within 24 hours. We check that photos are of the real venue, the capacity is believable and the price is filled in. You’ll be notified the moment it’s live.',
      },
      {
        q: 'Can I edit my listing after it is live?',
        a: 'Yes. Edits to a live listing show straight away — there is no second review for changes.',
      },
      {
        q: 'I have more than one hall. One listing or several?',
        a: 'If hosts book them separately, list them separately — each gets its own calendar. If they are always hired together, add them as spaces in one listing.',
      },
    ],
  },
  {
    title: 'Bookings',
    questions: [
      {
        q: 'Do I have to approve bookings?',
        a: 'No. Every venue is instant book, so a host can secure any open date by paying the deposit. Close any date you don’t want on your calendar and it can’t be booked.',
      },
      {
        q: 'When can a host message me?',
        a: 'Once they have paid. Chat opens on the booking, closes if it is cancelled and goes read-only 3 days after the event. Phone numbers, emails, links and social handles are blocked in chat.',
      },
      {
        q: 'When does a host get my phone number?',
        a: 'Your event-day number appears 7 days before the event, once the balance is paid. Your exact address and Event Day Guide are shared as soon as they book.',
      },
      {
        q: 'Can I block dates I have booked outside Owambe Space?',
        a: 'Yes — from Calendar, choose the date and close it. You can close a range at once for renovations or holidays.',
      },
    ],
  },
  {
    title: 'Money',
    questions: [
      {
        q: 'What does it cost?',
        a: `Listing is free. We take ${PLATFORM_FEE_PERCENT}% of each completed booking — nothing on cancelled bookings, unless you are the one who cancels.`,
      },
      {
        q: 'When do I get paid?',
        a: 'The host’s deposit is held in escrow from the moment the booking is confirmed. Everything is released to your balance 24 hours after the event, and you can withdraw to your bank any time.',
      },
      {
        q: 'Why do you need my ID?',
        a: 'Our payment partner has to know who money is being paid to. You verify once, and only the last four digits of your ID are kept.',
      },
    ],
  },
  {
    title: 'Cancellations',
    questions: [
      {
        q: 'What if a host cancels?',
        a: 'Your cancellation policy decides how much of the deposit you keep. It is shown to the host before they pay, so there is nothing to argue about.',
      },
      {
        q: 'What if I need to cancel?',
        a: `Open the booking and choose Cancel booking. The host is refunded in full, a penalty of ${PLATFORM_FEE_PERCENT}% of the booking comes out of your next payout, and the date stays closed. A second cancellation in 12 months lowers your ranking and a third suspends your listing.`,
      },
      {
        q: 'What about an emergency like a fire or flood?',
        a: 'Choose the emergency reason when cancelling and go through support. Once it is confirmed, the host is refunded and no penalty applies.',
      },
    ],
  },
]

export function OwnerHelpScreen() {
  return (
    <OwnerShell
      section="help"
      pageKey="owner-help"
      title="Help"
      subtitle="Answers to what venue owners ask most."
    >
      {TOPICS.map((topic) => (
        <motion.section key={topic.title} className="card help-topic" variants={riseIn}>
          <h2 className="card__title">{topic.title}</h2>
          <div className="help-topic__list">
            {topic.questions.map((entry) => (
              <details key={entry.q} className="help-q">
                <summary>{entry.q}</summary>
                <p>{entry.a}</p>
              </details>
            ))}
          </div>
        </motion.section>
      ))}
    </OwnerShell>
  )
}
