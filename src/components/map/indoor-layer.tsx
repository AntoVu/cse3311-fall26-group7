import { Circle, G, Line, Rect, Text } from 'react-native-svg';

import { projectCoordinate } from '@/components/map/projection';
import { ROUTE_COLORS } from '@/constants/routing';
import { INDOOR_EDGES, INDOOR_NODES } from '@/data/campus-indoor';
import { useTheme } from '@/hooks/use-theme';

const NODE_BY_ID = new Map(INDOOR_NODES.map((node) => [node.id, node]));

// Sizes in map units (about 2 m each), for the indoor map's building-sized view.
const HALLWAY_WIDTH = 0.25;
const DOOR_RADIUS = 0.2;
const ROOM_FONT = 0.7;
const HIGHLIGHT_FONT = 1.3;
const CONNECTOR_SIZE = 0.9;

type IndoorLayerProps = {
  poiId: string;
  level: string;
  /** Rooms whose numbers stand out: the destination, or a room the walk starts in. */
  highlightRooms?: string[];
};

/**
 * One floor of one building: hallways (with the short spurs to doors and stairs) as thin lines,
 * each door as a dot with its room number, and stairs/elevators as lettered squares. Drawn over
 * the building's outline and under the route. No room walls: the import does not emit them yet.
 */
export function IndoorLayer({ poiId, level, highlightRooms = [] }: IndoorLayerProps) {
  const theme = useTheme();
  const nodes = INDOOR_NODES.filter((node) => node.poiId === poiId && node.level === level);
  const onFloor = (id: string) => {
    const node = NODE_BY_ID.get(id);
    return node?.poiId === poiId && node.level === level;
  };

  return (
    <G>
      {/* An open area's line-of-sight mesh is how routes cross it, not something to draw. */}
      {INDOOR_EDGES.filter(
        (edge) => !edge.area && onFloor(edge.fromNodeId) && onFloor(edge.toNodeId)
      ).map((edge) => {
        const from = projectCoordinate(NODE_BY_ID.get(edge.fromNodeId)!.coordinate);
        const to = projectCoordinate(NODE_BY_ID.get(edge.toNodeId)!.coordinate);
        return (
          <Line
            key={edge.id}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={theme.text}
            strokeOpacity={0.35}
            strokeWidth={HALLWAY_WIDTH}
            strokeLinecap="round"
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
      {nodes
        .filter((node) => node.room)
        .map((node) => {
          const { x, y } = projectCoordinate(node.coordinate);
          const highlighted = highlightRooms.includes(node.room!);
          return (
            <G key={node.id}>
              <Circle
                cx={x}
                cy={y}
                r={highlighted ? DOOR_RADIUS * 2 : DOOR_RADIUS}
                fill={highlighted ? ROUTE_COLORS.destination : theme.text}
                fillOpacity={highlighted ? 1 : 0.6}
              />
              <Text
                x={x}
                y={y - (highlighted ? 0.8 : 0.4)}
                fontSize={highlighted ? HIGHLIGHT_FONT : ROOM_FONT}
                fontWeight={highlighted ? 'bold' : 'normal'}
                textAnchor="middle"
                fill={theme.text}
                fillOpacity={highlighted ? 1 : 0.7}>
                {node.room}
              </Text>
            </G>
          );
        })}
    </G>
  );
}
