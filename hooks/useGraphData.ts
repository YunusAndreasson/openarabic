import { useMemo } from 'react';

import type { WeeklyProgressData, GraphPaths, GraphProcessedPoint } from '@/types/vocabulary.types';

/**
 * Creates a flat line graph for empty or single point data
 */
function createFlatLine(
  graphWidth: number,
  graphHeight: number,
  data: WeeklyProgressData[]
): GraphPaths {
  const y = graphHeight;
  const points: GraphProcessedPoint[] = [
    { x: 0, y, value: 0, label: 'Day 1' },
    { x: graphWidth / 2, y, value: 0, label: 'Day 2' },
    { x: graphWidth, y, value: 0, label: 'Day 3' },
  ];

  return {
    points,
    areaPath: `M 0 ${y} L ${graphWidth} ${y} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`,
    linePath: `M 0 ${y} L ${graphWidth} ${y}`,
    totalWordsLearned: data.length === 1 && data[0] ? data[0].wordsLearned : 0,
    dailyAverage: data.length === 1 && data[0] ? data[0].wordsLearned : 0,
    maxValue: Math.max(5, ...data.map(d => d.wordsLearned)),
  };
}

/**
 * Generates curve paths from points
 */
function generatePaths(
  points: GraphProcessedPoint[],
  graphHeight: number
): { areaPath: string; linePath: string } {
  let areaPath = '';
  let linePath = '';

  if (points.length > 0) {
    const firstPoint = points[0];
    if (firstPoint) {
      linePath = `M ${firstPoint.x} ${firstPoint.y}`;
      areaPath = `M ${firstPoint.x} ${firstPoint.y}`;

      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];

        if (current && next) {
          const xDiff = next.x - current.x;
          const cp1x = current.x + xDiff / 3;
          const cp2x = current.x + (xDiff * 2) / 3;
          const cp1y = current.y;
          const cp2y = next.y;

          const curve = ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
          linePath += curve;
          areaPath += curve;
        }
      }

      const lastPoint = points[points.length - 1];
      if (lastPoint) {
        areaPath += ` L ${lastPoint.x} ${graphHeight} L ${firstPoint.x} ${graphHeight} Z`;
      }
    }
  }

  return { areaPath, linePath };
}

/**
 * Hook to process graph data and generate path strings for SVG
 * @param data - Raw data points to display on the graph
 * @param graphWidth - Width of the graph in pixels
 * @param graphHeight - Height of the graph in pixels
 * @returns Processed graph data including points and paths
 */
export function useGraphData(
  data: WeeklyProgressData[],
  graphWidth: number,
  graphHeight: number
): GraphPaths {
  return useMemo(() => {
    const maxValue = Math.max(5, ...data.map(d => d.wordsLearned));

    if (data.length <= 1) {
      return createFlatLine(graphWidth, graphHeight, data);
    }

    const points: GraphProcessedPoint[] = data.map((item, index) => ({
      x: (index * graphWidth) / (data.length - 1),
      y: graphHeight - (item.wordsLearned / maxValue) * graphHeight,
      value: item.wordsLearned,
      label: item.date,
    }));

    const { areaPath, linePath } = generatePaths(points, graphHeight);
    const totalWordsLearned = data.reduce((sum, item) => sum + item.wordsLearned, 0);

    return {
      points,
      areaPath,
      linePath,
      totalWordsLearned,
      dailyAverage: totalWordsLearned / data.length,
      maxValue,
    };
  }, [data, graphWidth, graphHeight]);
}
