import { ECharts as EChartsInstance } from 'echarts/core';
import { TimeSeriesMetadata } from '@perses-dev/core';

export interface NearbySeriesInfo {
  seriesIdx: number | null;
  datumIdx: number | null;
  seriesName: string;
  date: number;
  markerColor: string;
  x: number;
  y: number;
  formattedY: string;
  isClosestToCursor: boolean;
  isSelected: boolean;
  metadata?: TimeSeriesMetadata;
}

export type NearbySeriesArray = NearbySeriesInfo[];

export type Candidate = Omit<NearbySeriesInfo, 'isClosestToCursor' | 'seriesIdx' | 'datumIdx'> & {
  seriesIdx: number;
  datumIdx: number;
  visualY: number;
  distance: number;
};

export type CalculateVisualYForSeriesParams = {
  rawY: number;
  stackId?: string;
  stackTotals: Map<string, number>;
};

export type CalculateBarBandwidthParams = {
  timestampCenterX: number;
  prevTimestamp: number | undefined;
  nextTimestamp: number | undefined;
  chart: EChartsInstance;
  defaultBandwidth?: number;
};

export type CalculateBarSegmentBoundsParams = {
  timestampCenterX: number;
  bandwidth: number;
  seriesIdx: number;
  barSeriesOrder: number[];
};

export type BarSegmentBounds = {
  segLeft: number;
  segRight: number;
};

export type CalculateBarYBoundsParams = {
  visualY: number;
  rawY: number;
  isStacked: boolean;
};

export type BarYBounds = {
  base: number;
  lower: number;
  upper: number;
};
