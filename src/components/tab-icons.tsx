import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';

/**
 * The web tab bar's icons, drawn here so the app owns them (they replaced PNGs of unknown origin,
 * 2026-11-15). Outline style on a 24-unit grid; the native tab bar uses the phone's own icons.
 */
export type TabIconName = 'map' | 'schedule' | 'parking' | 'settings';

const GEAR_TEETH = [0, 45, 90, 135, 180, 225, 270, 315];

export function TabIcon({ name, color, size = 24 }: { name: TabIconName; color: string; size?: number }) {
  const stroke = { stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'map' ? (
        <>
          {/* A folded map. */}
          <Polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" {...stroke} />
          <Line x1={9} y1={3} x2={9} y2={18} {...stroke} />
          <Line x1={15} y1={6} x2={15} y2={21} {...stroke} />
        </>
      ) : name === 'schedule' ? (
        <>
          {/* A calendar page. */}
          <Rect x={3} y={5} width={18} height={16} rx={2} {...stroke} />
          <Line x1={3} y1={10} x2={21} y2={10} {...stroke} />
          <Line x1={8} y1={3} x2={8} y2={7} {...stroke} />
          <Line x1={16} y1={3} x2={16} y2={7} {...stroke} />
        </>
      ) : name === 'parking' ? (
        <>
          {/* A parking sign. */}
          <Rect x={3} y={3} width={18} height={18} rx={4} {...stroke} />
          <Path d="M10 17V7h3.5a3 3 0 0 1 0 6H10" {...stroke} />
        </>
      ) : (
        <>
          {/* A gear: a ring with eight teeth around a hub. */}
          {GEAR_TEETH.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <Line
                key={angle}
                x1={12 + 6.5 * Math.cos(rad)}
                y1={12 + 6.5 * Math.sin(rad)}
                x2={12 + 9.5 * Math.cos(rad)}
                y2={12 + 9.5 * Math.sin(rad)}
                stroke={color}
                strokeWidth={3.5}
                strokeLinecap="butt"
              />
            );
          })}
          <Circle cx={12} cy={12} r={6.5} {...stroke} />
          <Circle cx={12} cy={12} r={2.5} {...stroke} />
        </>
      )}
    </Svg>
  );
}
