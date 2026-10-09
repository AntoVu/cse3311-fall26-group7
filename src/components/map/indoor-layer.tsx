import { Circle, G, Polygon, Rect, Text } from 'react-native-svg';

import { projectCoordinate, projectPath } from '@/components/map/projection';
import { ROUTE_COLORS } from '@/constants/routing';
import { INDOOR_FLOOR_PLANS, INDOOR_NODES } from '@/data/campus-indoor';
import { useTheme } from '@/hooks/use-theme';
import type { Coordinate } from '@/types/map';

// Sizes in map units (about 2 m each), for the indoor map's building-sized view.
const WALL_WIDTH = 0.12;
const ROOM_FONT = 0.7;
const HIGHLIGHT_FONT = 1.3;
const CONNECTOR_SIZE = 0.9;
const ENTRANCE_RADIUS = 0.3;
const OBJECT_RADIUS = 0.45;

/** The letters on an object's dot. `other` uses its name's first letter. */
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
 * One floor of one building as a floor plan: room outlines with their numbers inside, stairs and
 * elevators as lettered squares, entrances as rings and objects (restrooms...) as lettered dots.
 * Drawn over the floor's outline and under the route. Hallways are not drawn: the space between
 * rooms reads as the corridor. A room with no outline yet shows its number at its door.
 */
export function IndoorLayer({ poiId, level, highlightRooms = [] }: IndoorLayerProps) {
  const theme = useTheme();
  const plan = INDOOR_FLOOR_PLANS[poiId]?.[level];
  const rooms = plan?.rooms ?? [];
  const outlined = new Set(rooms.map((room) => room.room));
  const nodes = INDOOR_NODES.filter((node) => node.poiId === poiId && node.level === level);
  const toAttr = (ring: Coordinate[]) => projectPath(ring).map((p) => `${p.x},${p.y}`).join(' ');

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
        fill={highlighted ? ROUTE_COLORS.destination : theme.text}
        fillOpacity={highlighted ? 1 : 0.7}>
        {text}
      </Text>
    );
  };

  return (
    <G>
      {rooms.map((room, index) => {
        const highlighted = highlightRooms.includes(room.room);
        return (
          <Polygon
            key={`room-${index}`}
            points={toAttr(room.ring)}
            fill={highlighted ? ROUTE_COLORS.destination : theme.backgroundElement}
            fillOpacity={highlighted ? 0.18 : 1}
            stroke={highlighted ? ROUTE_COLORS.destination : theme.text}
            strokeOpacity={highlighted ? 1 : 0.45}
            strokeWidth={highlighted ? WALL_WIDTH * 2 : WALL_WIDTH}
            strokeLinejoin="round"
          />
        );
      })}
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
      {nodes
        .filter((node) => node.connector)
        .map((node) => {
          const { x, y } = projectCoordinate(node.coordinate);
          return (
            <G key={node.id}>
              <Rect
                x={x - CONNECTOR_SIZE / 2}
                y={y - CONNECTOR_SIZE / 2}
                width={CONNECTOR_SIZE}
                height={CONNECTOR_SIZE}
                rx={CONNECTOR_SIZE / 5}
                fill={theme.text}
                fillOpacity={0.75}
              />
              <Text
                x={x}
                y={y + CONNECTOR_SIZE * 0.25}
                fontSize={CONNECTOR_SIZE * 0.7}
                fontWeight="bold"
                textAnchor="middle"
                fill={theme.background}>
                {node.connector === 'elevator' ? 'E' : 'S'}
              </Text>
            </G>
          );
        })}
      {plan?.objects.map((object, index) => {
        const { x, y } = projectCoordinate(object.at);
        const glyph = OBJECT_GLYPHS[object.kind] ?? (object.name ?? '?').charAt(0).toUpperCase();
        return (
          <G key={`object-${index}`}>
            <Circle cx={x} cy={y} r={OBJECT_RADIUS} fill={theme.text} fillOpacity={0.6} />
            <Text
              x={x}
              y={y + OBJECT_RADIUS * 0.35}
              fontSize={OBJECT_RADIUS * (glyph.length > 1 ? 0.8 : 1.1)}
              fontWeight="bold"
              textAnchor="middle"
              fill={theme.background}>
              {glyph}
            </Text>
          </G>
        );
      })}
      {rooms.map((room, index) => label(`label-${index}`, room.room, room.label, fitFont(room.ring, room.room)))}
      {nodes
        .filter((node) => node.room && !outlined.has(node.room))
        .map((node) => label(node.id, node.room!, node.coordinate, ROOM_FONT))}
    </G>
  );
}

/** The largest font (map units) at which `text` fits across the room's width and height. */
function fitFont(ring: Coordinate[], text: string): number {
  const points = projectPath(ring);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  // A digit is about 0.6 of the font size wide.
  return Math.min((width * 0.85) / (text.length * 0.6), height * 0.6);
}
