import { CLASS_FLAG_COLORS, getClassFlagColor } from '@/constants/schedule';


describe('getClassFlagColor', () => {
  it('has a defined palette of distinct vibrant colors', () => {
    expect(CLASS_FLAG_COLORS.length).toBeGreaterThanOrEqual(8);
    const unique = new Set(CLASS_FLAG_COLORS);
    expect(unique.size).toBe(CLASS_FLAG_COLORS.length);
  });

  it('assigns colors cyclically when index is provided', () => {
    expect(getClassFlagColor('CSE 3330', 0)).toBe(CLASS_FLAG_COLORS[0]);
    expect(getClassFlagColor('CSE 3310', 1)).toBe(CLASS_FLAG_COLORS[1]);
    expect(getClassFlagColor('PHYS 1444', 2)).toBe(CLASS_FLAG_COLORS[2]);
    expect(getClassFlagColor('MATH 2425', CLASS_FLAG_COLORS.length)).toBe(CLASS_FLAG_COLORS[0]);
  });

  it('deterministically hashes class code when index is not provided', () => {
    const color1 = getClassFlagColor('CSE 3330');
    const color2 = getClassFlagColor('CSE 3330');
    expect(color1).toBe(color2);
    expect(CLASS_FLAG_COLORS).toContain(color1);
  });

  it('gives distinct colors for the mock schedule classes by code', () => {
    const cse3330 = getClassFlagColor('CSE 3330');
    const cse3310 = getClassFlagColor('CSE 3310');
    const phys1444 = getClassFlagColor('PHYS 1444');

    expect(cse3330).not.toBe(cse3310);
    expect(cse3310).not.toBe(phys1444);
    expect(cse3330).not.toBe(phys1444);
  });

  it('returns default color for empty or undefined course code', () => {
    expect(getClassFlagColor('')).toBe(CLASS_FLAG_COLORS[0]);
    expect(getClassFlagColor(undefined)).toBe(CLASS_FLAG_COLORS[0]);
  });
});
