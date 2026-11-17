import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { FlyerArt } from './FlyerArt'
import type { EventRecord } from '../../lib/events'
import { downloadPng, shareFlyer } from '../../lib/flyerExport'
import { exportScale, findTemplate, isLocked } from '../../lib/flyers'
import { riseIn } from '../../motion/variants'
import './flyer.css'

/**
 * The event's flyer at the top of its overview — or the prompt to make one.
 * Download and share work from here so a host can send it without opening
 * the editor.
 */
export function FlyerCover({ event }: { event: EventRecord }) {
  const art = useRef<SVGSVGElement>(null)
  const [busy, setBusy] = useState(false)
  const design = event.flyer
  const template = design ? findTemplate(design.templateId) : undefined
  const editPath = `#/host/e/${event.id}/flyer`

  if (!design || !template || !design.cover) {
    return (
      <motion.section className="card cover" variants={riseIn}>
        <a className="cover__blank" href={editPath} aria-label="Create a flyer">
          +
        </a>
        <div className="cover__body">
          <h2 className="card__title">
            {design ? 'Event flyer' : 'Create a flyer for this event'}
          </h2>
          <p className="card__hint">
            {design
              ? 'Saved, but not shown as the event cover.'
              : `Free templates for a ${event.type.toLowerCase()}, or premium designs with no watermark.`}
          </p>
          <div className="cover__actions">
            <a className="ghost-button ghost-button--small" href={editPath}>
              {design ? 'Open flyer' : 'Create flyer'}
            </a>
          </div>
        </div>
      </motion.section>
    )
  }

  const locked = isLocked(template, design)
  const paid = template.tier === 'premium' && !locked

  async function act(action: (svg: SVGSVGElement) => Promise<void>): Promise<void> {
    if (!art.current || busy) return
    setBusy(true)
    try {
      await action(art.current)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.section className="card cover" variants={riseIn}>
      <a className="cover__art" href={editPath} aria-label="Edit flyer">
        <FlyerArt
          svgRef={art}
          template={template}
          fields={design.fields}
          size="post"
          accent={paid ? design.accent : undefined}
          watermark={locked ? 'locked' : template.tier === 'free' ? 'free' : 'none'}
        />
      </a>
      <div className="cover__body">
        <h2 className="card__title">Event flyer</h2>
        <p className="card__hint">
          {template.name} · {template.tier === 'free' ? 'Free' : locked ? 'Premium, locked' : 'Premium'}
        </p>
        <div className="cover__actions">
          <a className="ghost-button ghost-button--small" href={editPath}>
            {locked ? 'Unlock' : 'Edit'}
          </a>
          {!locked && (
            <>
              <button
                type="button"
                className="ghost-button ghost-button--small"
                disabled={busy}
                onClick={() =>
                  act((svg) => downloadPng(svg, 'post', exportScale('post', paid), design.fields))
                }
              >
                Download
              </button>
              <button
                type="button"
                className="ghost-button ghost-button--small"
                disabled={busy}
                onClick={() =>
                  act((svg) => shareFlyer(svg, 'post', exportScale('post', paid), design.fields))
                }
              >
                Share
              </button>
            </>
          )}
        </div>
      </div>
    </motion.section>
  )
}
