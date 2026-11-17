import type { ReactNode } from 'react'

/**
 * Line icons for the owner side. Drawn on a 16px grid at a 1.4 stroke so they
 * sit at the same optical weight as the filled Figma icons the host side uses,
 * and take `currentColor` so nav items recolour on hover and when active.
 */
type IconProps = { size?: number }

function Icon({ size = 16, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 7.2 8 2.8l5.5 4.4V13a.7.7 0 0 1-.7.7H9.6V10H6.4v3.7H3.2a.7.7 0 0 1-.7-.7V7.2Z" />
    </Icon>
  )
}

export function InboxIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.3 9.2 3.9 3.4a.8.8 0 0 1 .8-.6h6.6a.8.8 0 0 1 .8.6l1.6 5.8V12.5a.8.8 0 0 1-.8.8H3.1a.8.8 0 0 1-.8-.8V9.2Z" />
      <path d="M2.4 9.2h3.3l.8 1.6h3l.8-1.6h3.3" />
    </Icon>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.3" y="3.2" width="11.4" height="10.5" rx="1.4" />
      <path d="M2.3 6.4h11.4M5.4 1.9v2.4M10.6 1.9v2.4" />
    </Icon>
  )
}

export function BuildingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.4 13.6h11.2M3.6 13.6V5.2L8 2.4l4.4 2.8v8.4" />
      <path d="M6.6 13.6v-3h2.8v3M6 6.6h.01M10 6.6h.01M6 8.6h.01M10 8.6h.01" />
    </Icon>
  )
}

export function WalletIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12.6 5.2V3.8a.9.9 0 0 0-.9-.9H3.4a1.1 1.1 0 0 0 0 2.3h9.4a.8.8 0 0 1 .8.8v7.1a.8.8 0 0 1-.8.8H3.4a1.1 1.1 0 0 1-1.1-1.1V4" />
      <path d="M10.6 9.4h.01" />
    </Icon>
  )
}

export function MegaphoneIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.4 6.6v2.8a.8.8 0 0 0 .8.8h1.4l5.8 3V2.8l-5.8 3H3.2a.8.8 0 0 0-.8.8Z" />
      <path d="M12.4 6a2.4 2.4 0 0 1 0 4M5 10.2l.8 3.2" />
    </Icon>
  )
}

export function GearIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.9v1.5M8 12.6v1.5M3.7 3.7l1 1M11.3 11.3l1 1M1.9 8h1.5M12.6 8h1.5M3.7 12.3l1-1M11.3 4.7l1-1" />
    </Icon>
  )
}

export function HelpCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M6.4 6.2a1.7 1.7 0 0 1 3.2.6c0 1.2-1.6 1.5-1.6 2.4M8 11.3h.01" />
    </Icon>
  )
}

export function LogoutLineIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 2.6H3.4a.8.8 0 0 0-.8.8v9.2a.8.8 0 0 0 .8.8H6M10.4 11l3-3-3-3M13.2 8H6" />
    </Icon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m3.5 8.3 2.8 2.8 6.2-6.3" />
    </Icon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3.2v9.6M3.2 8h9.6" />
    </Icon>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.2 8h9.4M9 4.4 12.6 8 9 11.6" />
    </Icon>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 3.6 5.6 8l4.4 4.4" />
    </Icon>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3.6 10.4 8 6 12.4" />
    </Icon>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 10.4V2.8M5 5.6l3-3 3 3M2.8 10.2v2.2a.9.9 0 0 0 .9.9h8.6a.9.9 0 0 0 .9-.9v-2.2" />
    </Icon>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.8 4.4h10.4M6.4 4.4V3a.6.6 0 0 1 .6-.6h2a.6.6 0 0 1 .6.6v1.4M4.2 4.4l.6 8.6a.8.8 0 0 0 .8.7h4.8a.8.8 0 0 0 .8-.7l.6-8.6" />
    </Icon>
  )
}

export function StarLineIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m8 2.2 1.7 3.5 3.8.5-2.8 2.7.7 3.8L8 10.9l-3.4 1.8.7-3.8-2.8-2.7 3.8-.5L8 2.2Z" />
    </Icon>
  )
}

export function EyeLineIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1.6 8S4 3.6 8 3.6 14.4 8 14.4 8 12 12.4 8 12.4 1.6 8 1.6 8Z" />
      <circle cx="8" cy="8" r="1.9" />
    </Icon>
  )
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.9 3 3.8v3.9c0 3 2.1 5.4 5 6.4 2.9-1 5-3.4 5-6.4V3.8L8 1.9Z" />
      <path d="m5.8 8 1.6 1.6 2.9-3" />
    </Icon>
  )
}

export function LinkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.1-2.1a2.6 2.6 0 0 0-3.7-3.7l-.8.8M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.4 8.9a2.6 2.6 0 0 0 3.7 3.7l.8-.8" />
    </Icon>
  )
}

export function SparkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.8v3M8 11.2v3M1.8 8h3M11.2 8h3M3.6 3.6l2 2M10.4 10.4l2 2M3.6 12.4l2-2M10.4 5.6l2-2" />
    </Icon>
  )
}

export function MessageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.6 3.4a.8.8 0 0 1 .8-.8h9.2a.8.8 0 0 1 .8.8v6.8a.8.8 0 0 1-.8.8H6.2l-3.1 2.4a.3.3 0 0 1-.5-.2V3.4Z" />
    </Icon>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.8V8l2.2 1.4" />
    </Icon>
  )
}
