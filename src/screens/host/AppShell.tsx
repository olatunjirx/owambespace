import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import {
  AccountIcon,
  CollapseIcon,
  EventsIcon,
  HelpIcon,
  LogoutIcon,
  VenuesIcon,
} from '../../components/AppIcons'
import { riseIn, softSpring, stagger } from '../../motion/variants'
import { useProfile } from '../../state/Profile'
import './app-shell.css'

export type TopSection = 'events' | 'explore' | 'account'

const SECTION_LABELS: Record<TopSection, string> = {
  events: 'My events',
  explore: 'Explore',
  account: 'My account',
}

const NAV: { id: TopSection; label: string; href: string; icon: ReactNode }[] = [
  { id: 'events', label: 'My events', href: '#/host', icon: <EventsIcon /> },
  { id: 'explore', label: 'Explore', href: '#/explore', icon: <VenuesIcon /> },
  { id: 'account', label: 'My account', href: '#/account', icon: <AccountIcon /> },
]

/** Remembered so the rail does not reopen on every navigation. */
const COLLAPSE_KEY = 'owambe.host.sidebar.collapsed'

type AppShellProps = {
  section: TopSection
  title: string
  subtitle?: ReactNode
  /** Buttons pinned to the right of the page heading. */
  actions?: ReactNode
  /** Sits between the top bar and the page heading — event tabs, breadcrumbs. */
  banner?: ReactNode
  children: ReactNode
  /** Remounts the body so each page animates in on its own. */
  pageKey: string
}

/**
 * The frame every logged-in page sits in: a left sidebar for the three
 * destinations, a slim top bar for search, and the page itself.
 */
export function AppShell({
  section,
  title,
  subtitle,
  actions,
  banner,
  children,
  pageKey,
}: AppShellProps) {
  const { profile } = useProfile()
  const accountName = profile.displayName.trim().split(' ')[0] ?? ''

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
            <a className="sidebar__brand" href="#/host">
              <span className="sidebar__brand-mark" aria-hidden="true" />
              <span className="sidebar__brand-name">OwambeSpace</span>
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
                      layoutId="sidebar-active"
                      className="sidebar__active"
                      transition={softSpring}
                    />
                  )}
                  <span className="sidebar__icon">{item.icon}</span>
                  <span className="sidebar__label">{item.label}</span>
                </a>
              )
            })}
          </nav>
        </div>

        <div className="sidebar__bottom">
          <div className="sidebar__rule" />
          <nav className="sidebar__nav">
            <a className="sidebar__item" href="#/help" title={collapsed ? 'Help' : undefined}>
              <span className="sidebar__icon">
                <HelpIcon />
              </span>
              <span className="sidebar__label">Help</span>
            </a>
            <a
              className="sidebar__item sidebar__item--danger"
              href="#/signup"
              title={collapsed ? 'Logout' : undefined}
            >
              <span className="sidebar__icon">
                <LogoutIcon />
              </span>
              <span className="sidebar__label">Logout</span>
            </a>
          </nav>
        </div>
      </aside>

      <div className="app__body">
        <header className="topbar">
          {/*
            Only things that hold true on every destination belong here — the
            section you are in, and who you are signed in as. A page-specific
            control in a bar shared by three sections is a control that lies on
            two of them.
          */}
          <p className="topbar__where">{SECTION_LABELS[section]}</p>

          <a className="topbar__account" href="#/account">
            <span className="topbar__avatar" aria-hidden="true">
              {(accountName[0] ?? 'H').toUpperCase()}
            </span>
            <span className="topbar__account-name">{accountName || 'My account'}</span>
          </a>
        </header>

        {banner}

        <main className="app__main">
          <motion.div
            key={pageKey}
            className="app__content"
            variants={stagger(0.06, 0.04)}
            initial="hidden"
            animate="visible"
          >
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

