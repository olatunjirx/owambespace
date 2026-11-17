import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { EventShell } from './EventShell'
import { FlyerArt } from './FlyerArt'
import { PrimaryButton } from '../../components/Buttons'
import type { EventRecord } from '../../lib/events'
import { downloadPdf, downloadPng, readPhoto, shareFlyer } from '../../lib/flyerExport'
import {
  ACCENT_SWATCHES,
  FLYER_SIZES,
  NAME_HINTS,
  PREMIUM_FLYER_PRICE,
  defaultFields,
  exportScale,
  findTemplate,
  isLocked,
  newDesign,
  templatesFor,
} from '../../lib/flyers'
import type { FlyerDesign, FlyerFields, FlyerSize, FlyerTemplate } from '../../lib/flyers'
import { formatNaira } from '../../lib/money'
import { riseIn, softSpring } from '../../motion/variants'
import { useEvents } from '../../state/Events'
import './flyer.css'
import './host.css'

type Tier = FlyerTemplate['tier']

const FIELDS: { key: Exclude<keyof FlyerFields, 'photo'>; label: string; hint?: string }[] = [
  { key: 'eyebrow', label: 'Opening line' },
  { key: 'title', label: 'Event title' },
  { key: 'names', label: 'Names' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'venue', label: 'Venue' },
  { key: 'dressCode', label: 'Colour of the day', hint: 'Emerald green & gold' },
  { key: 'rsvp', label: 'RSVP', hint: 'Tolu · 0803 000 0000' },
]

/**
 * One flyer per event. Saved as it is edited, like everything else on the
 * event, so there is no "save" step to forget.
 */
