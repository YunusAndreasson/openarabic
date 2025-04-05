import { useMemo } from 'react';

import type { WeeklyProgressData, GraphPaths, GraphProcessedPoint } from '@/types/vocabulary.types';

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
  // Consolidate all calculations into a single useMemo
  return useMemo(() => {
    // Default values for empty or single point data
    const maxValue = Math.max(5, ...data.map(d => d.wordsLearned));
    const points: GraphProcessedPoint[] = [];
    let areaPath = '';
    let linePath = '';

    // If no data or single point, create a flat line at 0
    if (data.length <= 1) {
      // Create points at 0 height
      const y = graphHeight;
      points.push(
        { x: 0, y, value: 0, label: 'Day 1' },
        { x: graphWidth / 2, y, value: 0, label: 'Day 2' },
        { x: graphWidth, y, value: 0, label: 'Day 3' }
      );

      // Create flat line paths
      areaPath = `M 0 ${y} L ${graphWidth} ${y} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`;
      linePath = `M 0 ${y} L ${graphWidth} ${y}`;

      return {
        points,
        areaPath,
        linePath,
        totalWordsLearned: data.length === 1 ? data[0].wordsLearned : 0,
        dailyAverage: data.length === 1 ? data[0].wordsLearned : 0,
        maxValue,
      };
    }

    // Process multiple data points
    const xStep = graphWidth / (data.length - 1);
    data.forEach((item, index) => {
      const x = index * xStep;
      const y = graphHeight - (item.wordsLearned / maxValue) * graphHeight;
      points.push({
        x,
        y,
        value: item.wordsLearned,
        label: item.date,
      });
    });

    // Generate smooth curve paths using cubic bezier curves

    // Start path with a move to the first point
    linePath = `M ${points[0].x} ${points[0].y}`;
    areaPath = `M ${points[0].x} ${points[0].y}`;

    // For each segment between points, create a smooth curve
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      // Calculate control points for smooth curve
      // Control points are positioned at 1/3 and 2/3 along the x-distance between points
      const xDiff = next.x - current.x;
      const cp1x = current.x + xDiff / 3;
      const cp2x = current.x + (xDiff * 2) / 3;

      // Keep control points at the same y-level as their anchor points
      // This creates a smooth, natural curve
      const cp1y = current.y;
      const cp2y = next.y;

      // Add cubic bezier curve segment to the path
      linePath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
      areaPath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
    }

    // Complete the area path by adding lines to the bottom corners and back to start
    const lastPoint = points[points.length - 1];
    areaPath += ` L ${lastPoint.x} ${graphHeight} L ${points[0].x} ${graphHeight} Z`;

    // Calculate statistics
    const totalWordsLearned = data.reduce((sum, item) => sum + item.wordsLearned, 0);
    const dailyAverage = totalWordsLearned / data.length;

    return {
      points,
      areaPath,
      linePath,
      totalWordsLearned,
      dailyAverage,
      maxValue,
    };
  }, [data, graphWidth, graphHeight]);
}
