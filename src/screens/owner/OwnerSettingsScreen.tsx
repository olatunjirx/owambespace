import { motion } from 'framer-motion'

import { SegmentedToggle } from '../../components/SegmentedToggle'
import { TextField } from '../../components/TextField'
import { Switch } from './OwnerFields'
import { OwnerShell } from './OwnerShell'
import type { OperatingMode } from '../../lib/signupFlow'
import { riseIn } from '../../motion/variants'
import { useOwner } from '../../state/Owner'
import { useProfile } from '../../state/Profile'

const MODE_OPTIONS: { id: OperatingMode; label: string }[] = [
  { id: 'solo', label: 'An individual' },
  { id: 'company', label: 'A registered company' },
]

/**
 * Who the owner is and how we reach them. Everything saves as it is typed —
 * a settings page with its own Save button is one more thing to forget.
 */
export function OwnerSettingsScreen() {
  const { profile, update } = useProfile()
  const { state, updateBusiness, setPref } = useOwner()
  const { business, prefs } = state

  return (
    <OwnerShell
      section="settings"
      pageKey="owner-settings"
      title="Settings"
      subtitle="Changes save automatically."
    >
      <motion.section className="card settings-card" variants={riseIn}>
        <div className="settings-card__head">
          <h2 className="card__title">You</h2>
          <p className="card__hint">How you appear to hosts in messages.</p>
        </div>
        <div className="settings-card__body">
          <TextField
            label="Your name"
            name="ownerName"
            autoComplete="name"
            value={profile.displayName}
            onChange={(displayName) => update({ displayName })}
          />
          <div className="setup__row">
            <TextField
              label="Phone"
              name="ownerPhone"
              type="tel"
              autoComplete="tel"
              placeholder="0803 000 0000"
              value={business.phone}
              hint="For urgent booking calls only."
              onChange={(phone) => updateBusiness({ phone })}
            />
            <TextField
              label="Email"
              name="ownerEmail"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={business.email}
              onChange={(email) => updateBusiness({ email })}
            />
          </div>
        </div>
      </motion.section>

      <motion.section className="card settings-card" variants={riseIn}>
        <div className="settings-card__head">
          <h2 className="card__title">Business</h2>
          <p className="card__hint">Shown on receipts hosts get after paying.</p>
        </div>
        <div className="settings-card__body">
          <SegmentedToggle
            label="You operate as"
            name="ownerMode"
            options={MODE_OPTIONS}
            value={business.mode}
            onChange={(mode) => updateBusiness({ mode })}
          />
          <TextField
            label={business.mode === 'company' ? 'Registered company name' : 'Trading name'}
            name="businessName"
            placeholder={state.venues[0]?.name || 'Grand Pavilion Events'}
            value={business.businessName}
            optional={business.mode === 'solo'}
            onChange={(businessName) => updateBusiness({ businessName })}
          />
          {business.mode === 'company' && (
            <TextField
              label="CAC RC number"
              name="rcNumber"
              placeholder="RC 1234567"
              value={business.rcNumber}
              onChange={(rcNumber) => updateBusiness({ rcNumber })}
            />
          )}
        </div>
      </motion.section>

      <motion.section className="card settings-card" variants={riseIn}>
        <div className="settings-card__head">
          <h2 className="card__title">Notifications</h2>
          <p className="card__hint">
            New bookings can land at any time, so we recommend at least one instant channel.
          </p>
        </div>
        <div className="settings-card__body settings-card__switches">
          <Switch
            label="New bookings by SMS"
            checked={prefs.requestSms}
            onChange={(on) => setPref('requestSms', on)}
            description="A text the moment a host books a date."
          />
          <Switch
            label="New bookings by email"
            checked={prefs.requestEmail}
            onChange={(on) => setPref('requestEmail', on)}
          />
          <Switch
            label="WhatsApp updates"
            checked={prefs.whatsapp}
            onChange={(on) => setPref('whatsapp', on)}
            description="New bookings, messages from hosts and payout confirmations."
          />
          <Switch
            label="Weekly summary"
            checked={prefs.weeklySummary}
            onChange={(on) => setPref('weeklySummary', on)}
            description="Monday morning: the week’s events, open weekend dates and earnings."
          />
        </div>
      </motion.section>

      <motion.section className="card settings-card" variants={riseIn}>
        <div className="settings-card__head">
          <h2 className="card__title">Account</h2>
        </div>
        <div className="settings-card__body settings-card__links">
          <a className="ghost-button" href="#/owner/earnings">
            Payout account &amp; identity
          </a>
          <a className="ghost-button ghost-button--danger" href="#/signup">
            Log out
          </a>
        </div>
      </motion.section>
    </OwnerShell>
  )
}
