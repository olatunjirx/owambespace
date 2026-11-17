import { useEffect, useRef } from 'react'

import type { ListingPhoto, OwnerVenue } from '../../lib/owner'
import { navigate } from '../../router/hashRouter'
import { useOwner } from '../../state/Owner'

/**
 * Dev helper: open #/owner/dev/sample-venue to add three fully filled-in
 * draft venues, then land on My venues. A sample you already have (same
 * name) is skipped, so opening the link twice does not duplicate anything.
 * Nothing is submitted: the owner checks each one and presses Submit.
 */
export function SampleVenueRoute() {
  const { state, createVenue } = useOwner()
  // Strict mode runs effects twice in development; create the set once.
  const createdIds = useRef<string[] | null>(null)

  useEffect(() => {
    if (createdIds.current) return
    const existing = new Set(state.venues.map((venue) => venue.name))
    createdIds.current = SAMPLES.filter((sample) => !existing.has(sample.venue.name ?? '')).map(
      (sample) => createVenue({ ...sample.venue, photos: samplePhotos(sample.scenes) }).id,
    )
    // Nothing new means no state change and no re-render, so leave now.
    if (createdIds.current.length === 0) navigate('/owner/venues', true)
    // Only the first render matters here; later renders see our own venues.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createVenue])

  // Leave only once every new venue is in state, so My venues shows them all.
  const ready =
    createdIds.current !== null &&
    createdIds.current.every((id) => state.venues.some((venue) => venue.id === id))
  useEffect(() => {
    if (ready) navigate('/owner/venues', true)
  }, [ready])

  return null
}

type PhotoScene = { caption: string; from: string; to: string }
type Sample = { venue: Partial<OwnerVenue>; scenes: PhotoScene[] }

const PALM_COURT: Partial<OwnerVenue> = {
  name: 'Palm Court Gardens',
  spaceType: 'Garden',
  tagline: 'A lakeside garden for weddings and garden parties of up to 600 guests.',
  description:
    'Palm Court Gardens is an open-air garden on the Victoria Island waterfront, shaded by royal palms and lit with festoon lights after dark. ' +
    'The main lawn takes a marquee for up to 600 guests, and the covered terrace seats 150 for cocktails or a smaller reception. ' +
    'There is parking for 120 cars, two backup generators, and a prep kitchen for your caterer.',
  state: 'Lagos',
  area: 'Victoria Island',
  address: '14 Ozumba Mbadiwe Avenue, Victoria Island',
  directions: 'Enter through the second gate after the Federal Palace roundabout. Parking is signposted on the left.',
  spaces: [
    { name: 'Main lawn', capacity: 600 },
    { name: 'Covered terrace', capacity: 150 },
  ],
  seating: [
    { name: 'Banquet', capacity: 450 },
    { name: 'Theatre', capacity: 600 },
    { name: 'Cocktail', capacity: 600 },
  ],
  amenities: ['Parking', 'Backup power', 'Outdoor space', 'Security', 'Kitchen', 'Bar area', 'Dance floor', 'Bridal suite'],
  pricePerDay: 1_800_000,
  weekendPremium: 25,
  depositPercent: 40,
  guide: {
    arrival: 'Enter through the main gate. Security will ask for the event name.',
    parking: 'Parking for 80 cars. Vendor vans unload at the side gate.',
    setup: 'Vendors can enter from 8am. Everything must be cleared by midnight.',
    power: 'Generator included for 10 hours. Sockets run along the lawn edge.',
  },
  eventDayPhone: '0803 555 0101',
  inHouse: [
    { name: 'Marquee & tables', price: 650_000, perGuest: false },
    { name: 'Decor package', price: 900_000, perGuest: false },
    { name: 'In-house catering', price: 12_500, perGuest: true },
  ],
  cancellation: 'moderate',
  curfew: '11:00 PM',
  alcohol: 'Allowed. Corkage of ₦50,000 applies if you bring your own drinks.',
  outsideVendors: 'Outside caterers and decorators are welcome with a ₦100,000 refundable damage deposit.',
  houseRules: 'No fireworks or confetti cannons on the lawn. Music must be turned down at 10:30 PM.',
  faq: [
    {
      question: 'What happens if it rains?',
      answer: 'The covered terrace seats 150, and our marquee package covers the whole lawn.',
    },
    {
      question: 'What time can we start setting up?',
      answer: 'Set-up access opens at 8 AM on the event day. The day before can be booked at half the day rate.',
    },
  ],
}

const PALM_COURT_SCENES: PhotoScene[] = [
  { caption: 'Main lawn at dusk', from: '#1f6f4a', to: '#e8b04b' },
  { caption: 'Covered terrace', from: '#2c3e70', to: '#9fb7e8' },
  { caption: 'Banquet set-up', from: '#6b2d5c', to: '#f0a6ca' },
  { caption: 'Entrance and parking', from: '#3a3a3a', to: '#c9c2b0' },
]

const ADUNNI_HALL: Partial<OwnerVenue> = {
  name: 'Adunni Grand Hall',
  spaceType: 'Hall',
  tagline: 'An air-conditioned banquet hall in Ikeja for receptions of up to 800.',
  description:
    'Adunni Grand Hall is a column-free banquet hall five minutes from the Ikeja City Mall, with a raised stage, ' +
    'a built-in sound system and chandeliers on dimmers. A separate VIP lounge seats 60 for the couple and family, ' +
    'and the car park takes 200 cars with attendants on the night.',
  state: 'Lagos',
  area: 'Ikeja GRA',
  address: '22 Joel Ogunnaike Street, Ikeja GRA',
  directions: 'Opposite the GRA police post. Use the Isaac John Street gate on Saturdays.',
  spaces: [
    { name: 'Grand hall', capacity: 800 },
    { name: 'VIP lounge', capacity: 60 },
  ],
  seating: [
    { name: 'Banquet', capacity: 650 },
    { name: 'Theatre', capacity: 800 },
  ],
  amenities: ['Parking', 'Backup power', 'Air conditioning', 'Sound system', 'Stage', 'Dance floor', 'Security', 'CCTV', 'Disability access'],
  pricePerDay: 2_500_000,
  weekendPremium: 20,
  depositPercent: 30,
  guide: {
    arrival: 'Use the north entrance. Ushers meet guests at the lobby.',
    parking: 'Basement parking for 150 cars. Trucks use the loading bay.',
    setup: 'Load-in from 7am through the service lift. Clear by 1am.',
    power: 'Full backup power. Three-phase supply is beside the stage.',
  },
  eventDayPhone: '0803 555 0102',
  inHouse: [
    { name: 'Lighting & DJ booth', price: 350_000, perGuest: false },
    { name: 'Ushers (team of 10)', price: 150_000, perGuest: false },
  ],
  cancellation: 'strict',
  curfew: '12:00 AM',
  alcohol: 'Allowed. No corkage.',
  outsideVendors: 'Welcome. Vendors must arrive at least 3 hours before guests.',
  houseRules: 'No open flames or smoke machines in the hall. Children must be supervised at all times.',
  faq: [
    {
      question: 'Is the generator included?',
      answer: 'Yes. Two 500 kVA generators run for the whole hire at no extra cost.',
    },
  ],
}

const ADUNNI_HALL_SCENES: PhotoScene[] = [
  { caption: 'Grand hall, banquet set-up', from: '#4a2a12', to: '#e2b36a' },
  { caption: 'Stage and dance floor', from: '#1d1b3a', to: '#7c5cf0' },
  { caption: 'VIP lounge', from: '#3d1f2b', to: '#c98a9c' },
]

const SKYLINE_ROOFTOP: Partial<OwnerVenue> = {
  name: 'The Skyline Rooftop',
  spaceType: 'Roof top',
  tagline: 'A rooftop terrace in Wuse 2 with city views, for parties of up to 200.',
  description:
    'The Skyline Rooftop sits on the 12th floor above Wuse 2, with open views across Abuja and a glass-roofed lounge ' +
    'for when the weather turns. It suits birthdays, engagement parties and product launches, with a cocktail bar ' +
    'and a DJ corner already set up.',
  state: 'Abuja (FCT)',
  area: 'Wuse 2',
  address: '5 Aminu Kano Crescent, Wuse 2',
  directions: 'Take the glass lift in the main lobby to the 12th floor. Guest parking is in the basement.',
  spaces: [
    { name: 'Open terrace', capacity: 200 },
    { name: 'Glass lounge', capacity: 80 },
  ],
  seating: [{ name: 'Cocktail', capacity: 200 }],
  amenities: ['Parking', 'Backup power', 'Air conditioning', 'Wi-Fi', 'Sound system', 'Bar area', 'Outdoor space', 'Security'],
  pricePerDay: 950_000,
  weekendPremium: 15,
  depositPercent: 50,
  guide: {
    arrival: 'Take the lift to the 12th floor. Reception checks the guest list.',
    parking: 'Valet parking for guests. Vendors unload at the rear lift.',
    setup: 'Vendors can enter from 10am. Clear by 2am.',
    power: 'Backup power included. Bar and DJ points are marked on the terrace.',
  },
  eventDayPhone: '0803 555 0103',
  inHouse: [
    { name: 'Cocktail bar & bartenders', price: 8_000, perGuest: true },
    { name: 'DJ for 5 hours', price: 250_000, perGuest: false },
  ],
  cancellation: 'flexible',
  curfew: '1:00 AM',
  alcohol: 'Drinks come from our bar only.',
  outsideVendors: 'Outside caterers allowed. Decorators must use our approved list for the terrace.',
  houseRules: 'No glass on the open terrace after 10 PM. Maximum 200 guests for safety.',
  faq: [
    {
      question: 'What if it rains?',
      answer: 'The glass lounge holds 80 guests, and we can put clear canopies over half the terrace.',
    },
  ],
}

const SKYLINE_ROOFTOP_SCENES: PhotoScene[] = [
  { caption: 'Terrace at night', from: '#0b1a33', to: '#3f7cc9' },
  { caption: 'Glass lounge', from: '#1c3b3a', to: '#8fd3c6' },
  { caption: 'Cocktail bar', from: '#3b1d0b', to: '#f39c4a' },
  { caption: 'City view at sunset', from: '#5a1a3a', to: '#ffb36b' },
]

const SAMPLES: Sample[] = [
  { venue: PALM_COURT, scenes: PALM_COURT_SCENES },
  { venue: ADUNNI_HALL, scenes: ADUNNI_HALL_SCENES },
  { venue: SKYLINE_ROOFTOP, scenes: SKYLINE_ROOFTOP_SCENES },
]

/** Placeholder photos drawn on a canvas — there's no image server in this build. */
function samplePhotos(scenes: PhotoScene[]): ListingPhoto[] {
  return scenes.map((scene, index) => {
    const canvas = document.createElement('canvas')
    canvas.width = 960
    canvas.height = 640
    const context = canvas.getContext('2d')
    if (context) {
      const gradient = context.createLinearGradient(0, 0, 960, 640)
      gradient.addColorStop(0, scene.from)
      gradient.addColorStop(1, scene.to)
      context.fillStyle = gradient
      context.fillRect(0, 0, 960, 640)
      context.fillStyle = 'rgba(255, 255, 255, 0.9)'
      context.font = '600 44px system-ui, sans-serif'
      context.fillText(scene.caption, 48, 580)
    }
    return {
      id: `sample-photo-${Date.now()}-${index}`,
      src: canvas.toDataURL('image/jpeg', 0.7),
      caption: scene.caption,
    }
  })
}
