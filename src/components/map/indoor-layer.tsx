import { Circle, G, Polygon, Rect, Text } from 'react-native-svg';

import { projectCoordinate, projectPath } from '@/components/map/projection';
import { ROUTE_COLORS } from '@/constants/routing';
import { INDOOR_FLOOR_PLANS, INDOOR_NODES } from '@/data/campus-indoor';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import type { Coordinate } from '@/types/map';

// Sizes in map units (about 2 m each), for the indoor map's building-sized view.
const WALL_WIDTH = 0.12;
const ROOM_FONT = 0.7;
const HIGHLIGHT_FONT = 1.3;
const CONNECTOR_SIZE = 0.9;
const ENTRANCE_RADIUS = 0.3;
const OBJECT_RADIUS = 0.45;

/** Room tints by type, the Indoor Digitizer's colors, so a plan looks the same in both. */
const ROOM_COLORS = {
  light: { room: '#4D7C0F', restroom: '#C026D3', stairs: '#7C3AED', elevator: '#2563EB' },
  dark: { room: '#A3E635', restroom: '#E879F9', stairs: '#A78BFA', elevator: '#60A5FA' },
};

/** The letters on an object's dot (and a typed restroom's). `other` uses its name's first letter. */
const OBJECT_GLYPHS: Record<string, string> = {
  'restroom-men': 'M',
  'restroom-women': 'W',
  'restroom-all': 'WC',
  vending: 'V',
  microwave: 'MW',
  water: 'WF',
  seating: 'Se',
  study: 'St',
  lounge: 'L',
  printer: 'P',
  atm: '$',
  aed: '+',
};

type IndoorLayerProps = {
  poiId: string;
  level: string;
  /** Rooms that stand out (filled, number in bold): the destination, or a room the walk starts in. */
  highlightRooms?: string[];
};

/**
 * One floor of one building as a floor plan: room outlines with their numbers inside (a restroom,
 * stairwell or elevator outline shows its letter instead), solid blocks
 * (pillars, filled-in walls) filled in, stairs and elevators with no outline as lettered squares,
 * entrances as rings and objects (and restrooms with no outline) as lettered dots.
 * Drawn over the floor's outline and under the route. Hallways are not drawn: the space between
 * rooms reads as the corridor. A room with no outline yet shows its number at its door.
 */
