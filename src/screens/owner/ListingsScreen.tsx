import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'

import { Combobox, commitOpenComboboxes } from '../../components/Combobox'
import { Modal } from '../../components/Modal'
import { PillGroup } from '../../components/PillGroup'
import { TextField } from '../../components/TextField'
import { ListingPreview } from './ListingPreview'
import { PlusIcon } from './OwnerIcons'
import { OwnerShell } from './OwnerShell'
import { calendarPath, href, setupPath, venuePath } from './ownerPaths'
import { listingProgress } from '../../lib/owner'
import { SPACE_TYPES } from '../../lib/signupFlow'
import { riseIn } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useOwner } from '../../state/Owner'

type ListingsScreenProps = {
  /** Driven by /owner/venues/new so the add dialog is linkable. */
  adding?: boolean
}

/** Every venue this owner runs — most have one, groups have several. */
export function ListingsScreen({ adding = false }: ListingsScreenProps) {
  const { state, bookings } = useOwner()

  return (
    <OwnerShell
      section="listings"
      pageKey="owner-listings"
      title="My venues"
      subtitle={
        state.venues.length > 1
          ? `${state.venues.length} venues under one account. Each has its own listing, calendar and bookings.`
          : 'Your listing, its status, and how it is doing.'
      }
      actions={
        <a className="button-primary" href="#/owner/venues/new">
          <PlusIcon size={14} />
          &nbsp;Add a venue
        </a>
      }
    >
      {state.venues.length === 0 ? (
        <motion.div className="empty" variants={riseIn}>
          <p className="empty__title">No venues yet</p>
          <p className="empty__body">Add your first venue — it takes about ten minutes.</p>
          <div className="empty__action">
            <a className="button-primary" href="#/owner/venues/new">
              Add a venue
            </a>
          </div>
        </motion.div>
      ) : (
        <motion.ul className="listing-grid" variants={riseIn}>
          {state.venues.map((venue) => {
            const progress = listingProgress(venue)
            const venueBookings = bookings.filter((booking) => booking.venueId === venue.id)
            const upcoming = venueBookings.filter((booking) => booking.status === 'confirmed').length
            const booked = venueBookings.filter(
              (booking) => booking.status === 'confirmed' || booking.status === 'completed',
            ).length
            return (
              <li key={venue.id} className="listing-card">
                <a href={href(venuePath(venue.id))} className="listing-card__link" aria-label={`Manage ${venue.name || 'venue'}`}>
                  <ListingPreview venue={venue} showStatus />
                </a>
                <div className="listing-card__foot">
                  {venue.status === 'draft' ? (
                    <>
                      <span className="listing-card__stat">
                        {progress.done} of {progress.total} sections done
                      </span>
                      <a className="ghost-button ghost-button--small" href={href(setupPath(venue.id, progress.nextStep))}>
                        Continue setup
                      </a>
                    </>
                  ) : (
                    <>
                      <span className="listing-card__stat">
                        {upcoming} upcoming · {booked} booked
                      </span>
                      <a className="ghost-button ghost-button--small" href={href(calendarPath(venue.id))}>
                        Calendar
                      </a>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </motion.ul>
      )}

      <AddVenueModal open={adding} onClose={() => navigate('/owner/venues', true)} />
    </OwnerShell>
  )
}

function AddVenueModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createVenue } = useOwner()
  const [name, setName] = useState('')
  const [spaceType, setSpaceType] = useState('')
  const [state, setState] = useState('')
  const [error, setError] = useState('')

  function submit(event?: FormEvent): void {
    event?.preventDefault()
    if (name.trim().length < 2) {
      setError('Give the venue a name.')
      return
    }
    const venue = createVenue({ name: name.trim(), spaceType, state })
    setName('')
    setSpaceType('')
    setState('')
    setError('')
    navigate(setupPath(venue.id, 'basics'))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a venue"
      subtitle="Start with the basics. You’ll fill in the rest in the listing steps."
      footer={
        <>
          <button type="button" className="button-neutral" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="add-venue"
            className="button-primary"
            onPointerDown={() => commitOpenComboboxes()}
          >
            Start listing
          </button>
        </>
      }
    >
      <form id="add-venue" className="modal-form" onSubmit={submit} noValidate>
        <TextField
          label="Venue name"
          name="newVenueName"
          placeholder="The Grand Pavilion"
          value={name}
          error={error}
          onChange={(value) => {
            setName(value)
            setError('')
          }}
        />
        <PillGroup
          label="What kind of space?"
          name="newVenueType"
          options={SPACE_TYPES}
          value={spaceType}
          onChange={setSpaceType}
        />
        <Combobox label="State" name="newVenueState" value={state} onChange={setState} />
      </form>
    </Modal>
  )
}
