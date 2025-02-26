/**
 * Creates an SVG path string for an arc representing progress
 * @param progress - Progress percentage (0-100)
 * @param radius - Radius of the arc
 * @returns SVG path string for the arc
 */
export const createArcPath = (progress: number, radius: number): string => {
  const center = radius;
  const startAngle = -Math.PI / 2; // Start from top
  const endAngle = startAngle + (2 * Math.PI * progress) / 100;

  const x1 = center + radius * Math.cos(startAngle);
  const y1 = center + radius * Math.sin(startAngle);
  const x2 = center + radius * Math.cos(endAngle);
  const y2 = center + radius * Math.sin(endAngle);

  const largeArcFlag = progress > 50 ? 1 : 0;

  return `M ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
};
