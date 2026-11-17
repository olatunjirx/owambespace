import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { Drawer } from '../../components/Drawer'
import { BookingChat } from '../owner/BookingChat'
import { EventShell } from './EventShell'
import { activeHires, formatEventDate } from '../../lib/events'
import type { EventRecord, Hire } from '../../lib/events'
import { formatNaira } from '../../lib/money'
import { chatAccess } from '../../lib/owner'
import { hireChatId } from '../../lib/provider'
import { findCategory, findVendor } from '../../lib/vendors'
import { riseIn, softSpring } from '../../motion/variants'
import { useEvents } from '../../state/Events'
import { useProfile } from '../../state/Profile'
import { useProvider } from '../../state/Provider'
import './event-venues.css'
import './host.css'

/**
 * This event's service providers: who is booked and who is on the
 * shortlist. Booked comes first because those are decisions. Chat lives
 * behind a booking — it does not exist until the host has paid.
 */
export function EventVendorsScreen({ event }: { event: EventRecord }) {
  const { cancelHire, payHireBalance } = useEvents()
  const { profile } = useProfile()
  const [openId, setOpenId] = useState<string | null>(null)

  const hires = activeHires(event)
  const shortlist = profile.savedVendors
    .map((id) => findVendor(id))
    .filter((vendor): vendor is NonNullable<typeof vendor> => Boolean(vendor))
    .filter((vendor) => !hires.some((hire) => hire.vendorId === vendor.id))

  return (
    <EventShell
      event={event}
      tab="vendors"
      title="Vendors"
      subtitle={
        hires.length === 0 && shortlist.length === 0
          ? 'Caterers, decorators, photographers, DJs and more. Book a package and chat once it’s paid.'
          : `${hires.length} booked · ${shortlist.length} saved.`
      }
      actions={
        <a className="ghost-button" href="#/explore">
          Find vendors
        </a>
      }
    >
      {hires.length === 0 && shortlist.length === 0 ? (
        <motion.div className="empty" variants={riseIn}>
          <p className="empty__title">No vendors yet</p>
          <p className="empty__body">
            Browse by category, compare packages, and book the ones you want. Every price is fixed, so you know the
            total before you pay.
          </p>
          <div className="empty__action">
            <a className="ghost-button" href="#/explore">
              Explore vendors
            </a>
          </div>
        </motion.div>
      ) : (
        <>
          {hires.length > 0 && (
            <motion.section variants={riseIn}>
              <h2 className="section-title">Booked</h2>
              <ul className="booking-list">
                {hires.map((hire) => (
                  <HireRow
                    key={hire.id}
                    hire={hire}
                    onOpen={() => setOpenId(hire.id)}
                    onPay={() => payHireBalance(event.id, hire.id)}
                    onCancel={() => cancelHire(event.id, hire.id)}
                  />
                ))}
              </ul>
            </motion.section>
          )}

          {shortlist.length > 0 && (
            <motion.section variants={riseIn}>
              <h2 className="section-title">Saved for later</h2>
              <ul className="saved-list">
                {shortlist.map((vendor) => (
                  <motion.li className="saved" key={vendor.id} layout transition={softSpring}>
                    <a className="saved__link" href={`#/vendors/${vendor.id}`}>
                      <span
                        className="saved__thumb"
                        style={{
                          background: `linear-gradient(145deg, hsl(${vendor.hue} 72% 52%), hsl(${vendor.hue + 24} 68% 32%))`,
                        }}
                        aria-hidden="true"
                      >
                        {vendor.initials}
                      </span>
                      <span className="saved__body">
                        <span className="saved__name">{vendor.name}</span>
                        <span className="saved__meta">
                          {findCategory(vendor.category)?.label} · {vendor.area}, {vendor.state} · from{' '}
                          {formatNaira(vendor.priceFrom)} {vendor.priceUnit}
                        </span>
                      </span>
                    </a>
                    <span className="saved__actions">
                      <a className="ghost-button ghost-button--small" href={`#/vendors/${vendor.id}`}>
                        See packages
                      </a>
                    </span>
                  </motion.li>
                ))}
              </ul>
            </motion.section>
          )}
        </>
      )}

      <HireDrawer eventId={event.id} hire={hires.find((hire) => hire.id === openId)} onClose={() => setOpenId(null)} />
    </EventShell>
  )
}

