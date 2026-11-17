import { useState } from 'react'
import { motion } from 'framer-motion'

import { BUDGET_CATEGORIES } from '../../lib/events'
import type { BudgetCategory, EventRecord } from '../../lib/events'
import { formatNaira, formatNairaShort } from '../../lib/money'
import { riseIn, softSpring } from '../../motion/variants'
import './budget-breakdown.css'

type Group = {
  id: string
  label: string
  members: BudgetCategory[]
  /** Fixed slot per group, so a colour always means the same category. */
  slot: number
}

// A donut stops reading past six slices, so the three smallest-by-habit
// categories share one. The legend still names each of them.
export const GROUPS: Group[] = [
  { id: 'venue', label: 'Venue', members: ['Venue'], slot: 1 },
  { id: 'catering', label: 'Catering', members: ['Catering'], slot: 2 },
  { id: 'decor', label: 'Decor', members: ['Decor'], slot: 3 },
  { id: 'photo', label: 'Photo & video', members: ['Photo & video'], slot: 4 },
  { id: 'music', label: 'Music', members: ['Music'], slot: 5 },
  { id: 'rest', label: 'Attire, transport & other', members: ['Attire', 'Transport', 'Other'], slot: 6 },
]

export function groupOf(category: BudgetCategory): Group {
  return GROUPS.find((group) => group.members.includes(category)) as Group
}

export function seriesColor(category: BudgetCategory): string {
  return `var(--series-${groupOf(category).slot})`
}

/** Where the budget goes, by category: the ring is the whole budget. */
export function BudgetChart({ event }: { event: EventRecord }) {
  const [active, setActive] = useState<string | null>(null)

  const byCategory = BUDGET_CATEGORIES.map((category) => ({
    category,
    amount: event.expenses
      .filter((expense) => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0),
    count: event.expenses.filter((expense) => expense.category === category).length,
  })).filter((row) => row.amount > 0)

  const spent = byCategory.reduce((sum, row) => sum + row.amount, 0)
  const left = event.budget - spent

  return (
    <motion.section className="card breakdown" variants={riseIn} aria-label="Where the budget goes">
      <div className="breakdown__body" onMouseLeave={() => setActive(null)}>
        <Donut budget={event.budget} rows={byCategory} left={left} active={active} onActive={setActive} />

        <div className="breakdown__side">
          <h2 className="card__title">Where the money goes</h2>
          <p className="card__hint">
            {formatNaira(spent)} of {formatNaira(event.budget)} planned
            {left > 0 ? ` · ${formatNairaShort(left)} not yet planned` : ''}
          </p>

          <ul className="legend">
            {byCategory.map((row) => {
              const group = groupOf(row.category)
              const dimmed = active !== null && active !== group.id
              return (
                <li
                  key={row.category}
                  className={`legend__row${dimmed ? ' legend__row--dim' : ''}`}
                  onMouseEnter={() => setActive(group.id)}
                >
                  <span className="breakdown__dot" style={{ background: seriesColor(row.category) }} aria-hidden="true" />
                  <span className="legend__name">
                    {row.category}
                    <span className="legend__count">
                      {row.count} {row.count === 1 ? 'item' : 'items'}
                    </span>
                  </span>
                  <span className="legend__amount">{formatNairaShort(row.amount)}</span>
                  <span className="legend__share">
                    {Math.round((row.amount / Math.max(event.budget, 1)) * 100)}%
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </motion.section>
  )
}

/* ── The ring ─────────────────────────────────────────────── */

const SIZE = 208
const CENTRE = SIZE / 2
const RADIUS = 84
const THICKNESS = 24
// 2px of surface between neighbouring slices, measured along the centre line.
const GAP = 2 / RADIUS

function arcPath(from: number, to: number): string {
  const point = (angle: number) =>
    `${(CENTRE + RADIUS * Math.sin(angle)).toFixed(2)} ${(CENTRE - RADIUS * Math.cos(angle)).toFixed(2)}`
  const large = to - from > Math.PI ? 1 : 0
  return `M ${point(from)} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${point(to)}`
}

type DonutProps = {
  budget: number
  rows: { category: BudgetCategory; amount: number }[]
  left: number
  active: string | null
  onActive: (id: string | null) => void
}

function Donut({ budget, rows, left, active, onActive }: DonutProps) {
  const slices = GROUPS.map((group) => ({
    group,
    amount: rows
      .filter((row) => group.members.includes(row.category))
      .reduce((sum, row) => sum + row.amount, 0),
  })).filter((slice) => slice.amount > 0)

  const spent = slices.reduce((sum, slice) => sum + slice.amount, 0)
  // The full ring is the budget, so what is not yet planned shows as bare
  // track. Once spending passes the budget the ring stretches to fit it.
  const whole = Math.max(budget, spent, 1)

  let cursor = 0
  const arcs = slices.map((slice) => {
    const span = (slice.amount / whole) * Math.PI * 2
    const from = cursor + GAP / 2
    const to = cursor + span - GAP / 2
    cursor += span
    return { ...slice, d: to > from ? arcPath(from, Math.min(to, Math.PI * 2 - 0.0001)) : '' }
  })

  const focus = arcs.find((arc) => arc.group.id === active)
  const summary = slices.map((slice) => `${slice.group.label} ${formatNairaShort(slice.amount)}`).join(', ')

  return (
    <div className="donut">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label={`Budget of ${formatNaira(budget)}: ${summary || 'nothing planned yet'}.`}
      >
        <circle cx={CENTRE} cy={CENTRE} r={RADIUS} fill="none" stroke="var(--donut-track)" strokeWidth={THICKNESS} />
        {arcs.map((arc, index) =>
          arc.d ? (
            <g key={arc.group.id}>
              <motion.path
                d={arc.d}
                fill="none"
                stroke={`var(--series-${arc.group.slot})`}
                strokeLinecap="butt"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: 1,
                  strokeWidth: active === arc.group.id ? THICKNESS + 6 : THICKNESS,
                  opacity: active && active !== arc.group.id ? 0.3 : 1,
                }}
                transition={{
                  pathLength: { duration: 0.6, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] },
                  default: softSpring,
                }}
              />
              {/* Wider than the slice so a thin one is still easy to land on. */}
              <path
                d={arc.d}
                fill="none"
                stroke="transparent"
                strokeWidth={THICKNESS + 16}
                onMouseEnter={() => onActive(arc.group.id)}
              />
            </g>
          ) : null,
        )}
      </svg>

      <div className="donut__centre" aria-hidden="true">
        {focus ? (
          <>
            <span className="donut__label">{focus.group.label}</span>
            <span className="donut__figure">{formatNairaShort(focus.amount)}</span>
            <span className="donut__sub">
              {Math.round((focus.amount / Math.max(budget, 1)) * 100)}% of budget
            </span>
          </>
        ) : left < 0 ? (
          <>
            <span className="donut__figure donut__figure--over">{formatNairaShort(-left)}</span>
            <span className="donut__sub">over a {formatNairaShort(budget)} budget</span>
          </>
        ) : (
          <>
            <span className="donut__figure">{formatNairaShort(left)}</span>
            <span className="donut__sub">left of {formatNairaShort(budget)}</span>
          </>
        )}
      </div>
    </div>
  )
}
