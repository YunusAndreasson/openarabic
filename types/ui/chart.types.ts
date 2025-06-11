export interface DataPoint {
  x: number;
  y: number;
  value: string;
  label: string;
  data?: any;
}

export interface LegendItemProps {
  type: 'area' | 'bar' | 'dot' | 'line';
  color: string;
  label: string;
}