export function FlyerScreen({ event }: { event: EventRecord }) {
  const { updateEvent } = useEvents()
  const design = event.flyer
  const template = design ? findTemplate(design.templateId) : undefined
  const templates = templatesFor(event.type)

  const [tier, setTier] = useState<Tier>(template?.tier ?? 'free')
  const [size, setSize] = useState<FlyerSize>('post')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const art = useRef<SVGSVGElement>(null)

  const locked = template ? isLocked(template, design) : false
  const paid = Boolean(template && template.tier === 'premium' && !locked)
  // Larger sizes are part of what premium buys.
  const activeSize: FlyerSize = paid ? size : 'post'
  const fields = design?.fields ?? defaultFields(event)

  function save(patch: Partial<FlyerDesign>): void {
    if (!design) return
    updateEvent(event.id, { flyer: { ...design, ...patch } })
  }

  function setField(key: keyof FlyerFields, value: string | undefined): void {
    if (!design) return
    save({ fields: { ...design.fields, [key]: value } })
  }

  function pick(next: FlyerTemplate): void {
    if (design) save({ templateId: next.id })
    else updateEvent(event.id, { flyer: newDesign(event, next.id) })
    setError('')
  }

  function unlock(): void {
    if (!design || !template) return
    save({ unlocked: [...design.unlocked, template.id] })
  }

  async function run(label: string, action: (svg: SVGSVGElement) => Promise<void>): Promise<void> {
    if (!art.current) return
    setBusy(label)
    setError('')
    try {
      await action(art.current)
    } catch {
      setError('That did not work in this browser. Try again, or use another browser.')
    } finally {
      setBusy('')
    }
  }

  const shown = templates.filter((item) => item.tier === tier)

  return (
    <EventShell
      event={event}
      tab="flyer"
      title="Event flyer"
      subtitle="Pick a design, fill in the details, then download or share."
      actions={
        <a className="ghost-button" href={`#/host/e/${event.id}`}>
          Back to overview
        </a>
      }
    >
      <motion.div className="flyer" variants={riseIn}>
        <div className="flyer__steps">
          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">1. Pick a template</h2>
                <p className="card__hint">Designs for a {event.type.toLowerCase()}.</p>
              </div>
              <div className="flyer__tiers" role="tablist" aria-label="Template tier">
                {(['free', 'premium'] as Tier[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="tab"
                    aria-selected={tier === option}
                    className={`flyer__tier${tier === option ? ' flyer__tier--on' : ''}`}
                    onClick={() => setTier(option)}
                  >
                    {tier === option && (
                      <motion.span layoutId="flyer-tier" className="flyer__tier-pill" transition={softSpring} />
                    )}
                    <span className="flyer__tier-label">{option === 'free' ? 'Free' : 'Premium'}</span>
                  </button>
                ))}
              </div>
            </div>

            {shown.length === 0 ? (
              <p className="card__hint">No {tier} designs for this event type yet.</p>
            ) : (
              <ul className="flyer__grid">
                {shown.map((item) => {
                  const current = item.id === template?.id
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`flyer__pick${current ? ' flyer__pick--on' : ''}`}
                        aria-pressed={current}
                        onClick={() => pick(item)}
                      >
                        <FlyerArt
                          className="flyer__thumb"
                          template={item}
                          fields={fields}
                          size="post"
                          watermark="none"
                        />
                        <span className="flyer__pick-name">{item.name}</span>
                        <span className="flyer__pick-meta">
                          {item.tier === 'premium' ? (
                            design?.unlocked.includes(item.id) ? (
                              <span className="tag tag--good">Unlocked</span>
                            ) : (
                              <span className="tag tag--accent">
                                <CrownIcon /> {formatNaira(PREMIUM_FLYER_PRICE)}
                              </span>
                            )
                          ) : (
                            <span className="tag tag--muted">Free</span>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {design && template && (
            <>
              <section className="card">
                <div className="card__header">
                  <div>
                    <h2 className="card__title">2. Fill in the details</h2>
                    <p className="card__hint">Filled in from your event. Leave any line empty to drop it.</p>
                  </div>
                  <button
                    type="button"
                    className="ghost-button ghost-button--small"
                    onClick={() => save({ fields: { ...defaultFields(event), photo: design.fields.photo } })}
                  >
                    Refill from event
                  </button>
                </div>

                <div className="flyer__fields">
                  {FIELDS.map((field) => (
                    <label key={field.key} className="flyer__field">
                      <span className="filters__label">{field.label}</span>
                      <input
                        className="filters__input"
                        value={design.fields[field.key]}
                        placeholder={field.key === 'names' ? NAME_HINTS[event.type] : field.hint}
                        onChange={(changed) => setField(field.key, changed.target.value)}
                      />
                    </label>
                  ))}
                </div>

                <div className="flyer__photo">
                  <span className="filters__label">Photo (optional)</span>
                  <div className="flyer__photo-row">
                    {design.fields.photo && (
                      <img className="flyer__photo-thumb" src={design.fields.photo} alt="" />
                    )}
                    <label className="ghost-button ghost-button--small flyer__upload">
                      {design.fields.photo ? 'Change photo' : 'Add a photo'}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={async (changed) => {
                          const file = changed.target.files?.[0]
                          changed.target.value = ''
                          if (!file) return
                          try {
                            setField('photo', await readPhoto(file))
                          } catch {
                            setError('That photo could not be read. Try a JPEG or PNG.')
                          }
                        }}
                      />
                    </label>
                    {design.fields.photo && (
                      <button
                        type="button"
                        className="ghost-button ghost-button--small"
                        onClick={() => setField('photo', undefined)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="flyer__colours">
                  <span className="filters__label">Colour</span>
                  {paid ? (
                    <div className="flyer__swatches" role="radiogroup" aria-label="Accent colour">
                      {[template.accent, ...ACCENT_SWATCHES.filter((hex) => hex !== template.accent)].map(
                        (hex) => {
                          const on = (design.accent ?? template.accent) === hex
                          return (
                            <button
                              key={hex}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              aria-label={hex === template.accent ? 'Template colour' : hex}
                              className={`flyer__swatch${on ? ' flyer__swatch--on' : ''}`}
                              style={{ background: hex }}
                              onClick={() => save({ accent: hex === template.accent ? undefined : hex })}
                            />
                          )
                        },
                      )}
                    </div>
                  ) : (
                    <p className="card__hint">Custom colours come with premium designs.</p>
                  )}
                </div>
              </section>

              <section className="card">
                <div className="card__header">
                  <div>
                    <h2 className="card__title">3. Download or share</h2>
                    <p className="card__hint">
                      {paid
                        ? 'High resolution, no watermark.'
                        : template.tier === 'free'
                          ? 'Free designs export as a square post with a small Owambe Space mark.'
                          : 'Unlock this design to download it.'}
                    </p>
                  </div>
                </div>

                <div className="flyer__sizes" role="radiogroup" aria-label="Size">
                  {(Object.keys(FLYER_SIZES) as FlyerSize[]).map((option) => {
                    const allowed = paid || option === 'post'
                    const on = activeSize === option
                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={!allowed}
                        className={`flyer__size${on ? ' flyer__size--on' : ''}`}
                        onClick={() => setSize(option)}
                      >
                        <span className="flyer__size-label">
                          {FLYER_SIZES[option].label}
                          {!allowed && <CrownIcon />}
                        </span>
                        <span className="flyer__size-note">{FLYER_SIZES[option].note}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="flyer__actions">
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={locked || Boolean(busy)}
                    onClick={() =>
                      run('png', (svg) =>
                        downloadPng(svg, activeSize, exportScale(activeSize, paid), design.fields),
                      )
                    }
                  >
                    {busy === 'png' ? 'Preparing…' : 'Download PNG'}
                  </button>
                  {activeSize === 'print' && (
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={locked || Boolean(busy)}
                      onClick={() => run('pdf', (svg) => downloadPdf(svg, design.fields))}
                    >
                      {busy === 'pdf' ? 'Preparing…' : 'Download PDF'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={locked || Boolean(busy)}
                    onClick={() =>
                      run('share', (svg) =>
                        shareFlyer(svg, activeSize, exportScale(activeSize, paid), design.fields),
                      )
                    }
                  >
                    {busy === 'share' ? 'Preparing…' : 'Share'}
                  </button>
                </div>

                <label className="flyer__cover">
                  <input
                    type="checkbox"
                    checked={design.cover}
                    onChange={(changed) => save({ cover: changed.target.checked })}
                  />
                  Use as the event cover on the overview
                </label>

                <AnimatePresence initial={false}>
                  {error && (
                    <motion.p
                      className="form-error"
                      role="alert"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </section>
            </>
          )}
        </div>

        <aside className="flyer__preview">
          {design && template ? (
            <>
              <div className={`flyer__frame flyer__frame--${activeSize}`}>
                <FlyerArt
                  svgRef={art}
                  template={template}
                  fields={design.fields}
                  size={activeSize}
                  accent={paid ? design.accent : undefined}
                  watermark={locked ? 'locked' : template.tier === 'free' ? 'free' : 'none'}
                />
              </div>

              {locked && (
                <div className="card flyer__unlock">
                  <p className="flyer__unlock-title">
                    <CrownIcon /> {template.name} is a premium design
                  </p>
                  <ul className="flyer__perks">
                    <li>No watermark</li>
                    <li>Story and A5 print sizes</li>
                    <li>High-resolution export</li>
                    <li>Custom colours</li>
                  </ul>
                  <PrimaryButton type="button" onClick={unlock}>
                    Pay {formatNaira(PREMIUM_FLYER_PRICE)} to unlock
                  </PrimaryButton>
                  <p className="flyer__sim">
                    Simulated — no payment provider is connected in this build.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flyer__empty">
              <span className="flyer__empty-mark" aria-hidden="true">
                +
              </span>
              Pick a template to start your flyer.
            </div>
          )}
        </aside>
      </motion.div>
    </EventShell>
  )
}

export function CrownIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="crown">
      <path
        d="M2 12.5h12M2.5 11 1.6 4.8l3.6 2.6L8 3l2.8 4.4 3.6-2.6-.9 6.2z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}
