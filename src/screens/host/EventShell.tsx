import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import { AppShell } from './AppShell'
import { countdownLabel, formatEventDate } from '../../lib/events'
import type { EventRecord } from '../../lib/events'
import { softSpring } from '../../motion/variants'

export type EventTab =
  | 'overview'
  | 'checklist'
  | 'venues'
  | 'vendors'
  | 'guests'
  | 'budget'
  | 'runsheet'
  // Reached from the overview's cover, not the tab row.
  | 'flyer'

const TABS: { id: EventTab; label: string; suffix: string }[] = [
  { id: 'overview', label: 'Overview', suffix: '' },
  { id: 'checklist', label: 'Checklist', suffix: '/checklist' },
  { id: 'venues', label: 'Venues', suffix: '/venues' },
  { id: 'vendors', label: 'Vendors', suffix: '/vendors' },
  { id: 'guests', label: 'Guests', suffix: '/guests' },
  { id: 'budget', label: 'Budget', suffix: '/budget' },
  // Last because it is the only tab about the day itself; everything before
  // it is about getting there.
  { id: 'runsheet', label: 'Run sheet', suffix: '/runsheet' },
]

export function eventPath(eventId: string, tab: EventTab = 'overview'): string {
  const entry = TABS.find((item) => item.id === tab)
  return `#/host/e/${eventId}${entry ? entry.suffix : ''}`
}

type EventShellProps = {
  event: EventRecord
  tab: EventTab
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

/**
 * The workspace for one event: the app frame plus a banner naming which event
 * you are in and a tab row for its sections.
 *
 * The banner is not decoration — with several events running at once, "which
 * one am I editing" is the question a host asks most, so the answer sits above
 * every screen.
 */
export function EventShell({
  event,
  tab,
  title,
  subtitle,
  actions,
  children,
}: EventShellProps) {
  const currentTab = useRef<HTMLAnchorElement>(null)

  // The tab row scrolls sideways on a narrow screen, and the tab you are on
  // can start off past the right edge — landing on a page whose own tab is
  // invisible reads as the tab row being broken.
  useEffect(() => {
    currentTab.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [tab])

  return (
    <AppShell
      section="events"
      pageKey={`${event.id}-${tab}`}
      title={title}
      subtitle={subtitle}
      actions={actions}
      banner={
        <div className="event-bar">
          <div className="event-bar__inner">
            <div className="event-bar__identity">
              <a className="event-bar__back" href="#/host">
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path
                    d="M10 3 5 8l5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                All events
              </a>

              <div className="event-bar__meta">
                <span className="event-bar__name">{event.name}</span>
                <span className="event-bar__date">
                  {formatEventDate(event.date)} · {countdownLabel(event.date)}
                </span>
              </div>
            </div>

            <nav className="event-tabs" aria-label="Event sections">
              {TABS.map((item) => {
                const current = item.id === tab
                return (
                  <a
                    key={item.id}
                    ref={current ? currentTab : undefined}
                    className={`event-tabs__tab${current ? ' event-tabs__tab--current' : ''}`}
                    href={`#/host/e/${event.id}${item.suffix}`}
                    aria-current={current ? 'page' : undefined}
                  >
                    {current && (
                      <motion.span
                        layoutId="event-tab-underline"
                        className="event-tabs__underline"
                        transition={softSpring}
                      />
                    )}
                    {item.label}
                  </a>
                )
              })}
            </nav>
          </div>
        </div>
      }
    >
      {children}
    </AppShell>
  )
}
