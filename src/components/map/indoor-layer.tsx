import { Circle, G, Line } from 'react-native-svg';

import { projectCoordinate } from '@/components/map/projection';
import { INDOOR_EDGES, INDOOR_NODES } from '@/data/campus-indoor';
import { useTheme } from '@/hooks/use-theme';

const NODE_BY_ID = new Map(INDOOR_NODES.map((node) => [node.id, node]));

type IndoorLayerProps = { poiId: string; level: string };

/**
 * One floor of one building: its hallways (with the short spurs to doors and stairs) as thin
 * lines and each room's door as a dot. Drawn over the building's fill and under the route.
 * There are no room outlines, because the evacuation diagrams only give us hallways and doors.
 */
export function IndoorLayer({ poiId, level }: IndoorLayerProps) {
  const theme = useTheme();
  const onFloor = (id: string) => {
    const node = NODE_BY_ID.get(id);
    return node?.poiId === poiId && node.level === level;
  };

  return (
    <G>
      {INDOOR_EDGES.filter((edge) => onFloor(edge.fromNodeId) && onFloor(edge.toNodeId)).map((edge) => {
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
            strokeOpacity={0.55}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        );
      })}
      {INDOOR_NODES.filter((node) => node.room && node.poiId === poiId && node.level === level).map(
        (node) => {
          const { x, y } = projectCoordinate(node.coordinate);
          return <Circle key={node.id} cx={x} cy={y} r={1.6} fill={theme.text} fillOpacity={0.7} />;
        }
      )}
    </G>
  );
}
