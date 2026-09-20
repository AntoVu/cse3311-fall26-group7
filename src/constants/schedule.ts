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
