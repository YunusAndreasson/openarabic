import { useMemo } from 'react';
import { WeeklyProgressData, GraphPaths, GraphProcessedPoint } from '@/types/vocabulary.types';

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
  // Y-axis calculations
  const maxValue = useMemo(() => {
    if (data.length === 0) return 5;
    const max = Math.max(...data.map(item => item.wordsLearned), 5); // Minimum of 5 for scale
    // Add minimal 5% padding to the top to prevent cutting off high values
    return Math.ceil((max * 1.05) / 5) * 5; // Round up to nearest 5 with minimal padding
  }, [data]);

  // Create points for the graph
  const points = useMemo<GraphProcessedPoint[]>(() => {
    if (data.length <= 1) {
      // Handle edge case of 0 or 1 data points
      if (data.length === 0) return [];

      // If only one data point, create a flat line
      const point: GraphProcessedPoint = {
        x: graphWidth / 2,
        y: graphHeight - (data[0].wordsLearned / maxValue) * graphHeight,
        value: data[0].wordsLearned,
        label: data[0].date,
      };
      return [{ ...point, x: 0 }, point, { ...point, x: graphWidth }];
    }

    const segmentWidth = graphWidth / (data.length - 1);

    return data.map((item, index) => {
      const x = index * segmentWidth;
      // Invert Y coordinate (0 is at top in canvas)
      const y = graphHeight - (item.wordsLearned / maxValue) * graphHeight;
      return {
        x,
        y,
        value: item.wordsLearned,
        label: item.date,
      } as GraphProcessedPoint;
    });
  }, [data, graphWidth, graphHeight, maxValue]);

  // Create the path for the area under the curve
  const areaPath = useMemo(() => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) {
      // Handle single point case
      const p = points[0];
      return `M ${p.x} ${p.y} L ${p.x} ${graphHeight} L ${p.x} ${graphHeight} Z`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;

    // Create smooth curve using cubic bezier curves
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      // Calculate horizontal distance between points
      const xDistance = next.x - current.x;

      // Calculate control points for smooth curve
      // Using 1/3 ratio for control points creates a natural curve
      const controlPointX1 = current.x + xDistance / 3;
      const controlPointY1 = current.y;
      const controlPointX2 = next.x - xDistance / 3;
      const controlPointY2 = next.y;

      // Add cubic bezier curve command
      path += ` C ${controlPointX1} ${controlPointY1}, ${controlPointX2} ${controlPointY2}, ${next.x} ${next.y}`;
    }

    // Complete the path by going down to the bottom and back to start
    path += ` L ${points[points.length - 1].x} ${graphHeight}`;
    path += ` L ${points[0].x} ${graphHeight}`;
    path += ' Z'; // Close the path

    return path;
  }, [points, graphHeight]);

  // Create the line path with smooth curves
  const linePath = useMemo(() => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) {
      // Handle single point case
      const p = points[0];
      return `M ${p.x - 10} ${p.y} L ${p.x + 10} ${p.y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;

    // Create smooth curve using cubic bezier curves
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      // Calculate horizontal distance between points
      const xDistance = next.x - current.x;

      // Calculate control points for smooth curve
      // Using 1/3 ratio for control points creates a natural curve
      const controlPointX1 = current.x + xDistance / 3;
      const controlPointY1 = current.y;
      const controlPointX2 = next.x - xDistance / 3;
      const controlPointY2 = next.y;

      // Add cubic bezier curve command
      path += ` C ${controlPointX1} ${controlPointY1}, ${controlPointX2} ${controlPointY2}, ${next.x} ${next.y}`;
    }

    return path;
  }, [points]);

  // Calculate total words learned
  const totalWordsLearned = useMemo(() => {
    return data.reduce((sum, item) => sum + item.wordsLearned, 0);
  }, [data]);

  // Calculate daily average
  const dailyAverage = useMemo(() => {
    if (data.length === 0) return 0;
    const average = totalWordsLearned / data.length;
    return Math.round(average * 10) / 10; // Round to 1 decimal place
  }, [totalWordsLearned, data.length]);

  return {
    points,
    areaPath,
    linePath,
    totalWordsLearned,
    dailyAverage,
    maxValue,
  };
}
