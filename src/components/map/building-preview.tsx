import { StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { projectPath } from '@/components/map/projection';
import { POI_CATEGORY_COLORS } from '@/components/map/poi-marker';
import type { PointOfInterest } from '@/types/map';

// Empty space around the shape, as a fraction of its larger dimension, so the
// building reads as isolated on the screen instead of touching the edges.
const MARGIN_FRACTION = 0.18;

type BuildingPreviewProps = {
  poi: PointOfInterest;
  height?: number;
};

/**
 * The building's footprint on its own -- same shape and same projection as on
 * the campus map, so proportions match -- fitted into a fixed-height box with
 * margins. Placeholder for the future indoor-navigation view of the building.
 * Renders nothing for POIs without a footprint.
 */
export function BuildingPreview({ poi, height = 260 }: BuildingPreviewProps) {
  if (!poi.footprint || poi.footprint.length < 3) {
    return null;
  }

  const points = projectPath(poi.footprint);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX;
  const shapeHeight = Math.max(...ys) - minY;
  const margin = Math.max(width, shapeHeight) * MARGIN_FRACTION;
  const color = POI_CATEGORY_COLORS[poi.category];

  return (
    <View style={[styles.container, { height }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`${minX - margin} ${minY - margin} ${width + margin * 2} ${shapeHeight + margin * 2}`}
        preserveAspectRatio="xMidYMid meet">
        <Polygon
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={color}
          fillOpacity={0.35}
          stroke={color}
          strokeWidth={Math.max(width, shapeHeight) * 0.012}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    paddingHorizontal: 24,
  },
});
