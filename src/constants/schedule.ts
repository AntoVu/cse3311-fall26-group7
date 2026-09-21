export const CLASS_FLAG_COLORS = [
  '#0284C7', // Sky / UTA Blue
  '#EA580C', // Orange / UTA Orange
  '#16A34A', // Emerald Green
  '#9333EA', // Purple
  '#E11D48', // Rose
  '#0D9488', // Teal
  '#D97706', // Amber
  '#4F46E5', // Indigo
] as const;

/**
 * Automatically assigns a vibrant flag color for a class.
 * If index is provided, cycles through the palette by position.
 * If index is omitted, hashes the course code to guarantee a consistent color.
 */
export function getClassFlagColor(courseCodeOrId?: string, index?: number): string {
  if (index != null && index >= 0) {
    return CLASS_FLAG_COLORS[index % CLASS_FLAG_COLORS.length];
  }
  if (!courseCodeOrId) {
    return CLASS_FLAG_COLORS[0];
  }
  let hash = 0;
  for (let i = 0; i < courseCodeOrId.length; i++) {
    hash = (hash * 31 + courseCodeOrId.charCodeAt(i)) | 0;
  }
  return CLASS_FLAG_COLORS[Math.abs(hash) % CLASS_FLAG_COLORS.length];
}

// Status colors for the Schedule cards: a faint yellow glow marks the upcoming class, a faint
// green glow marks the class in progress, and a green check marks a finished class.
export const CLASS_STATUS_COLORS = {
  upcoming: '#EAB308',
  inProgress: '#22C55E',
  done: '#16A34A',
} as const;

// "#22C55E" + 0.4 -> "#22C55E66". Used to fade the status colors into a soft glow.
export function withOpacity(hexColor: string, opacity: number): string {
  const alpha = Math.round(Math.min(Math.max(opacity, 0), 1) * 255);
  return `${hexColor}${alpha.toString(16).padStart(2, '0')}`;
}