export function IndoorLayer({ poiId, level, highlightRooms = [] }: IndoorLayerProps) {
  const theme = useTheme();
  const colors = ROOM_COLORS[useColorScheme() === 'dark' ? 'dark' : 'light'];
  // A room's color from its `use` (or an object's kind): restroom, stairs, elevator, else a numbered room.
  const colorOf = (use?: string) =>
    use?.startsWith('restroom') ? colors.restroom : use === 'stairs' || use === 'elevator' ? colors[use] : colors.room;
  const plan = INDOOR_FLOOR_PLANS[poiId]?.[level];
  const rooms = plan?.rooms ?? [];
  const typed = rooms.filter((room) => room.use);
  const outlined = new Set(rooms.map((room) => room.room));
  const nodes = INDOOR_NODES.filter((node) => node.poiId === poiId && node.level === level);
  const toAttr = (ring: Coordinate[]) => projectPath(ring).map((p) => `${p.x},${p.y}`).join(' ');

  const connectorMark = (key: string, connector: string, at: Coordinate, size: number) => {
    const { x, y } = projectCoordinate(at);
    return (
      <G key={key}>
        <Rect x={x - size / 2} y={y - size / 2} width={size} height={size} rx={size / 5} fill={colorOf(connector)} />
        <Text x={x} y={y + size * 0.25} fontSize={size * 0.7} fontWeight="bold" textAnchor="middle" fill={theme.background}>
          {connector === 'elevator' ? 'E' : 'S'}
        </Text>
      </G>
    );
  };
  const objectMark = (key: string, glyph: string, at: Coordinate, radius: number, color?: string) => {
    const { x, y } = projectCoordinate(at);
    return (
      <G key={key}>
        <Circle cx={x} cy={y} r={radius} fill={color ?? theme.text} fillOpacity={color ? 1 : 0.6} />
        <Text
          x={x}
          y={y + radius * 0.35}
          fontSize={radius * (glyph.length > 1 ? 0.8 : 1.1)}
          fontWeight="bold"
          textAnchor="middle"
          fill={theme.background}>
          {glyph}
        </Text>
      </G>
    );
  };

  const label = (key: string, text: string, at: Coordinate, fit: number) => {
    const highlighted = highlightRooms.includes(text);
    const size = highlighted ? Math.min(HIGHLIGHT_FONT, fit * 1.5) : Math.min(ROOM_FONT, fit);
    const { x, y } = projectCoordinate(at);
    return (
      <Text
        key={key}
        x={x}
        y={y + size * 0.35}
        fontSize={size}
        fontWeight={highlighted ? 'bold' : 'normal'}
        textAnchor="middle"
        fill={highlighted ? ROUTE_COLORS.destination : colors.room}>
        {text}
      </Text>
    );
  };

  return (
    <G>
      {rooms.map((room, index) => {
        const highlighted = !!room.room && highlightRooms.includes(room.room);
        const color = highlighted ? ROUTE_COLORS.destination : colorOf(room.use);
        return (
          <Polygon
            key={`room-${index}`}
            points={toAttr(room.ring)}
            fill={color}
            fillOpacity={highlighted ? 0.18 : room.use ? 0.22 : 0.1}
            stroke={color}
            strokeWidth={highlighted ? WALL_WIDTH * 2 : WALL_WIDTH}
            strokeLinejoin="round"
          />
        );
      })}
      {plan?.solids.map((ring, index) => (
        <Polygon
          key={`solid-${index}`}
          points={toAttr(ring)}
          fill={theme.text}
          fillOpacity={0.35}
          stroke={theme.text}
          strokeOpacity={0.45}
          strokeWidth={WALL_WIDTH}
          strokeLinejoin="round"
        />
      ))}
      {plan?.entrances.map((entrance, index) => {
        const { x, y } = projectCoordinate(entrance.at);
        return (
          <Circle
            key={`entrance-${index}`}
            cx={x}
            cy={y}
            r={ENTRANCE_RADIUS}
            fill={theme.background}
            stroke={theme.text}
            strokeWidth={WALL_WIDTH}
            opacity={entrance.exitOnly ? 0.35 : 0.9}
          />
        );
      })}
      {plan?.connectors.map((c, index) => connectorMark(`connector-${index}`, c.kind, c.at, CONNECTOR_SIZE))}
      {plan?.objects.map((object, index) =>
        objectMark(
          `object-${index}`,
          OBJECT_GLYPHS[object.kind] ?? (object.name ?? '?').charAt(0).toUpperCase(),
          object.at,
          OBJECT_RADIUS,
          object.kind.startsWith('restroom') ? colors.restroom : undefined
        )
      )}
      {typed.map((room, index) => {
        const size = Math.min(ringSpan(room.ring) * 0.7, CONNECTOR_SIZE * 1.5);
        return room.use === 'stairs' || room.use === 'elevator'
          ? connectorMark(`typed-${index}`, room.use, room.label, size)
          : objectMark(`typed-${index}`, OBJECT_GLYPHS[room.use!] ?? '?', room.label, size / 2, colorOf(room.use));
      })}
      {rooms
        .filter((room) => room.room && !room.use)
        .map((room, index) => label(`label-${index}`, room.room!, room.label, fitFont(room.ring, room.room!)))}
      {nodes
        .filter((node) => node.room && !node.restroom && !outlined.has(node.room))
        .map((node) => label(node.id, node.room!, node.coordinate, ROOM_FONT))}
    </G>
  );
}

/** The room's width and height in map units. */
function ringSize(ring: Coordinate[]): { width: number; height: number } {
  const points = projectPath(ring);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

/** The room's smaller side in map units: how big a centered icon can be. */
function ringSpan(ring: Coordinate[]): number {
  const { width, height } = ringSize(ring);
  return Math.min(width, height);
}

/** The largest font (map units) at which `text` fits across the room's width and height. */
function fitFont(ring: Coordinate[], text: string): number {
  const { width, height } = ringSize(ring);
  // A digit is about 0.6 of the font size wide.
  return Math.min((width * 0.85) / (text.length * 0.6), height * 0.6);
}
