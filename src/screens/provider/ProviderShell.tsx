import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import { CollapseIcon } from '../../components/AppIcons'
import {
  CalendarIcon,
  GearIcon,
  HelpCircleIcon,
  HomeIcon,
  InboxIcon,
  LogoutLineIcon,
  SparkIcon,
  WalletIcon,
} from '../owner/OwnerIcons'
import { riseIn, softSpring, stagger } from '../../motion/variants'
import { unreadCount } from '../../lib/owner'
import { useProvider } from '../../state/Provider'
import { useProfile } from '../../state/Profile'
import '../host/app-shell.css'
import '../host/host.css'
import '../host/events-list.css'
import '../owner/owner.css'
import './provider.css'

export type ProviderNav = 'home' | 'bookings' | 'calendar' | 'services' | 'earnings' | 'settings' | 'help'

const NAV: { id: ProviderNav; label: string; href: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', href: '#/provider', icon: <HomeIcon /> },
  { id: 'bookings', label: 'Bookings', href: '#/provider/bookings', icon: <InboxIcon /> },
  { id: 'calendar', label: 'Calendar', href: '#/provider/calendar', icon: <CalendarIcon /> },
  { id: 'services', label: 'My services', href: '#/provider/services', icon: <SparkIcon /> },
  { id: 'earnings', label: 'Earnings', href: '#/provider/earnings', icon: <WalletIcon /> },
]

const SECTION_LABELS: Record<ProviderNav, string> = {
  home: 'Home',
  bookings: 'Bookings',
  calendar: 'Calendar',
  services: 'My services',
  earnings: 'Earnings',
  settings: 'Settings',
  help: 'Help',
}

const COLLAPSE_KEY = 'owambe.provider.sidebar.collapsed'

type ProviderShellProps = {
  section: ProviderNav
  /** Omit for pages that bring their own heading, like the setup steps. */
  title?: string
  subtitle?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
  children: ReactNode
  pageKey: string
  /** Replaces the section name in the top bar with a trail (Figma Breadcrumbs). */
  crumbs?: { label: string; href?: string }[]
  /** Full-width content, for three-column pages like setup. */
  wide?: boolean
}

/**
 * The frame every provider page sits in — the same sidebar, top bar and page
 * as the host and venue-owner shells, so moving between the three sides of
 * Owambe Space only changes the destinations, never the layout.
 */
export function ProviderShell({ section, title, subtitle, actions, eyebrow, children, pageKey, crumbs, wide = false }: ProviderShellProps) {
  const { profile } = useProfile()
  const { bookings, listing } = useProvider()
  const accountName = profile.displayName.trim().split(' ')[0] ?? ''
  const unread = bookings.reduce((sum, booking) => sum + unreadCount(booking), 0)

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
    <div className={`app provider-app${collapsed ? ' app--collapsed' : ''}`}>
      <aside className="sidebar" aria-label="Main">
        <div className="sidebar__top">
          <div className="sidebar__brand-row">
            <a className="sidebar__brand" href="#/provider">
              <span className="sidebar__brand-mark" aria-hidden="true" />
              <span className="sidebar__brand-name">OwambeSpace</span>
              <span className="owner-badge">Vendor</span>
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
                    <motion.span layoutId="provider-sidebar-active" className="sidebar__active" transition={softSpring} />
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
              href="#/provider/settings"
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
              href="#/provider/help"
              aria-current={section === 'help' ? 'page' : undefined}
              title={collapsed ? 'Help' : undefined}
            >
              <span className="sidebar__icon">
                <HelpCircleIcon />
              </span>
              <span className="sidebar__label">Help</span>
            </a>
            <a className="sidebar__item sidebar__item--danger" href="#/signup" title={collapsed ? 'Logout' : undefined}>
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
          {crumbs ? (
            <nav className="pcrumbs" aria-label="Breadcrumb">
              {crumbs.map((crumb, index) => (
                <span key={crumb.label} className="pcrumbs__item">
                  {index > 0 && (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <path d="m7.5 5 4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {crumb.href && index < crumbs.length - 1 ? (
                    <a href={crumb.href}>{crumb.label}</a>
                  ) : (
                    <span aria-current={index === crumbs.length - 1 ? 'page' : undefined}>{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          ) : (
            <p className="topbar__where">{SECTION_LABELS[section]}</p>
          )}
          <a className="topbar__account" href="#/provider/settings">
            <span className="topbar__avatar" aria-hidden="true">
              {(accountName[0] ?? 'S').toUpperCase()}
            </span>
            <span className="topbar__account-name">
              {accountName || 'My account'}
              {listing.name && <span className="topbar__business"> · {listing.name}</span>}
            </span>
          </a>
        </header>

        <main className="app__main">
          <motion.div
            key={pageKey}
            className={`app__content${wide ? ' app__content--wide' : ''}`}
            variants={stagger(0.06, 0.04)}
            initial="hidden"
            animate="visible"
          >
            {eyebrow && <motion.div variants={riseIn}>{eyebrow}</motion.div>}
            {title && (
              <motion.header className="app__header" variants={riseIn}>
                <div>
                  <h1 className="app__title">{title}</h1>
                  {subtitle && <p className="app__subtitle">{subtitle}</p>}
                </div>
                {actions && <div className="app__header-actions">{actions}</div>}
              </motion.header>
            )}
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

/** The provider's avatar tile: initials on their hue, like venue thumbs. */
export function ProviderThumb({ name, hue, size = 44 }: { name: string; hue: number; size?: number }) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const initials = words.length === 0 ? 'S' : (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase()
  return (
    <span
      className="venue-thumb"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, hsl(${hue} 72% 52%), hsl(${hue + 24} 68% 32%))`,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
