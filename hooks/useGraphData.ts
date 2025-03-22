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
  // Consolidate all calculations into a single useMemo
  return useMemo(() => {
    // Debug log the input data
    console.log(
      `useGraphData: processing ${data.length} data points, width=${graphWidth}, height=${graphHeight}`
    );
    if (data.length > 0) {
      console.log('First data point:', JSON.stringify(data[0]));
      console.log('Last data point:', JSON.stringify(data[data.length - 1]));
    }

    // Handle edge cases
    if (data.length <= 1) {
      const maxValue = 5;
      let points: GraphProcessedPoint[] = [];
      let areaPath = '';
      let linePath = '';

      if (data.length === 1) {
        const point: GraphProcessedPoint = {
          x: graphWidth / 2,
          y: graphHeight - (data[0].wordsLearned / maxValue) * graphHeight,
          value: data[0].wordsLearned,
          label: data[0].date,
        };
        points = [{ ...point, x: 0 }, point, { ...point, x: graphWidth }];
        areaPath = `M ${point.x} ${point.y} L ${point.x} ${graphHeight} L ${point.x} ${graphHeight} Z`;
        linePath = `M ${point.x - 10} ${point.y} L ${point.x + 10} ${point.y}`;
      }

      return {
        points,
        areaPath,
        linePath,
        totalWordsLearned: data.length === 1 ? data[0].wordsLearned : 0,
        dailyAverage: data.length === 1 ? data[0].wordsLearned : 0,
        maxValue,
      };
    }

    // Check if all values are zero - provide useful defaults
    const allZeroValues = data.every(item => item.wordsLearned === 0);
    if (allZeroValues) {
      console.log('All data points have zero wordsLearned values');
      const maxValue = 5; // Set a default scale

      // Generate default points (flat line at bottom)
      const points = data.map((item, index) => {
        const x = (index / (data.length - 1)) * graphWidth;
        const y = graphHeight; // At the bottom
        return {
          x,
          y,
          value: 0,
          label: item.date,
        } as GraphProcessedPoint;
      });

      // Create a flat line path
      const linePath = `M 0 ${graphHeight} L ${graphWidth} ${graphHeight}`;

      // Create a flat area path (zero height rectangle)
      const areaPath = `M 0 ${graphHeight} L ${graphWidth} ${graphHeight} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`;

      return {
        points,
        areaPath,
        linePath,
        totalWordsLearned: 0,
        dailyAverage: 0,
        maxValue,
      };
    }

    // Calculate max value - ensure we have a non-zero scale
    const maxWords = Math.max(...data.map(item => item.wordsLearned), 0);
    const maxValue = maxWords === 0 ? 5 : Math.ceil((maxWords * 1.05) / 5) * 5;

    console.log(`Max words learned: ${maxWords}, using scale: ${maxValue}`);

    // Calculate segment width for points
    const segmentWidth = graphWidth / (data.length - 1);

    // Generate points
    const points = data.map((item, index) => {
      const x = index * segmentWidth;
      const y = graphHeight - (item.wordsLearned / maxValue) * graphHeight;
      return {
        x,
        y,
        value: item.wordsLearned,
        label: item.date,
      } as GraphProcessedPoint;
    });

    // Generate both paths in a single pass
    let linePath = `M ${points[0].x} ${points[0].y}`;
    let areaPath = `M ${points[0].x} ${points[0].y}`;

    // Create smooth curve using cubic bezier curves
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      // Calculate control points for smooth curve
      const xDistance = next.x - current.x;
      const controlPointX1 = current.x + xDistance / 3;
      const controlPointY1 = current.y;
      const controlPointX2 = next.x - xDistance / 3;
      const controlPointY2 = next.y;

      // Add cubic bezier curve command (same for both paths)
      const bezierCommand = ` C ${controlPointX1} ${controlPointY1}, ${controlPointX2} ${controlPointY2}, ${next.x} ${next.y}`;
      linePath += bezierCommand;
      areaPath += bezierCommand;
    }

    // Complete the area path
    areaPath += ` L ${points[points.length - 1].x} ${graphHeight}`;
    areaPath += ` L ${points[0].x} ${graphHeight}`;
    areaPath += ' Z'; // Close the path

    // Calculate stats in the same pass
    const totalWordsLearned = data.reduce((sum, item) => sum + item.wordsLearned, 0);
    const dailyAverage = Math.round((totalWordsLearned / data.length) * 10) / 10;

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