function HireRow({ hire, onOpen, onPay, onCancel }: { hire: Hire; onOpen: () => void; onPay: () => void; onCancel: () => void }) {
  const balancePaid = Boolean(hire.balancePaidISO)
  return (
    <motion.li className="booking" layout transition={softSpring}>
      <div className="booking__head">
        <div>
          <a className="booking__name" href={`#/vendors/${hire.vendorId}`}>
            {hire.vendorName}
          </a>
          <p className="booking__where">
            {findCategory(hire.category)?.label} · {hire.packageName}
          </p>
        </div>
        <span className="tag tag--good">Booked</span>
      </div>
      <dl className="booking__facts">
        <div>
          <dt>Date</dt>
          <dd>{formatEventDate(hire.date)}</dd>
        </div>
        <div>
          <dt>Guests</dt>
          <dd>{hire.guests.toLocaleString('en-NG')}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatNaira(hire.total)}</dd>
        </div>
        <div>
          <dt>Deposit paid</dt>
          <dd>{formatNaira(hire.deposit)}</dd>
        </div>
      </dl>
      <div className="booking__footer">
        <p className="booking__balance">
          {balancePaid
            ? `Balance of ${formatNaira(hire.total - hire.deposit)} paid`
            : `Balance ${formatNaira(hire.total - hire.deposit)} due by ${formatEventDate(hire.balanceDueISO)}`}
        </p>
        <span className="booking__actions">
          <button type="button" className="ghost-button ghost-button--small" onClick={onOpen}>
            Details and chat
          </button>
          {!balancePaid && (
            <button type="button" className="ghost-button ghost-button--small" onClick={onPay}>
              Pay balance
            </button>
          )}
          <button type="button" className="ghost-button ghost-button--small ghost-button--danger" onClick={onCancel}>
            Cancel booking
          </button>
        </span>
      </div>
    </motion.li>
  )
}

/** A paid hire: what was booked, what the provider needs, and the chat. */
function HireDrawer({ eventId, hire: current, onClose }: { eventId: string; hire: Hire | undefined; onClose: () => void }) {
  const { listing, hostMessages, sendHostMessage } = useProvider()
  const lastShown = useRef(current)
  if (current) lastShown.current = current
  const hire = current ?? lastShown.current
  if (!hire) return null

  const vendor = findVendor(hire.vendorId)
  const pkg = vendor?.packages?.find((entry) => entry.id === hire.packageId)
  const chatId = hireChatId(eventId, hire.id)
  // Only the provider's own listing has a "needs" note in this build.
  const needs = listing.id === hire.vendorId ? listing.needs : ''

  return (
    <Drawer open={Boolean(current)} onClose={onClose} title={hire.vendorName} subtitle={`${hire.packageName} · ${formatEventDate(hire.date)}`}>
      <div className="hbooking">
        <section>
          <h3 className="section-title">What’s included</h3>
          {pkg && pkg.includes.length > 0 ? (
            <p className="hbooking__text">{pkg.includes.join(', ')}</p>
          ) : (
            <p className="hbooking__sub">The full package details are on {hire.vendorName}’s page.</p>
          )}
        </section>
        <section>
          <h3 className="section-title">What they need on the day</h3>
          {needs ? <p className="hbooking__text">{needs}</p> : <p className="hbooking__sub">Nothing listed yet. You can ask below.</p>}
        </section>
        <BookingChat
          key={chatId}
          viewer="host"
          otherName={hire.vendorName}
          messages={hostMessages(chatId)}
          access={chatAccess(hire.status === 'cancelled' ? 'cancelled' : 'confirmed', hire.date)}
          onSend={(text) => sendHostMessage(chatId, text)}
        />
      </div>
    </Drawer>
  )
}
