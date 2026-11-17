# Owambe Space

Owambe Space is a booking platform for Nigerian events. Hosts plan an event and book a venue and service vendors (caterers, decorators, photographers, DJs, security and more). Venue owners and vendors list what they offer and get paid through the platform.

This repo holds the web front end. It's built with React 19, TypeScript and Vite, styled with plain CSS, and animated with Framer Motion. **No backend is connected yet.** Data is kept in the browser (see [What's simulated](#whats-simulated)).

## Getting started

```bash
npm install
npm run dev
```

The app opens at `http://localhost:5173`. Sign in with one of the demo accounts in [DEMO_LOGINS.md](DEMO_LOGINS.md). There's one for each user type.

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server |
| `npm run build` | Typechecks, then builds a production bundle into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run typecheck` | Typechecks only |

## Design source

The Owambe Space Figma file is the design source. Colours, type, spacing, radii and shadows come from its variables and live as CSS custom properties in `src/styles/tokens.css`. Use those tokens rather than hard-coded values. Some components refer to the Figma frame they were built from in a comment.

## User types

| User | Signs up as | Lands on | Screens |
|---|---|---|---|
| Event host | "I'm planning an event" | `#/host` | `src/screens/host` |
| Venue owner | "I own a venue" | `#/owner` | `src/screens/owner` |
| Vendor / planner | "I offer a service" | `#/provider` | `src/screens/provider` |

Shared areas:
- Sign-up and sign-in: `src/screens/signup`, `src/screens/account`
- Public directory (venues, vendors, detail pages, checkout): `src/screens/discover`, `src/screens/venues`

### Event host
- Creates events.
- Plans each event in tabs: overview, budget, guests, checklist, run sheet, flyer, venue and vendors.
- Books a venue or a vendor package and pays a deposit, then pays the balance later.
- Chats with whoever they booked.

### Venue owner
- Lists venues in a step-by-step setup and submits them for review.
- Manages bookings and the availability calendar.
- Sees earnings, adds a payout account, verifies their ID and withdraws.

### Vendor / planner ("I offer a service")
- Sets up a profile and **fixed-price packages** (per event or per guest), plus deposit, cancellation policy and how many jobs they can take a day.
- Submits the profile for review. Once live, it appears in the vendor directory.
- Has the same tools as venue owners: Home, Bookings with chat, Calendar, My services, Earnings and Settings.

## Rules the product relies on

These are product decisions, not styling. Please keep them.

1. **Booking is instant.** There are no quotes or enquiries. Venues and vendor packages have fixed prices, and the host books and pays straight away.
2. **Chat opens only after payment.** A host can't message a venue owner or vendor until they've paid for the booking. Before payment there's no chat entry point at all.
3. **Contact details are blocked in chat.** Phone numbers, emails, links, social handles and "pay me directly" wording are caught by `src/lib/contactGuard.ts` and the message isn't sent. Everything stays on the platform.
4. **Money is held until the job is done.** The deposit is paid at booking and the balance before the event. The payout is released to the owner or vendor after the event. Cancellation penalties follow the policy the venue or vendor picked.

## Code map

```
src/
  App.tsx            top-level routing and providers
  router/            small hash router (routes look like #/host/e/<id>/guests)
  state/             React context stores, saved to localStorage
    Events.tsx       host events, venue bookings, vendor hires
    Owner.tsx        venue owner listings, bookings, earnings
    Provider.tsx     vendor profile, packages, bookings, earnings
    Profile.tsx, SignupDraft.tsx
  lib/               plain TypeScript logic (no React), the easiest place to start
    events.ts        event, booking and hire types and helpers
    owner.ts         listings, escrow, payouts, cancellation policies
    provider.ts      vendor listing, packages, readiness checks
    vendors.ts       vendor directory, package pricing
    contactGuard.ts  chat contact-detail blocking
  services/          the seam where a real API goes (auth is here today)
  components/        shared UI: buttons, fields, modal, drawer, pills, etc.
  screens/           one folder per area (see the table above)
  styles/tokens.css  design tokens from Figma
```

Every route is a hash route (`#/...`), so the app works on any static host without server rewrites.

## What's simulated

None of the following talks to a server yet. Each piece is written so it can be swapped for an API call:

- **Accounts and sign-in:** demo accounts in `src/services/demoAccounts.ts`. The one-time code is fixed. Remove the demo accounts when real auth is built.
- **Payments:** deposits, balances and refunds go through instantly with no payment provider.
- **Listing review:** venue and vendor listings are "approved" automatically after a few seconds.
- **ID verification and payouts:** both succeed automatically after a short delay.
- **Sample data:** new venue owner and vendor accounts start with sample bookings so the dashboards aren't empty. They can be cleared from the dashboard.
- **Storage:** all state is saved in `localStorage` (`owambe.*` keys). Clearing site data resets the app.

## Known gaps

- Screens are designed desktop-first. Many have small-screen rules, but not every screen has been checked on a phone.
- The production bundle is one large file (Vite warns about it). Splitting routes with `import()` would help.
- There are no automated tests yet.
