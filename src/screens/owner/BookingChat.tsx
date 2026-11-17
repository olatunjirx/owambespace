import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { MessageIcon } from './OwnerIcons'
import { chatWarning, findContactDetails } from '../../lib/contactGuard'
import type { ContactKind } from '../../lib/contactGuard'
import type { BookingMessage, ChatAccess } from '../../lib/owner'
import { softSpring } from '../../motion/variants'
import './booking-chat.css'

const SENT_AT = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

const STATE_NOTE: Record<Exclude<ChatAccess, 'open'>, string> = {
  readonly: 'This chat is read-only now that the event has passed.',
  closed: 'This chat closed when the booking was cancelled.',
}

type BookingChatProps = {
  viewer: BookingMessage['from']
  otherName: string
  messages: BookingMessage[]
  access: ChatAccess
  onSend: (text: string) => void
  quickReplies?: string[]
}

/**
 * The conversation on a paid booking, shared by the owner and the host.
 *
 * Text only, with no attachments, because a number inside a photo would get
 * past the filter. A blocked message stays in the box so the sender can edit it.
 */
export function BookingChat({ viewer, otherName, messages, access, onSend, quickReplies = [] }: BookingChatProps) {
  const [draft, setDraft] = useState('')
  const [blocked, setBlocked] = useState<ContactKind | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const firstName = otherName.split(' ')[0]

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  function send(text: string): void {
    const trimmed = text.trim()
    if (!trimmed) return
    const found = findContactDetails(trimmed)
    if (found) {
      setBlocked(found)
      return
    }
    onSend(trimmed)
    setDraft('')
    setBlocked(null)
  }

  return (
    <section className="chat">
      <h3 className="section-title chat__title">
        <MessageIcon size={14} /> Messages with {firstName}
      </h3>

      <div className="thread" ref={threadRef}>
        {messages.length === 0 && (
          <p className="thread__empty">No messages yet. Set-up, parking or access questions can go here.</p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              className={`thread__msg thread__msg--${message.from === viewer ? 'mine' : 'theirs'}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={softSpring}
            >
              <p>{message.text}</p>
              <span>{SENT_AT.format(new Date(message.atISO))}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {access === 'open' ? (
        <>
          {quickReplies.length > 0 && (
            <div className="quick-picks">
              {quickReplies.map((reply) => (
                <button key={reply} type="button" className="quick-pick" onClick={() => send(reply)}>
                  {reply}
                </button>
              ))}
            </div>
          )}
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault()
              send(draft)
            }}
          >
            <input
              className="filters__input"
              value={draft}
              placeholder={`Message ${firstName}`}
              aria-label="Message"
              aria-invalid={Boolean(blocked)}
              onChange={(event) => {
                setDraft(event.target.value)
                setBlocked(null)
              }}
            />
            <button type="submit" className="ghost-button" disabled={!draft.trim()}>
              Send
            </button>
          </form>
          {blocked ? (
            <p className="chat__blocked" role="alert">
              {chatWarning(blocked)}
            </p>
          ) : (
            <p className="chat__rule">Phone numbers, emails and links are blocked. Payments outside Owambe Space aren’t protected.</p>
          )}
        </>
      ) : (
        <p className="chat__rule chat__rule--state">{STATE_NOTE[access]}</p>
      )}
    </section>
  )
}
