import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { ChevronLeftIcon, ChevronRightIcon, StarLineIcon, TrashIcon, UploadIcon } from './OwnerIcons'
import { MAX_PHOTOS, MIN_PHOTOS } from '../../lib/owner'
import type { ListingPhoto } from '../../lib/owner'
import { makeId } from '../../lib/events'
import { softSpring } from '../../motion/variants'
import { useOwner } from '../../state/Owner'
import type { StepProps } from './SetupSteps'

/** Long edge in pixels. Enough for a full-width hero, small enough to store. */
const MAX_EDGE = 1200
const QUALITY = 0.72

/**
 * Photos are shrunk in the browser before they are kept. There is no upload
 * server in this build, so they live in local storage — a 6MB phone photo
 * would fill it on its own; a 1200px JPEG is around a tenth of that.
 */
async function downscale(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('unreadable'))
      element.src = url
    })
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('no canvas')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', QUALITY)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function PhotosStep({ venue, update }: StepProps) {
  const { storageFull } = useOwner()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(0)
  const [notice, setNotice] = useState('')

  const room = MAX_PHOTOS - venue.photos.length

  async function addFiles(files: FileList | File[]): Promise<void> {
    const images = [...files].filter((file) => file.type.startsWith('image/'))
    const skipped = [...files].length - images.length
    const accepted = images.slice(0, Math.max(0, room))

    const messages: string[] = []
    if (skipped > 0) messages.push(`${skipped} file${skipped === 1 ? ' was' : 's were'} not an image.`)
    if (images.length > accepted.length) {
      messages.push(`You can have up to ${MAX_PHOTOS} photos — the extra ${images.length - accepted.length} were left out.`)
    }
    setNotice(messages.join(' '))
    if (accepted.length === 0) return

    setProcessing(accepted.length)
    const added: ListingPhoto[] = []
    for (const file of accepted) {
      try {
        added.push({ id: makeId(), src: await downscale(file), caption: '' })
      } catch {
        messages.push(`${file.name} could not be read.`)
      }
      setProcessing((count) => count - 1)
    }
    setNotice(messages.join(' '))
    // Appended to the list as it is now, not as it was when the batch began —
    // captions typed while photos were processing must survive.
    update((current) => ({ photos: [...current.photos, ...added].slice(0, MAX_PHOTOS) }))
  }

  function onDrop(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files.length) void addFiles(event.dataTransfer.files)
  }

  function move(index: number, to: number): void {
    if (to < 0 || to >= venue.photos.length) return
    const next = [...venue.photos]
    const [photo] = next.splice(index, 1)
    next.splice(to, 0, photo)
    update({ photos: next })
  }

  function setCaption(id: string, caption: string): void {
    update({ photos: venue.photos.map((photo) => (photo.id === id ? { ...photo, caption } : photo)) })
  }

  const short = Math.max(0, MIN_PHOTOS - venue.photos.length)

  return (
    <div className="setup__form">
      <label
        className={`dropzone${dragging ? ' dropzone--over' : ''}${room <= 0 ? ' dropzone--full' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          disabled={room <= 0}
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files)
            event.target.value = ''
          }}
        />
        <span className="dropzone__icon" aria-hidden="true">
          <UploadIcon size={20} />
        </span>
        <span className="dropzone__title">
          {room <= 0
            ? `That’s the maximum of ${MAX_PHOTOS} photos`
            : processing > 0
              ? `Preparing ${processing} photo${processing === 1 ? '' : 's'}…`
              : 'Drag photos here, or click to choose'}
        </span>
        <span className="dropzone__hint">
          {short > 0
            ? `${venue.photos.length} of ${MIN_PHOTOS} needed to publish · JPG or PNG`
            : `${venue.photos.length} of ${MAX_PHOTOS} · drag to the front to change the cover`}
        </span>
      </label>

      <AnimatePresence>
        {(notice || storageFull) && (
          <motion.p
            className="setup__callout setup__callout--warn"
            role="status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {storageFull
              ? 'This device is out of space for photos, so the latest ones will not survive a refresh. Remove a photo or two.'
              : notice}
          </motion.p>
        )}
      </AnimatePresence>

      {venue.photos.length > 0 && (
        <ul className="photos" aria-label="Your photos">
          <AnimatePresence initial={false}>
            {venue.photos.map((photo, index) => (
              <motion.li
                key={photo.id}
                className={`photo${index === 0 ? ' photo--cover' : ''}`}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={softSpring}
              >
                <div className="photo__frame">
                  <img src={photo.src} alt={photo.caption || `Photo ${index + 1}`} />
                  {index === 0 && <span className="photo__badge">Cover</span>}
                  <div className="photo__tools">
                    <button
                      type="button"
                      className="photo__tool"
                      onClick={() => move(index, index - 1)}
                      disabled={index === 0}
                      aria-label="Move earlier"
                    >
                      <ChevronLeftIcon size={14} />
                    </button>
                    {index !== 0 && (
                      <button
                        type="button"
                        className="photo__tool"
                        onClick={() => move(index, 0)}
                        aria-label="Make this the cover"
                        title="Make cover"
                      >
                        <StarLineIcon size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="photo__tool"
                      onClick={() => move(index, index + 1)}
                      disabled={index === venue.photos.length - 1}
                      aria-label="Move later"
                    >
                      <ChevronRightIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className="photo__tool photo__tool--danger"
                      onClick={() => update({ photos: venue.photos.filter((entry) => entry.id !== photo.id) })}
                      aria-label="Remove photo"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
                <input
                  className="photo__caption"
                  value={photo.caption}
                  maxLength={60}
                  placeholder="Add a caption"
                  aria-label={`Caption for photo ${index + 1}`}
                  onChange={(event) => setCaption(photo.id, event.target.value)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
