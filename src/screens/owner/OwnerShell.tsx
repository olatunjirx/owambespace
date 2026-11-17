import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import { CollapseIcon } from '../../components/AppIcons'
import {
  BuildingIcon,
  CalendarIcon,
  GearIcon,
  HelpCircleIcon,
  HomeIcon,
  InboxIcon,
  LogoutLineIcon,
  MegaphoneIcon,
  WalletIcon,
} from './OwnerIcons'
import { riseIn, softSpring, stagger } from '../../motion/variants'
import { unreadCount } from '../../lib/owner'
import { useOwner } from '../../state/Owner'
import { useProfile } from '../../state/Profile'
import '../host/app-shell.css'
import '../host/host.css'
import '../host/events-list.css'
import './owner.css'

export type OwnerSection =
  | 'home'
  | 'bookings'
  | 'calendar'
  | 'listings'
  | 'earnings'
  | 'promote'
  | 'settings'
  | 'help'

const NAV: { id: OwnerSection; label: string; href: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', href: '#/owner', icon: <HomeIcon /> },
  { id: 'bookings', label: 'Bookings', href: '#/owner/bookings', icon: <InboxIcon /> },
  { id: 'calendar', label: 'Calendar', href: '#/owner/calendar', icon: <CalendarIcon /> },
  { id: 'listings', label: 'My venues', href: '#/owner/venues', icon: <BuildingIcon /> },
  { id: 'earnings', label: 'Earnings', href: '#/owner/earnings', icon: <WalletIcon /> },
  { id: 'promote', label: 'Promote', href: '#/owner/promote', icon: <MegaphoneIcon /> },
]

const SECTION_LABELS: Record<OwnerSection, string> = {
  home: 'Home',
  bookings: 'Bookings',
  calendar: 'Calendar',
  listings: 'My venues',
  earnings: 'Earnings',
  promote: 'Promote',
  settings: 'Settings',
  help: 'Help',
}

const COLLAPSE_KEY = 'owambe.owner.sidebar.collapsed'

type OwnerShellProps = {
  section: OwnerSection
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  /** Sits above the page heading — a back link, a status strip. */
  eyebrow?: ReactNode
  children: ReactNode
  pageKey: string
}

/**
 * The frame every owner page sits in. Same furniture as the host's AppShell —
 * sidebar, slim top bar, page — so someone who is both a host and an owner
 * is never relearning the layout, only the destinations.
 */
export function OwnerShell({
  section,
  title,
  subtitle,
  actions,
  eyebrow,
  children,
  pageKey,
}: OwnerShellProps) {
  const { profile } = useProfile()
  const { bookings, state } = useOwner()
  const accountName = profile.displayName.trim().split(' ')[0] ?? ''
  const unread = bookings.reduce((sum, booking) => sum + unreadCount(booking), 0)
  const businessName = state.business.businessName || state.venues[0]?.name || ''

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        // Storage being unavailable costs the memory, not the toggle.
      }
      return next
    })
  }, [])

  return (
    <div className={`app${collapsed ? ' app--collapsed' : ''}`}>
      <aside className="sidebar" aria-label="Main">
        <div className="sidebar__top">
          <div className="sidebar__brand-row">
            <a className="sidebar__brand" href="#/owner">
              <span className="sidebar__brand-mark" aria-hidden="true" />
              <span className="sidebar__brand-name">OwambeSpace</span>
              <span className="owner-badge">Venues</span>
            </a>

            <button
              type="button"
              className="sidebar__collapse"
              onClick={toggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <CollapseIcon size={20} />
            </button>
          </div>

          <div className="sidebar__rule" />

          <nav className="sidebar__nav">
            {NAV.map((item) => {
              const current = item.id === section
              const count = item.id === 'bookings' ? unread : 0
              return (
                <a
                  key={item.id}
                  className={`sidebar__item${current ? ' sidebar__item--current' : ''}`}
                  href={item.href}
                  aria-current={current ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  {current && (
                    <motion.span
                      layoutId="owner-sidebar-active"
                      className="sidebar__active"
                      transition={softSpring}
                    />
                  )}
                  <span className="sidebar__icon">{item.icon}</span>
                  <span className="sidebar__label">{item.label}</span>
                  {count > 0 && (
                    <span className="sidebar__count" aria-label={`${count} unread message${count === 1 ? '' : 's'}`}>
                      {count}
                    </span>
                  )}
                </a>
              )
            })}
          </nav>
        </div>

        <div className="sidebar__bottom">
          <div className="sidebar__rule" />
          <nav className="sidebar__nav">
            <a
              className={`sidebar__item${section === 'settings' ? ' sidebar__item--current' : ''}`}
              href="#/owner/settings"
              aria-current={section === 'settings' ? 'page' : undefined}
              title={collapsed ? 'Settings' : undefined}
            >
              <span className="sidebar__icon">
                <GearIcon />
              </span>
              <span className="sidebar__label">Settings</span>
            </a>
            <a
              className={`sidebar__item${section === 'help' ? ' sidebar__item--current' : ''}`}
              href="#/owner/help"
              aria-current={section === 'help' ? 'page' : undefined}
              title={collapsed ? 'Help' : undefined}
            >
              <span className="sidebar__icon">
                <HelpCircleIcon />
              </span>
              <span className="sidebar__label">Help</span>
            </a>
            <a
              className="sidebar__item sidebar__item--danger"
              href="#/signup"
              title={collapsed ? 'Logout' : undefined}
            >
              <span className="sidebar__icon">
                <LogoutLineIcon />
              </span>
              <span className="sidebar__label">Logout</span>
            </a>
          </nav>
        </div>
      </aside>

      <div className="app__body">
        <header className="topbar">
          <p className="topbar__where">{SECTION_LABELS[section]}</p>

          <a className="topbar__account" href="#/owner/settings">
            <span className="topbar__avatar" aria-hidden="true">
              {(accountName[0] ?? 'V').toUpperCase()}
            </span>
            <span className="topbar__account-name">
              {accountName || 'My account'}
              {businessName && <span className="topbar__business"> · {businessName}</span>}
            </span>
          </a>
        </header>

        <main className="app__main">
          <motion.div
            key={pageKey}
            className="app__content"
            variants={stagger(0.06, 0.04)}
            initial="hidden"
            animate="visible"
          >
            {eyebrow && <motion.div variants={riseIn}>{eyebrow}</motion.div>}

            <motion.header className="app__header" variants={riseIn}>
              <div>
                <h1 className="app__title">{title}</h1>
                {subtitle && <p className="app__subtitle">{subtitle}</p>}
              </div>
              {actions && <div className="app__header-actions">{actions}</div>}
            </motion.header>

            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

/** A small "← Back to …" link used above page headings. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="owner-back" href={href}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 3.6 5.6 8l4.4 4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </a>
  )
}
