import { useId } from 'react'
import type { ReactNode, Ref } from 'react'

import { FLYER_SIZES } from '../../lib/flyers'
import type { FlyerFields, FlyerLook, FlyerSize, FlyerTemplate } from '../../lib/flyers'

/*
 * System faces only. An SVG drawn into a canvas for export cannot reach the
 * page's web fonts, so anything else would preview in one face and download
 * in another.
 */
const DIDONE = "Didot, 'Bodoni 72', 'Bodoni MT', Georgia, serif"
const CLASSIC = "Georgia, 'Times New Roman', serif"
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const ROUND = "'Avenir Next', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const POSTER = "Futura, 'Avenir Next Condensed', 'Arial Black', sans-serif"

type Palette = {
  bg: [string, string]
  ink: string
  sub: string
  titleFont: string
  titleWeight: number
  titleCaps?: boolean
  bodyFont: string
  align: 'middle' | 'start'
  /** Vertical room kept clear for the look's own ornament, in 1080ths. */
  pad: number
}

const PALETTES: Record<FlyerLook, Palette> = {
  royal: { bg: ['#5b2be0', '#22086a'], ink: '#ffffff', sub: 'rgba(255,255,255,0.8)', titleFont: DIDONE, titleWeight: 400, bodyFont: SANS, align: 'middle', pad: 120 },
  clean: { bg: ['#ffffff', '#f8f5ff'], ink: '#171717', sub: '#5b5b5b', titleFont: DIDONE, titleWeight: 400, bodyFont: SANS, align: 'middle', pad: 130 },
  ankara: { bg: ['#fff6e6', '#fde9cc'], ink: '#3b1d0b', sub: '#6b4226', titleFont: CLASSIC, titleWeight: 700, bodyFont: SANS, align: 'middle', pad: 190 },
  memory: { bg: ['#252a27', '#141715'], ink: '#f5f3ea', sub: 'rgba(245,243,234,0.74)', titleFont: CLASSIC, titleWeight: 400, bodyFont: CLASSIC, align: 'middle', pad: 140 },
  gold: { bg: ['#161616', '#050505'], ink: '#f1e6c8', sub: '#d8cfb8', titleFont: DIDONE, titleWeight: 400, bodyFont: SANS, align: 'middle', pad: 150 },
  stars: { bg: ['#e4eeff', '#fde6f0'], ink: '#2b3a67', sub: '#56628a', titleFont: ROUND, titleWeight: 700, bodyFont: ROUND, align: 'middle', pad: 150 },
  neon: { bg: ['#170c33', '#05030f'], ink: '#ffffff', sub: '#d4ccff', titleFont: POSTER, titleWeight: 800, titleCaps: true, bodyFont: SANS, align: 'middle', pad: 130 },
  floral: { bg: ['#f8f4eb', '#ece4d2'], ink: '#2f3b2f', sub: '#5c6657', titleFont: CLASSIC, titleWeight: 400, bodyFont: CLASSIC, align: 'middle', pad: 170 },
  boardroom: { bg: ['#12234a', '#0a1428'], ink: '#ffffff', sub: 'rgba(255,255,255,0.74)', titleFont: SANS, titleWeight: 700, bodyFont: SANS, align: 'start', pad: 140 },
}

export type Watermark = 'none' | 'free' | 'locked'

type FlyerArtProps = {
  template: FlyerTemplate
  fields: FlyerFields
  size: FlyerSize
  accent?: string
  watermark: Watermark
  className?: string
  svgRef?: Ref<SVGSVGElement>
}

