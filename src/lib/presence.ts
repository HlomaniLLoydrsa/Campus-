// Shared constants for the VYBE Map / Who's-Around presence feature.
// Kept out of the route file because Next.js route modules may only export
// HTTP handlers (and a few reserved config exports).

// How long a check-in stays live before it auto-expires (minutes).
export const PRESENCE_TTL_MINUTES = 120;

// The named campus spots a user can check into. Server-side source of truth so a
// client can't inject arbitrary locations; the /map page mirrors this list.
export const CAMPUS_LOCATIONS = [
  'Library',
  'Main Cafeteria',
  'Student Center',
  'Gym',
  'Lecture Halls',
  'Computer Labs',
  'Sports Field',
  'Res / Dorms',
  'Coffee Shop',
  'Study Lounge',
  'Quad / Lawn',
  'Off Campus',
] as const;

export function isValidLocation(loc: unknown): loc is string {
  return typeof loc === 'string' && (CAMPUS_LOCATIONS as readonly string[]).includes(loc);
}
