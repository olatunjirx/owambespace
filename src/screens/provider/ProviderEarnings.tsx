import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { Modal } from '../../components/Modal'
import { CheckIcon, ShieldIcon, WalletIcon } from '../owner/OwnerIcons'
import { ProviderShell } from './ProviderShell'
import { bookingPath, href } from './providerPaths'
import { formatShortDate } from '../../lib/events'
import { formatNaira, formatNairaShort } from '../../lib/money'
import { ID_TYPES, NIGERIAN_BANKS, PLATFORM_FEE_PERCENT, earningsSummary, maskAccount, payoutFor } from '../../lib/owner'
import { riseIn } from '../../motion/variants'
import { navigate } from '../../router/hashRouter'
import { useProvider } from '../../state/Provider'

export type ProviderDialog = 'payout' | 'verify' | 'withdraw'

const PAYOUT_DATE = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Money in, money out — the owner's earnings page for a provider. Escrow is
 * what's coming, available is what can be taken now, paid out is what's
 * been had. Withdrawing needs a bank account and a verified ID.
 */
export function ProviderEarnings({ dialog }: { dialog?: ProviderDialog }) {
  const { state, bookings, requestPayout } = useProvider()
  const money = earningsSummary(bookings, state.payouts)
  const verified = state.verification.status === 'verified'
  const canWithdraw = Boolean(state.payoutAccount) && verified && money.available > 0
  const ledger = bookings
    .filter((booking) => booking.status === 'confirmed' || booking.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date))
  const close = () => navigate('/provider/earnings', true)

  return (
    <ProviderShell
      section="earnings"
      pageKey="provider-earnings"
      title="Earnings"
      subtitle={`Hosts pay into escrow. We release your money 24 hours after each event, minus our ${PLATFORM_FEE_PERCENT}% fee.`}
      actions={
        <button
          type="button"
          className="button-primary"
          disabled={!canWithdraw}
          title={
            canWithdraw
              ? undefined
              : !state.payoutAccount || !verified
                ? 'Add a payout account and verify your ID first'
                : 'Nothing available to withdraw yet'
          }
          onClick={() => navigate('/provider/earnings/withdraw')}
        >
          Withdraw {money.available > 0 ? formatNairaShort(money.available) : ''}
        </button>
      }
    >
      <motion.div className="stat-grid stat-grid--four" variants={riseIn}>
        <div className="stat stat--hero">
          <span className="stat__label">Available</span>
          <span className="stat__value">{formatNaira(money.available)}</span>
          <span className="stat__meta">
            {money.penalties > 0 ? `After ${formatNairaShort(money.penalties)} in penalties` : 'Ready to withdraw'}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">In escrow</span>
          <span className="stat__value">{formatNairaShort(money.escrow)}</span>
          <span className="stat__meta">Paid for upcoming jobs</span>
        </div>
        <div className="stat">
          <span className="stat__label">This month</span>
          <span className="stat__value">{formatNairaShort(money.thisMonth)}</span>
          <span className="stat__meta">Earned after fees</span>
        </div>
        <div className="stat">
          <span className="stat__label">Paid out</span>
          <span className="stat__value">{formatNairaShort(money.paidOut)}</span>
          <span className="stat__meta">All time</span>
        </div>
      </motion.div>

      <motion.div className="split" variants={riseIn}>
        <section className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Payout account</h2>
              <p className="card__hint">Where your money goes.</p>
            </div>
          </div>
          {state.payoutAccount ? (
            <div className="account-line">
              <span className="account-line__icon" aria-hidden="true">
                <WalletIcon />
              </span>
              <span className="account-line__text">
                <strong>{state.payoutAccount.bank}</strong>
                <span>
                  {state.payoutAccount.accountName} · {maskAccount(state.payoutAccount.accountNumber)}
                </span>
              </span>
              <a className="ghost-button ghost-button--small" href="#/provider/earnings/payout">
                Change
              </a>
            </div>
          ) : (
            <div className="account-line account-line--empty">
              <span className="account-line__text">
                <strong>No account yet</strong>
                <span>Add the Nigerian bank account your earnings should land in.</span>
              </span>
              <a className="button-primary" href="#/provider/earnings/payout">
                Add account
              </a>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Identity</h2>
              <p className="card__hint">Required by our payment partner before money can move.</p>
            </div>
          </div>
          <div className={`account-line${verified ? '' : ' account-line--empty'}`}>
            <span className={`account-line__icon${verified ? ' account-line__icon--good' : ''}`} aria-hidden="true">
              {verified ? <CheckIcon /> : <ShieldIcon />}
            </span>
            <span className="account-line__text">
              <strong>
                {verified ? 'Verified' : state.verification.status === 'pending' ? 'Checking your ID…' : 'Not verified'}
              </strong>
              <span>
                {state.verification.status === 'none'
                  ? 'A government ID — takes about two minutes.'
                  : `${state.verification.idType} ending ${state.verification.idLast4}`}
              </span>
            </span>
            {state.verification.status === 'none' && (
              <a className="button-primary" href="#/provider/earnings/verify">
                Verify
              </a>
            )}
          </div>
        </section>
      </motion.div>

      <motion.section className="card how-paid" variants={riseIn}>
        <h2 className="card__title">How you get paid</h2>
        <ol className="how-paid__steps">
          <li>
            <strong>Host pays a deposit</strong>
            <span>The moment they book a package. It’s held in escrow — not by you or the host.</span>
          </li>
          <li>
            <strong>Balance before the day</strong>
            <span>The rest is due 14 days before the event. We chase it, not you.</span>
          </li>
          <li>
            <strong>Released after the event</strong>
            <span>24 hours after it ends, minus our {PLATFORM_FEE_PERCENT}% fee. Withdraw any time.</span>
          </li>
        </ol>
      </motion.section>

      <motion.section className="card card--flush" variants={riseIn}>
        <div className="card__header ledger__head">
          <div>
            <h2 className="card__title">Booking earnings</h2>
            <p className="card__hint">Every paid and completed booking.</p>
          </div>
        </div>
        {ledger.length === 0 ? (
          <p className="quiet-empty ledger__empty">Your first booking will appear here.</p>
        ) : (
          <div className="ledger" role="table" aria-label="Booking earnings">
            <div className="ledger__row ledger__row--head" role="row">
              <span role="columnheader">Event</span>
              <span role="columnheader">Date</span>
              <span role="columnheader">Total</span>
              <span role="columnheader">Fee</span>
              <span role="columnheader">You get</span>
              <span role="columnheader">Status</span>
            </div>
            {ledger.map((booking) => {
              const split = payoutFor(booking.total)
              return (
                <a key={booking.id} className="ledger__row" role="row" href={href(bookingPath(booking.id))}>
                  <span role="cell" className="ledger__event">
                    <span className="ledger__name">
                      {booking.eventName}
                      <span className="ledger__sub">{booking.packageName}</span>
                    </span>
                    {booking.source === 'sample' && <span className="tag tag--muted">Sample</span>}
                  </span>
                  <span role="cell">{formatShortDate(booking.date)}</span>
                  <span role="cell">{formatNaira(booking.total)}</span>
                  <span role="cell" className="ledger__fee">
                    −{formatNaira(split.fee)}
                  </span>
                  <span role="cell" className="ledger__net">
                    {formatNaira(split.net)}
                  </span>
                  <span role="cell">
                    <span className={`tag ${booking.status === 'completed' ? 'tag--good' : 'tag--warn'}`}>
                      {booking.status === 'completed' ? 'Released' : 'In escrow'}
                    </span>
                  </span>
                </a>
              )
            })}
          </div>
        )}
      </motion.section>

      {state.payouts.length > 0 && (
        <motion.section className="card" variants={riseIn}>
          <h2 className="card__title">Withdrawals</h2>
          <ul className="withdrawals">
            {state.payouts.map((payout) => (
              <li key={payout.id}>
                <span className="withdrawals__amount">{formatNaira(payout.amount)}</span>
                <span className="withdrawals__meta">
                  To {payout.bankLabel} · {PAYOUT_DATE.format(new Date(payout.requestedISO))}
                </span>
                <span className={`tag ${payout.status === 'paid' ? 'tag--good' : 'tag--warn'}`}>
                  {payout.status === 'paid' ? 'Paid' : 'Processing'}
                </span>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      <PayoutAccountModal open={dialog === 'payout'} onClose={close} />
      <VerifyModal open={dialog === 'verify'} onClose={close} />
      <Modal
        open={dialog === 'withdraw'}
        onClose={close}
        size="small"
        title={`Withdraw ${formatNaira(money.available)}?`}
        footer={
          <>
            <button type="button" className="button-neutral" onClick={close}>
              Cancel
            </button>
            <button
              type="button"
              className="button-primary"
              disabled={!canWithdraw}
              onClick={() => {
                requestPayout(money.available)
                close()
              }}
            >
              Withdraw
            </button>
          </>
        }
      >
        <p className="modal-copy">
          {state.payoutAccount
            ? `It will be sent to ${state.payoutAccount.bank} ${maskAccount(state.payoutAccount.accountNumber)}, usually the same working day.`
            : 'Add a payout account first.'}
        </p>
        <p className="modal-sim">Simulated — no money moves in this build.</p>
      </Modal>
    </ProviderShell>
  )
}

function PayoutAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, listing, setPayoutAccount } = useProvider()
  const [bank, setBank] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setBank(state.payoutAccount?.bank ?? '')
    setAccountNumber(state.payoutAccount?.accountNumber ?? '')
    setAccountName(state.payoutAccount?.accountName ?? listing.name ?? '')
    setErrors({})
  }, [open, state.payoutAccount, listing.name])

  function submit(event: FormEvent): void {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!bank) next.bank = 'Choose your bank.'
    if (!/^\d{10}$/.test(accountNumber)) next.accountNumber = 'Nigerian account numbers are 10 digits.'
    if (accountName.trim().length < 3) next.accountName = 'Enter the name on the account.'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setPayoutAccount({ bank, accountNumber, accountName: accountName.trim() })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={state.payoutAccount ? 'Change payout account' : 'Add a payout account'}
      subtitle="The account must be in your name or your business’s registered name."
      footer={
        <>
          <button type="button" className="button-neutral" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="provider-payout-form" className="button-primary">
            Save account
          </button>
        </>
      }
    >
      <form id="provider-payout-form" className="modal-form" onSubmit={submit} noValidate>
        <label className="modal-field">
          <span className="filters__label">Bank</span>
          <select className="filters__input" value={bank} onChange={(event) => setBank(event.target.value)}>
            <option value="">Choose a bank</option>
            {NIGERIAN_BANKS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <FieldError text={errors.bank} />
        </label>
        <label className="modal-field">
          <span className="filters__label">Account number</span>
          <input
            className="filters__input"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            value={accountNumber}
            placeholder="10 digits"
            onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))}
          />
          <FieldError text={errors.accountNumber} />
        </label>
        <label className="modal-field">
          <span className="filters__label">Account name</span>
          <input
            className="filters__input"
            value={accountName}
            placeholder="As it appears on your statement"
            onChange={(event) => setAccountName(event.target.value)}
          />
          <FieldError text={errors.accountName} />
        </label>
      </form>
    </Modal>
  )
}

function VerifyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { submitVerification } = useProvider()
  const [idType, setIdType] = useState(ID_TYPES[0])
  const [idNumber, setIdNumber] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setIdNumber('')
    setConsent(false)
    setError('')
  }, [open])

  function submit(event: FormEvent): void {
    event.preventDefault()
    if (idNumber.replace(/\s/g, '').length < 6) {
      setError('Enter the number printed on your ID.')
      return
    }
    if (!consent) {
      setError('Tick the box to let us check this ID.')
      return
    }
    submitVerification(idType, idNumber)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Verify your identity"
      subtitle="We check it once with the issuing authority. Only the last four digits are kept."
      footer={
        <>
          <button type="button" className="button-neutral" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="provider-verify-form" className="button-primary">
            Submit for checking
          </button>
        </>
      }
    >
      <form id="provider-verify-form" className="modal-form" onSubmit={submit} noValidate>
        <fieldset className="decline">
          <legend className="filters__label">Type of ID</legend>
          {ID_TYPES.map((type) => (
            <label key={type} className="decline__option">
              <input type="radio" name="id-type" checked={idType === type} onChange={() => setIdType(type)} />
              {type}
            </label>
          ))}
        </fieldset>
        <label className="modal-field">
          <span className="filters__label">ID number</span>
          <input
            className="filters__input"
            autoComplete="off"
            value={idNumber}
            onChange={(event) => {
              setIdNumber(event.target.value)
              setError('')
            }}
          />
        </label>
        <label className="decline__block">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          I confirm this ID is mine and agree to it being checked.
        </label>
        <FieldError text={error} />
        <p className="modal-sim">Simulated — verification completes in a few seconds in this build.</p>
      </form>
    </Modal>
  )
}

function FieldError({ text }: { text?: string }) {
  return (
    <AnimatePresence initial={false}>
      {text && (
        <motion.span
          className="form-error"
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          {text}
        </motion.span>
      )}
    </AnimatePresence>
  )
}
