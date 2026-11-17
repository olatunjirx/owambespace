import { FLYER_SIZES } from './flyers'
import type { FlyerFields, FlyerSize } from './flyers'

/**
 * Turns an on-screen flyer SVG into files. The SVG is serialised and drawn
 * into a canvas, so the export is the preview pixel for pixel.
 */

async function toCanvas(svg: SVGSVGElement, size: FlyerSize, scale: number): Promise<HTMLCanvasElement> {
  const { width, height } = FLYER_SIZES[size]
  const clone = svg.cloneNode(true) as SVGSVGElement
  // The preview is sized by CSS; the file needs its true pixel size.
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.removeAttribute('class')

  const markup = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }))

  try {
    const image = new Image()
    image.src = url
    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is unavailable in this browser.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not create the image.'))),
      type,
      quality,
    )
  })
}

function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export function flyerFilename(fields: FlyerFields, extension: string): string {
  const slug = (fields.title || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'event'}-flyer.${extension}`
}

export async function downloadPng(
  svg: SVGSVGElement,
  size: FlyerSize,
  scale: number,
  fields: FlyerFields,
): Promise<void> {
  const canvas = await toCanvas(svg, size, scale)
  save(await toBlob(canvas, 'image/png'), flyerFilename(fields, 'png'))
}

/** A5 in PDF points (1/72 inch). */
const A5_POINTS = { width: 419.53, height: 595.28 }

/**
 * A one-page PDF wrapping the flyer as a JPEG. Written by hand: a single
 * DCT-encoded image on a page needs five objects, not a PDF library.
 */
export async function downloadPdf(svg: SVGSVGElement, fields: FlyerFields): Promise<void> {
  const canvas = await toCanvas(svg, 'print', 1)
  const jpeg = new Uint8Array(await (await toBlob(canvas, 'image/jpeg', 0.92)).arrayBuffer())

  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (chunk: Uint8Array | string) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk
    parts.push(bytes)
    length += bytes.length
  }
  const object = (body: string) => {
    offsets.push(length)
    push(`${offsets.length} 0 obj\n${body}\nendobj\n`)
  }

  const { width, height } = A5_POINTS
  const draw = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`

  push('%PDF-1.4\n')
  object('<< /Type /Catalog /Pages 2 0 R >>')
  object('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  object(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  )
  offsets.push(length)
  push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  )
  push(jpeg)
  push('\nendstream\nendobj\n')
  object(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`)

  const xref = length
  push(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`)
  for (const offset of offsets) push(`${String(offset).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  save(new Blob(parts as BlobPart[], { type: 'application/pdf' }), flyerFilename(fields, 'pdf'))
}

export function shareText(fields: FlyerFields): string {
  return [
    [fields.eyebrow, fields.title].filter(Boolean).join(' '),
    [fields.date, fields.time].filter(Boolean).join(' · '),
    fields.venue,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Shares the image itself where the device allows it (most phones); desktop
 * browsers that cannot attach files fall back to WhatsApp with the details.
 */
export async function shareFlyer(
  svg: SVGSVGElement,
  size: FlyerSize,
  scale: number,
  fields: FlyerFields,
): Promise<void> {
  const text = shareText(fields)
  const canvas = await toCanvas(svg, size, scale)
  const file = new File([await toBlob(canvas, 'image/png')], flyerFilename(fields, 'png'), {
    type: 'image/png',
  })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
    } catch {
      // Closing the share sheet is not an error worth reporting.
    }
    return
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}

/** Shrinks an uploaded photo so it fits in storage and stays crisp at print size. */
export async function readPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()

    const longest = 900
    const ratio = Math.min(1, longest / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * ratio)
    canvas.height = Math.round(image.height * ratio)
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}