export function FlyerArt({ template, fields, size, accent, watermark, className, svgRef }: FlyerArtProps) {
  // Several flyers share a page (the template grid), so gradient ids must not
  // collide; useId's colons are not valid inside url(#…).
  const uid = `f${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const { width: W, height: H } = FLYER_SIZES[size]
  const u = W / 1080
  const palette = PALETTES[template.look]
  const tint = accent ?? template.accent
  const ids = { bg: `${uid}bg`, glow: `${uid}gl`, metal: `${uid}mt`, blur: `${uid}bl`, clip: `${uid}cp` }

  const titleFill =
    template.look === 'gold' || template.look === 'neon' ? `url(#${ids.metal})` : palette.ink

  const blocks = layoutText(fields, palette, tint, titleFill, W, H, u)

  const x = palette.align === 'start' ? W * 0.12 : W / 2
  const anchor = palette.align === 'start' ? 'start' : 'middle'

  return (
    <svg
      ref={svgRef}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={`${template.name} flyer for ${fields.title || 'this event'}`}
    >
      <defs>
        <linearGradient id={ids.bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.bg[0]} />
          <stop offset="1" stopColor={palette.bg[1]} />
        </linearGradient>
        <radialGradient id={ids.glow} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.metal} x1="0" y1="0" x2="1" y2="0">
          {template.look === 'neon' ? (
            <>
              <stop offset="0" stopColor={tint} />
              <stop offset="1" stopColor="#3ee6ff" />
            </>
          ) : accent ? (
            <>
              <stop offset="0" stopColor={accent} />
              <stop offset="1" stopColor={accent} />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#f7e08a" />
              <stop offset="0.5" stopColor="#d9b25a" />
              <stop offset="1" stopColor="#a8792a" />
            </>
          )}
        </linearGradient>
        <filter id={ids.blur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={10 * u} result="soft" />
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={W} height={H} fill={`url(#${ids.bg})`} />
      <Ornament look={template.look} W={W} H={H} u={u} tint={tint} ids={ids} />

      {blocks.map((block, index) =>
        block.kind === 'photo' ? (
          <g key={index}>
            <clipPath id={ids.clip}>
              <circle cx={W / 2} cy={block.top + block.r} r={block.r} />
            </clipPath>
            <image
              href={block.href}
              x={W / 2 - block.r}
              y={block.top}
              width={block.r * 2}
              height={block.r * 2}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${ids.clip})`}
            />
            <circle
              cx={W / 2}
              cy={block.top + block.r}
              r={block.r}
              fill="none"
              stroke={tint}
              strokeWidth={6 * u}
            />
          </g>
        ) : block.kind === 'rule' ? (
          <g key={index} stroke={tint} strokeWidth={2 * u} strokeLinecap="round">
            {palette.align === 'start' ? (
              <line x1={x} x2={x + 120 * u} y1={block.top} y2={block.top} strokeWidth={6 * u} />
            ) : (
              <>
                <line x1={W / 2 - 120 * u} x2={W / 2 - 22 * u} y1={block.top} y2={block.top} />
                <line x1={W / 2 + 22 * u} x2={W / 2 + 120 * u} y1={block.top} y2={block.top} />
                <rect
                  x={W / 2 - 7 * u}
                  y={block.top - 7 * u}
                  width={14 * u}
                  height={14 * u}
                  fill={tint}
                  stroke="none"
                  transform={`rotate(45 ${W / 2} ${block.top})`}
                />
              </>
            )}
          </g>
        ) : (
          <text
            key={index}
            x={x}
            textAnchor={anchor}
            fontFamily={block.font}
            fontSize={block.size}
            fontWeight={block.weight}
            fontStyle={block.italic ? 'italic' : undefined}
            letterSpacing={block.tracking}
            fill={block.fill}
            filter={block.glow ? `url(#${ids.blur})` : undefined}
          >
            {block.lines.map((line, row) => (
              <tspan key={row} x={x} y={block.top + block.size * (0.82 + row * block.leading)}>
                {line}
              </tspan>
            ))}
          </text>
        ),
      )}

      {watermark === 'free' && (
        <g>
          <rect
            x={W / 2 - 190 * u}
            y={H - 76 * u}
            width={380 * u}
            height={44 * u}
            rx={22 * u}
            fill="rgba(0,0,0,0.38)"
          />
          <text
            x={W / 2}
            y={H - 46 * u}
            textAnchor="middle"
            fontFamily={SANS}
            fontSize={22 * u}
            fill="#ffffff"
          >
            Made with Owambe Space
          </text>
        </g>
      )}

      {watermark === 'locked' && <PreviewMark W={W} H={H} u={u} />}
    </svg>
  )
}

/* ── Text layout ──────────────────────────────────────────── */

type TextBlock = {
  kind: 'text'
  lines: string[]
  size: number
  leading: number
  font: string
  weight: number
  italic?: boolean
  tracking?: number
  fill: string
  glow?: boolean
  top: number
}

type Block =
  | TextBlock
  | { kind: 'photo'; href: string; r: number; top: number }
  | { kind: 'rule'; top: number }

type Spec =
  | (Omit<TextBlock, 'top' | 'lines' | 'size'> & { text: string; size: number; gap: number; factor: number; maxLines?: number })
  | { kind: 'photo'; href: string; r: number; gap: number }
  | { kind: 'rule'; gap: number }

/** Greedy word wrap on an average glyph width — close enough for a poster. */
function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (next.length > maxChars && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function layoutText(
  fields: FlyerFields,
  palette: Palette,
  tint: string,
  titleFill: string,
  W: number,
  H: number,
  u: number,
): Block[] {
  const glow = titleFill.startsWith('url') && palette.titleFont === POSTER
  const title = palette.titleCaps ? fields.title.toUpperCase() : fields.title

  const specs: Spec[] = []
  if (fields.photo) specs.push({ kind: 'photo', href: fields.photo, r: 150 * u, gap: 0 })
  if (fields.eyebrow) {
    specs.push({ kind: 'text', text: fields.eyebrow.toUpperCase(), size: 28 * u, leading: 1.3, font: palette.bodyFont, weight: 600, tracking: 6 * u, fill: tint, gap: 36 * u, factor: 0.72 })
  }
  if (title) {
    specs.push({ kind: 'text', text: title, size: 112 * u, leading: 1.05, font: palette.titleFont, weight: palette.titleWeight, fill: titleFill, glow, gap: 28 * u, factor: palette.titleCaps ? 0.66 : palette.titleWeight >= 700 ? 0.62 : 0.55, maxLines: 3 })
  }
  if (fields.names) {
    specs.push({ kind: 'text', text: fields.names, size: 44 * u, leading: 1.25, font: palette.titleFont === POSTER ? palette.bodyFont : palette.titleFont, weight: 400, italic: true, fill: palette.ink, gap: 24 * u, factor: 0.48 })
  }
  specs.push({ kind: 'rule', gap: 44 * u })
  if (fields.date) {
    specs.push({ kind: 'text', text: fields.date, size: 42 * u, leading: 1.25, font: palette.bodyFont, weight: 600, fill: palette.ink, gap: 44 * u, factor: 0.55 })
  }
  if (fields.time) {
    specs.push({ kind: 'text', text: fields.time, size: 34 * u, leading: 1.25, font: palette.bodyFont, weight: 400, fill: palette.sub, gap: 10 * u, factor: 0.55 })
  }
  if (fields.venue) {
    specs.push({ kind: 'text', text: fields.venue, size: 34 * u, leading: 1.3, font: palette.bodyFont, weight: 400, fill: palette.sub, gap: 18 * u, factor: 0.52 })
  }
  if (fields.dressCode) {
    specs.push({ kind: 'text', text: `Colour of the day · ${fields.dressCode}`, size: 28 * u, leading: 1.3, font: palette.bodyFont, weight: 500, fill: tint, gap: 36 * u, factor: 0.55 })
  }
  if (fields.rsvp) {
    specs.push({ kind: 'text', text: `RSVP · ${fields.rsvp}`, size: 28 * u, leading: 1.3, font: palette.bodyFont, weight: 400, fill: palette.sub, gap: 12 * u, factor: 0.55 })
  }

  const width = W * 0.72
  const pad = palette.pad * u
  const room = H - pad * 2

  // Lay out once at full size; if the stack overflows the room, shrink every
  // size together and lay out again so the wrap reflects the new sizes.
  const measure = (scale: number) => {
    let height = 0
    const sized = specs.map((spec, index) => {
      const gap = index === 0 ? 0 : spec.gap * scale
      if (spec.kind === 'photo') {
        const r = spec.r * scale
        height += gap + r * 2
        return { spec, gap, r, lines: [] as string[], size: 0 }
      }
      if (spec.kind === 'rule') {
        height += gap
        return { spec, gap, r: 0, lines: [] as string[], size: 0 }
      }
      let size = spec.size * scale
      let lines = wrap(spec.text, Math.max(6, Math.floor(width / (size * spec.factor))))
      // A long title steps down rather than running to five lines.
      while (spec.maxLines && lines.length > spec.maxLines && size > spec.size * scale * 0.5) {
        size *= 0.88
        lines = wrap(spec.text, Math.max(6, Math.floor(width / (size * spec.factor))))
      }
      height += gap + size * spec.leading * lines.length
      return { spec, gap, r: 0, lines, size }
    })
    return { sized, height }
  }

  let { sized, height } = measure(1)
  if (height > room) ({ sized, height } = measure(Math.max(0.45, (room / height) * 0.98)))
  // A story or print page has far more height than a square; let the type
  // grow into it instead of floating small in the middle.
  else if (height < room * 0.6) ({ sized, height } = measure(Math.min(1.35, (room * 0.7) / height)))

  let cursor = pad + Math.max(0, (room - height) / 2)
  return sized.map(({ spec, gap, r, lines, size }) => {
    cursor += gap
    const top = cursor
    if (spec.kind === 'photo') {
      cursor += r * 2
      return { kind: 'photo', href: spec.href, r, top }
    }
    if (spec.kind === 'rule') {
      return { kind: 'rule', top }
    }
    cursor += size * spec.leading * lines.length
    const { text: _text, gap: _gap, factor: _factor, maxLines: _max, ...style } = spec
    return { ...style, lines, size, top }
  })
}

/* ── Ornaments ────────────────────────────────────────────── */

type Ids = { bg: string; glow: string; metal: string; blur: string; clip: string }

type OrnamentProps = { look: FlyerLook; W: number; H: number; u: number; tint: string; ids: Ids }

function Ornament({ look, W, H, u, tint, ids }: OrnamentProps): ReactNode {
  switch (look) {
    case 'royal':
      return (
        <g>
          <rect width={W} height={H} fill={`url(#${ids.glow})`} />
          <Sprig x={70 * u} y={80 * u} u={u} angle={35} color={tint} />
          <Sprig x={W - 70 * u} y={H - 80 * u} u={u} angle={215} color={tint} />
          <Sparkles W={W} H={H} u={u} color={tint} />
        </g>
      )
    case 'clean':
      return (
        <g fill="none" stroke={tint}>
          <rect x={44 * u} y={44 * u} width={W - 88 * u} height={H - 88 * u} rx={28 * u} strokeWidth={4 * u} />
          <rect x={62 * u} y={62 * u} width={W - 124 * u} height={H - 124 * u} rx={18 * u} strokeWidth={1.5 * u} strokeOpacity={0.35} />
        </g>
      )
    case 'ankara':
      return (
        <g>
          <AnkaraBand W={W} u={u} y={0} tint={tint} />
          <AnkaraBand W={W} u={u} y={H - 140 * u} tint={tint} flip />
        </g>
      )
    case 'memory':
      return (
        <g>
          <g fill="none" stroke={tint} strokeOpacity={0.7}>
            <rect x={50 * u} y={50 * u} width={W - 100 * u} height={H - 100 * u} strokeWidth={2 * u} />
            <rect x={64 * u} y={64 * u} width={W - 128 * u} height={H - 128 * u} strokeWidth={1 * u} />
          </g>
          <Sprig x={W / 2 - 80 * u} y={104 * u} u={u * 0.8} angle={0} color={tint} />
        </g>
      )
    case 'gold':
      return (
        <g fill="none" stroke={`url(#${ids.metal})`}>
          <rect x={56 * u} y={56 * u} width={W - 112 * u} height={H - 112 * u} strokeWidth={3 * u} />
          <rect x={74 * u} y={74 * u} width={W - 148 * u} height={H - 148 * u} strokeWidth={1.2 * u} />
          {[
            [56, 56, 0],
            [W / u - 56, 56, 90],
            [W / u - 56, H / u - 56, 180],
            [56, H / u - 56, 270],
          ].map(([cx, cy, turn]) => (
            <g key={turn} transform={`translate(${cx * u} ${cy * u}) rotate(${turn})`} strokeWidth={2 * u}>
              <path d={`M 0 ${90 * u} Q 0 0 ${90 * u} 0`} />
              <path d={`M ${18 * u} ${110 * u} Q ${18 * u} ${18 * u} ${110 * u} ${18 * u}`} />
              <circle cx={30 * u} cy={30 * u} r={6 * u} fill={`url(#${ids.metal})`} stroke="none" />
            </g>
          ))}
        </g>
      )
    case 'stars':
      return (
        <g>
          <path
            d={`M ${W - 170 * u} ${100 * u} A ${70 * u} ${70 * u} 0 1 0 ${W - 170 * u} ${240 * u} A ${42 * u} ${70 * u} 0 1 1 ${W - 170 * u} ${100 * u} Z`}
            fill="#ffd166"
          />
          {STAR_SPOTS.map(([sx, sy, scale], index) => (
            <path
              key={index}
              d={starPath(sx * W, sy * H, 18 * u * scale)}
              fill={index % 2 ? tint : '#ffd166'}
              opacity={0.85}
            />
          ))}
          <Cloud x={W * 0.18} y={H - 120 * u} u={u} />
          <Cloud x={W * 0.78} y={H - 90 * u} u={u * 1.2} />
        </g>
      )
    case 'neon':
      return (
        <g>
          <g stroke={tint} strokeOpacity={0.18} strokeWidth={3 * u}>
            {[0.15, 0.35, 0.55, 0.75].map((at) => (
              <line key={at} x1={W * at} y1={0} x2={W * at + 400 * u} y2={H} />
            ))}
          </g>
          <rect
            x={48 * u}
            y={48 * u}
            width={W - 96 * u}
            height={H - 96 * u}
            rx={36 * u}
            fill="none"
            stroke={`url(#${ids.metal})`}
            strokeWidth={5 * u}
            filter={`url(#${ids.blur})`}
          />
        </g>
      )
    case 'floral':
      return (
        <g>
          <Sprig x={90 * u} y={90 * u} u={u * 1.3} angle={40} color={tint} />
          <Sprig x={W - 90 * u} y={90 * u} u={u * 1.3} angle={140} color={tint} />
          <Sprig x={W / 2 - 95 * u} y={H - 90 * u} u={u} angle={0} color={tint} />
        </g>
      )
    case 'boardroom':
      return (
        <g>
          <g stroke="#ffffff" strokeOpacity={0.05} strokeWidth={1.5 * u}>
            {Array.from({ length: Math.ceil(W / (90 * u)) }, (_, index) => (
              <line key={`v${index}`} x1={index * 90 * u} x2={index * 90 * u} y1={0} y2={H} />
            ))}
            {Array.from({ length: Math.ceil(H / (90 * u)) }, (_, index) => (
              <line key={`h${index}`} y1={index * 90 * u} y2={index * 90 * u} x1={0} x2={W} />
            ))}
          </g>
          <rect x={0} y={0} width={W * 0.06} height={H} fill={tint} />
          <path d={`M ${W} ${H - 360 * u} L ${W} ${H} L ${W - 360 * u} ${H} Z`} fill={tint} opacity={0.22} />
        </g>
      )
  }
}

/** A stem with paired leaves, the shared botanical mark. */
function Sprig({ x, y, u, angle, color }: { x: number; y: number; u: number; angle: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} fill={color}>
      <path d={`M 0 0 Q ${80 * u} ${-6 * u} ${170 * u} 0`} stroke={color} strokeWidth={3 * u} fill="none" />
      {[0.25, 0.48, 0.7].map((at) => (
        <g key={at}>
          <ellipse cx={at * 170 * u} cy={-16 * u} rx={22 * u} ry={8 * u} transform={`rotate(-30 ${at * 170 * u} ${-16 * u})`} />
          <ellipse cx={at * 170 * u} cy={14 * u} rx={22 * u} ry={8 * u} transform={`rotate(30 ${at * 170 * u} ${14 * u})`} />
        </g>
      ))}
      <ellipse cx={180 * u} cy={0} rx={18 * u} ry={8 * u} />
    </g>
  )
}

function Sparkles({ W, H, u, color }: { W: number; H: number; u: number; color: string }) {
  const spots: [number, number, number][] = [
    [0.82, 0.12, 1],
    [0.9, 0.22, 0.6],
    [0.12, 0.84, 0.8],
    [0.2, 0.92, 0.5],
    [0.72, 0.9, 0.6],
  ]
  return (
    <g fill={color}>
      {spots.map(([sx, sy, scale]) => (
        <path key={`${sx}${sy}`} d={starPath(sx * W, sy * H, 12 * u * scale, 4)} />
      ))}
    </g>
  )
}

const STAR_SPOTS: [number, number, number][] = [
  [0.12, 0.1, 1],
  [0.26, 0.2, 0.6],
  [0.6, 0.08, 0.7],
  [0.88, 0.32, 0.6],
  [0.08, 0.5, 0.7],
  [0.92, 0.62, 0.9],
  [0.16, 0.72, 0.6],
]

function starPath(cx: number, cy: number, r: number, points = 5): string {
  const inner = r * (points === 4 ? 0.3 : 0.45)
  const steps = points * 2
  let d = ''
  for (let i = 0; i < steps; i += 1) {
    const radius = i % 2 === 0 ? r : inner
    const angle = (Math.PI * i) / points - Math.PI / 2
    d += `${i === 0 ? 'M' : 'L'} ${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)} `
  }
  return `${d}Z`
}

function Cloud({ x, y, u }: { x: number; y: number; u: number }) {
  return (
    <g fill="#ffffff" opacity={0.9}>
      <circle cx={x} cy={y} r={44 * u} />
      <circle cx={x + 52 * u} cy={y + 8 * u} r={36 * u} />
      <circle cx={x - 50 * u} cy={y + 12 * u} r={30 * u} />
      <rect x={x - 80 * u} y={y + 8 * u} width={170 * u} height={36 * u} rx={18 * u} />
    </g>
  )
}

function AnkaraBand({ W, u, y, tint, flip }: { W: number; u: number; y: number; tint: string; flip?: boolean }) {
  const step = 90 * u
  const count = Math.ceil(W / step) + 1
  const colours = [tint, '#0f766e', '#e9a800']
  return (
    <g transform={flip ? `translate(0 ${y * 2 + 140 * u}) scale(1 -1)` : undefined}>
      <rect x={0} y={y} width={W} height={140 * u} fill="#3b1d0b" />
      {Array.from({ length: count }, (_, index) => (
        <path
          key={index}
          d={`M ${index * step} ${y + 100 * u} L ${index * step + step / 2} ${y + 14 * u} L ${index * step + step} ${y + 100 * u} Z`}
          fill={colours[index % 3]}
        />
      ))}
      {Array.from({ length: count * 2 }, (_, index) => (
        <rect
          key={`d${index}`}
          x={index * (step / 2) + step / 4 - 7 * u}
          y={y + 112 * u}
          width={14 * u}
          height={14 * u}
          fill="#fff6e6"
          transform={`rotate(45 ${index * (step / 2) + step / 4} ${y + 119 * u})`}
        />
      ))}
    </g>
  )
}

function PreviewMark({ W, H, u }: { W: number; H: number; u: number }) {
  const rows = Math.ceil((H * 1.6) / (200 * u))
  return (
    <g transform={`rotate(-28 ${W / 2} ${H / 2})`} pointerEvents="none">
      {Array.from({ length: rows }, (_, index) => (
        <text
          key={index}
          x={W / 2}
          y={-H * 0.3 + index * 200 * u}
          textAnchor="middle"
          fontFamily={SANS}
          fontSize={58 * u}
          fontWeight={700}
          letterSpacing={10 * u}
          fill="rgba(128,128,128,0.32)"
        >
          PREVIEW · OWAMBE SPACE · PREVIEW · OWAMBE SPACE
        </text>
      ))}
    </g>
  )
}
