// Copyright 2023 The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ECharts as EChartsInstance } from 'echarts/core';
import { LineSeriesOption } from 'echarts/charts';
import { formatValue, TimeSeriesValueTuple, FormatOptions, TimeSeries, TimeSeriesMetadata } from '@perses-dev/core';
import { EChartsDataFormat, OPTIMIZED_MODE_SERIES_LIMIT, TimeChartSeriesMapping, DatapointInfo } from '../model';
import { batchDispatchNearbySeriesActions, getPointInGrid, getClosestTimestamp } from '../utils';
import { CursorCoordinates, CursorData, EMPTY_TOOLTIP_DATA } from './tooltip-model';

// LOGZ.IO CHANGE START:: Tooltip is not behaving correctly [APPZ-1418]

// increase multipliers to show more series in tooltip
export const INCREASE_NEARBY_SERIES_MULTIPLIER = 1; // adjusts how many series show in tooltip (higher == more series shown)
export const DYNAMIC_NEARBY_SERIES_MULTIPLIER = 10; // used for adjustment after series number divisor
export const SHOW_FEWER_SERIES_LIMIT = 5;

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
type Candidate = {
  seriesIdx: number;
  datumIdx: number;
  seriesName: string;
  date: number;
  x: number;
  y: number;
  formattedY: string;
  markerColor: string;
  metadata?: TimeSeriesMetadata;
  isSelected: boolean;
  visualY: number;
  distance: number;
};

function getPixelXFromGrid(chart: EChartsInstance, xValue: number): number {
  const pixelValue = chart.convertToPixel('grid', [xValue, 0]);
  return pixelValue[0] ?? 0;
}

/**
 * Returns formatted series data for the points that are close to the user's cursor.
 * Adjust xBuffer and yBuffer to increase or decrease number of series shown.
 */
export function checkforNearbyTimeSeries(
  data: TimeSeries[],
  seriesMapping: TimeChartSeriesMapping,
  pointInGrid: number[],
  yBuffer: number,
  chart: EChartsInstance,
  mousePixelX?: number,
  seriesMetadata?: TimeSeriesMetadata[],
  format?: FormatOptions,
  selectedSeriesIdx?: number | null
): NearbySeriesArray {
  const currentNearbySeriesData: NearbySeriesArray = [];
  const cursorX: number | null = pointInGrid[0] ?? null;
  const cursorY: number | null = pointInGrid[1] ?? null;

  if (cursorX === null || cursorY === null) return currentNearbySeriesData;

  if (chart.dispatchAction === undefined) return currentNearbySeriesData;

  if (!Array.isArray(data)) return currentNearbySeriesData;
  const nearbySeriesIndexes: number[] = [];
  const emphasizedSeriesIndexes: number[] = [];
  const nonEmphasizedSeriesIndexes: number[] = [];
  const emphasizedDatapoints: DatapointInfo[] = [];
  const duplicateDatapoints: DatapointInfo[] = [];

  const totalSeries = data.length;

  const yValueCounts: Map<number, number> = new Map();
  const stackTotals: Map<string, number> = new Map();
  const candidates: Candidate[] = [];

  // Only need to loop through first dataset source since getCommonTimeScale ensures xAxis timestamps are consistent
  const firstTimeSeriesValues = data[0]?.values;
  const closestTimestamp = getClosestTimestamp(firstTimeSeriesValues, cursorX);

  if (closestTimestamp === null) {
    return EMPTY_TOOLTIP_DATA;
  }

  const barSeriesOrder: number[] = seriesMapping.reduce((acc: number[], series, idx) => {
    const seriesType = (series as { type?: string }).type;
    if (seriesType === 'bar') acc.push(idx);
    return acc;
  }, []);

  for (let seriesIdx = 0; seriesIdx < totalSeries; seriesIdx++) {
    const currentSeries = seriesMapping[seriesIdx];
    const currentMetadata = seriesMetadata?.[seriesIdx];

    if (!currentSeries) break;

    const currentDataset = totalSeries > 0 ? data[seriesIdx] : null;
    if (!currentDataset) break;

    const currentDatasetValues: TimeSeriesValueTuple[] = currentDataset.values;
    if (currentDatasetValues === undefined || !Array.isArray(currentDatasetValues)) break;
    const lineSeries = currentSeries as LineSeriesOption;
    const seriesType = currentSeries.type ?? 'line';
    const currentSeriesName = lineSeries.name ? lineSeries.name.toString() : '';
    const markerColor = lineSeries.color ?? '#000';
    if (Array.isArray(data)) {
      for (let datumIdx = 0; datumIdx < currentDatasetValues.length; datumIdx++) {
        const nearbyTimeSeries = currentDatasetValues[datumIdx];
        if (nearbyTimeSeries === undefined || !Array.isArray(nearbyTimeSeries)) break;

        const xValue = nearbyTimeSeries[0];
        const yValue = nearbyTimeSeries[1];

        if (yValue !== undefined && yValue !== null) {
          if (seriesType === 'bar') {
            if (closestTimestamp === xValue && mousePixelX !== undefined) {
              const stackId = lineSeries.stack;
              const rawY = yValue;
              let visualY: number;
              if (stackId !== undefined) {
                const currentStackTotal = stackTotals.get(stackId) ?? 0;
                visualY = currentStackTotal + rawY;
                stackTotals.set(stackId, visualY);
              } else {
                visualY = rawY;
              }
              const prevTimestamp = firstTimeSeriesValues?.[datumIdx - 1]?.[0];
              const nextTimestamp = firstTimeSeriesValues?.[datumIdx + 1]?.[0];
              const timestampCenterX = getPixelXFromGrid(chart, xValue);
              let leftTimestampX: number | null = null;
              let rightTimestampX: number | null = null;
              if (prevTimestamp !== undefined) {
                leftTimestampX = getPixelXFromGrid(chart, prevTimestamp);
              }
              if (nextTimestamp !== undefined) {
                rightTimestampX = getPixelXFromGrid(chart, nextTimestamp);
              }
              let bandwidth = 20;
              if (leftTimestampX !== null && rightTimestampX !== null) {
                bandwidth = Math.min(
                  Math.abs(timestampCenterX - leftTimestampX),
                  Math.abs(rightTimestampX - timestampCenterX)
                );
              } else if (leftTimestampX !== null) {
                bandwidth = Math.abs(timestampCenterX - leftTimestampX);
              } else if (rightTimestampX !== null) {
                bandwidth = Math.abs(rightTimestampX - timestampCenterX);
              }
              const groupLeft = timestampCenterX - bandwidth / 2;
              const barsInGroup = barSeriesOrder.length || 1;
              const idxInBars = Math.max(0, barSeriesOrder.indexOf(seriesIdx));
              const segmentWidth = bandwidth / barsInGroup;
              const segLeft = groupLeft + idxInBars * segmentWidth;
              const segRight = segLeft + segmentWidth;
              const base = stackId !== undefined ? visualY - rawY : 0;
              const lower = Math.min(base, visualY);
              const upper = Math.max(base, visualY);
              const isHoveringXSegment = mousePixelX >= segLeft && mousePixelX <= segRight;
              const isHoveringYBounds = stackId !== undefined ? cursorY >= lower && cursorY <= upper : true;
              if (isHoveringXSegment && isHoveringYBounds) {
                nearbySeriesIndexes.push(seriesIdx);
                const isSelected = selectedSeriesIdx === seriesIdx;
                const formattedY = formatValue(rawY, format);
                const distance = Math.abs((segLeft + segRight) / 2 - mousePixelX);
                candidates.push({
                  seriesIdx,
                  datumIdx,
                  seriesName: currentSeriesName,
                  date: closestTimestamp,
                  x: xValue,
                  y: rawY,
                  formattedY,
                  markerColor: markerColor.toString(),
                  metadata: currentMetadata,
                  isSelected,
                  visualY,
                  distance,
                });
              }
            }
          } else {
            if (closestTimestamp === xValue) {
              const stackId = lineSeries.stack;
              let visualY: number;
              if (stackId !== undefined) {
                const currentStackTotal = stackTotals.get(stackId) ?? 0;
                visualY = currentStackTotal + yValue;
                stackTotals.set(stackId, visualY);
              } else {
                visualY = yValue;
              }
              const distance = Math.abs(visualY - cursorY);
              if (distance <= yBuffer) {
                nearbySeriesIndexes.push(seriesIdx);
                const isSelected = selectedSeriesIdx === seriesIdx;
                const formattedY = formatValue(yValue, format);
                candidates.push({
                  seriesIdx,
                  datumIdx,
                  seriesName: currentSeriesName,
                  date: closestTimestamp,
                  x: xValue,
                  y: yValue,
                  formattedY,
                  markerColor: markerColor.toString(),
                  metadata: currentMetadata,
                  isSelected,
                  visualY,
                  distance,
                });
              }
            }
          }
        }
      }
    }
  }

  if (candidates.length === 0) {
    batchDispatchNearbySeriesActions(
      chart,
      nearbySeriesIndexes,
      emphasizedSeriesIndexes,
      nonEmphasizedSeriesIndexes,
      emphasizedDatapoints,
      duplicateDatapoints
    );
    return currentNearbySeriesData;
  }

  let winnerIdx = 0;
  let minDistance = candidates[0]!.distance;
  for (let i = 1; i < candidates.length; i++) {
    const distance = candidates[i]!.distance;
    if (distance < minDistance) {
      minDistance = distance;
      winnerIdx = i;
    }
  }
  const winner = candidates[winnerIdx]!;

  for (const candidate of candidates) {
    const isClosestToCursor = candidate === winner;
    if (isClosestToCursor) {
      emphasizedSeriesIndexes.push(candidate.seriesIdx);
      const duplicateValuesCount = yValueCounts.get(candidate.visualY) ?? 0;
      yValueCounts.set(candidate.visualY, duplicateValuesCount + 1);
      if (duplicateValuesCount > 0) {
        duplicateDatapoints.push({
          seriesIndex: candidate.seriesIdx,
          dataIndex: candidate.datumIdx,
          seriesName: candidate.seriesName,
          yValue: candidate.visualY,
        });
      }
      emphasizedDatapoints.push({
        seriesIndex: candidate.seriesIdx,
        dataIndex: candidate.datumIdx,
        seriesName: candidate.seriesName,
        yValue: candidate.visualY,
      });
    } else {
      nonEmphasizedSeriesIndexes.push(candidate.seriesIdx);
    }
    currentNearbySeriesData.push({
      seriesIdx: candidate.seriesIdx,
      datumIdx: candidate.datumIdx,
      seriesName: candidate.seriesName,
      date: candidate.date,
      x: candidate.x,
      y: candidate.y,
      formattedY: candidate.formattedY,
      markerColor: candidate.markerColor,
      isClosestToCursor,
      metadata: candidate.metadata,
      isSelected: candidate.isSelected,
    });
  }

  // LOGZ.IO CHANGE END:: Tooltip is not behaving correctly [APPZ-1418]

  batchDispatchNearbySeriesActions(
    chart,
    nearbySeriesIndexes,
    emphasizedSeriesIndexes,
    nonEmphasizedSeriesIndexes,
    emphasizedDatapoints,
    duplicateDatapoints
  );

  return currentNearbySeriesData;
}

/**
 * [DEPRECATED] Returns formatted series data for the points that are close to the user's cursor
 * Adjust yBuffer to increase or decrease number of series shown
 */
export function legacyCheckforNearbySeries(
  data: EChartsDataFormat,
  pointInGrid: number[],
  yBuffer: number,
  chart?: EChartsInstance,
  format?: FormatOptions
): NearbySeriesArray {
  const currentNearbySeriesData: NearbySeriesArray = [];
  const cursorX: number | null = pointInGrid[0] ?? null;
  const cursorY: number | null = pointInGrid[1] ?? null;

  if (cursorX === null || cursorY === null) {
    return currentNearbySeriesData;
  }

  const nearbySeriesIndexes: number[] = [];
  const emphasizedSeriesIndexes: number[] = [];
  const nonEmphasizedSeriesIndexes: number[] = [];
  const totalSeries = data.timeSeries.length;
  if (Array.isArray(data.xAxis) && Array.isArray(data.timeSeries)) {
    for (let seriesIdx = 0; seriesIdx < totalSeries; seriesIdx++) {
      const currentSeries = data.timeSeries[seriesIdx];
      if (currentSeries === undefined) break;
      if (currentNearbySeriesData.length >= OPTIMIZED_MODE_SERIES_LIMIT) break;

      const currentSeriesName = currentSeries.name ? currentSeries.name.toString() : '';
      const markerColor = currentSeries.color ?? '#000';
      if (Array.isArray(currentSeries.data)) {
        for (let datumIdx = 0; datumIdx < currentSeries.data.length; datumIdx++) {
          const xValue = data.xAxis[datumIdx] ?? 0;
          const yValue = currentSeries.data[datumIdx];
          // ensure null values not displayed in tooltip
          if (yValue !== undefined && yValue !== null && cursorX === datumIdx) {
            if (yValue !== '-' && cursorY <= yValue + yBuffer && cursorY >= yValue - yBuffer) {
              // show fewer bold series in tooltip when many total series
              const minPercentRange = totalSeries > SHOW_FEWER_SERIES_LIMIT ? 2 : 5;
              const percentRangeToCheck = Math.max(minPercentRange, 100 / totalSeries);
              const isClosestToCursor = isWithinPercentageRange({
                valueToCheck: cursorY,
                baseValue: yValue,
                percentage: percentRangeToCheck,
              });
              if (isClosestToCursor) {
                emphasizedSeriesIndexes.push(seriesIdx);
              } else {
                nonEmphasizedSeriesIndexes.push(seriesIdx);
                // ensure series not close to cursor are not highlighted
                if (chart?.dispatchAction !== undefined) {
                  chart.dispatchAction({
                    type: 'downplay',
                    seriesIndex: seriesIdx,
                  });
                }
              }

              // determine whether to convert timestamp to ms, see: https://stackoverflow.com/a/23982005/17575201
              const xValueMilliSeconds = xValue > 99999999999 ? xValue : xValue * 1000;
              const formattedY = formatValue(yValue, format);
              currentNearbySeriesData.push({
                seriesIdx: seriesIdx,
                datumIdx: datumIdx,
                seriesName: currentSeriesName,
                date: xValueMilliSeconds,
                x: xValue,
                y: yValue,
                formattedY: formattedY,
                markerColor: markerColor.toString(),
                isClosestToCursor,
                isSelected: false, // LOGZ.IO CHANGE:: Drilldown panel [APPZ-377]
              });
              nearbySeriesIndexes.push(seriesIdx);
            }
          }
        }
      }
    }
  }
  if (chart?.dispatchAction !== undefined) {
    // Clears emphasis state of all lines that are not emphasized.
    // Emphasized is a subset of just the nearby series that are closest to cursor.
    chart.dispatchAction({
      type: 'downplay',
      seriesIndex: nonEmphasizedSeriesIndexes,
    });

    // https://echarts.apache.org/en/api.html#action.highlight
    if (emphasizedSeriesIndexes.length > 0) {
      // Fadeout opacity of all series not closest to cursor.
      chart.dispatchAction({
        type: 'highlight',
        seriesIndex: emphasizedSeriesIndexes,
        notBlur: false, // ensure blur IS triggered, this is default but setting so it is explicit
        escapeConnect: true, // shared crosshair should not emphasize series on adjacent charts
      });
    } else {
      // When no emphasized series with bold text, notBlur allows opacity fadeout to not trigger.
      chart.dispatchAction({
        type: 'highlight',
        seriesIndex: nearbySeriesIndexes,
        notBlur: true, // do not trigger blur state when cursor is not immediately close to any series
        escapeConnect: true, // shared crosshair should not emphasize series on adjacent charts
      });
    }
  }

  return currentNearbySeriesData;
}

/**
 * Uses mouse position to determine whether user is hovering over a chart canvas
 * If yes, convert from pixel values to logical cartesian coordinates and return all nearby series
 */
export function getNearbySeriesData({
  mousePos,
  pinnedPos,
  data,
  seriesMapping,
  chart,
  format,
  showAllSeries = false,
  // LOGZ.IO CHANGE START:: Drilldown panel [APPZ-377]
  seriesMetadata,
  selectedSeriesIdx,
  // LOGZ.IO CHANGE END:: Drilldown panel [APPZ-377]
}: {
  mousePos: CursorData['coords'];
  pinnedPos: CursorCoordinates | null;
  data: TimeSeries[];
  seriesMapping: TimeChartSeriesMapping;
  chart?: EChartsInstance;
  format?: FormatOptions;
  showAllSeries?: boolean;
  // LOGZ.IO CHANGE START:: Drilldown panel [APPZ-377]
  seriesMetadata?: TimeSeriesMetadata[];
  selectedSeriesIdx?: number | null;
  // LOGZ.IO CHANGE END:: Drilldown panel [APPZ-377]
}): NearbySeriesArray {
  if (chart === undefined || mousePos === null) return EMPTY_TOOLTIP_DATA;

  // prevents multiple tooltips showing from adjacent charts unless tooltip is pinned
  let cursorTargetMatchesChart = false;
  if (mousePos.target !== null) {
    const currentParent = (<HTMLElement>mousePos.target).parentElement;
    if (currentParent !== null) {
      const currentGrandparent = currentParent.parentElement;
      if (currentGrandparent !== null) {
        const chartDom = chart.getDom();
        if (chartDom === currentGrandparent) {
          cursorTargetMatchesChart = true;
        }
      }
    }
  }

  // allows moving cursor inside tooltip without it fading away
  if (pinnedPos !== null) {
    mousePos = pinnedPos;
    cursorTargetMatchesChart = true;
  }

  if (cursorTargetMatchesChart === false || data === null || chart['_model'] === undefined) return EMPTY_TOOLTIP_DATA;

  // mousemove position undefined when not hovering over chart canvas
  if (mousePos.plotCanvas.x === undefined || mousePos.plotCanvas.y === undefined) return EMPTY_TOOLTIP_DATA;

  const pointInGrid = getPointInGrid(mousePos.plotCanvas.x, mousePos.plotCanvas.y, chart);
  if (pointInGrid !== null) {
    const chartModel = chart['_model'];
    const yInterval = chartModel.getComponent('yAxis').axis.scale._interval;
    const totalSeries = data.length;
    const yBuffer = getYBuffer({ yInterval, totalSeries, showAllSeries });
    return checkforNearbyTimeSeries(
      data,
      seriesMapping,
      pointInGrid,
      yBuffer,
      chart,
      // LOGZ.IO CHANGE START:: Drilldown panel [APPZ-377]
      mousePos.plotCanvas.x,
      seriesMetadata,
      format,
      selectedSeriesIdx
      // LOGZ.IO CHANGE END:: Drilldown panel [APPZ-377]
    );
  }

  // no nearby series found
  return EMPTY_TOOLTIP_DATA;
}

/**
 * [DEPRECATED] Uses mouse position to determine whether user is hovering over a chart canvas
 * If yes, convert from pixel values to logical cartesian coordinates and return all nearby series
 */
export function legacyGetNearbySeriesData({
  mousePos,
  pinnedPos,
  chartData,
  chart,
  format,
  showAllSeries = false,
}: {
  mousePos: CursorData['coords'];
  pinnedPos: CursorCoordinates | null;
  chartData: EChartsDataFormat;
  chart?: EChartsInstance;
  format?: FormatOptions;
  showAllSeries?: boolean;
}): NearbySeriesArray {
  if (chart === undefined || mousePos === null) return [];

  // prevents multiple tooltips showing from adjacent charts unless tooltip is pinned
  let cursorTargetMatchesChart = false;
  if (mousePos.target !== null) {
    const currentParent = (<HTMLElement>mousePos.target).parentElement;
    if (currentParent !== null) {
      const currentGrandparent = currentParent.parentElement;
      if (currentGrandparent !== null) {
        const chartDom = chart.getDom();
        if (chartDom === currentGrandparent) {
          cursorTargetMatchesChart = true;
        }
      }
    }
  }

  // allows moving cursor inside tooltip without it fading away
  if (pinnedPos !== null) {
    mousePos = pinnedPos;
    cursorTargetMatchesChart = true;
  }

  if (cursorTargetMatchesChart === false) return [];

  if (chart['_model'] === undefined) return [];
  const chartModel = chart['_model'];
  const yInterval = chartModel.getComponent('yAxis').axis.scale._interval;
  const totalSeries = chartData.timeSeries.length;
  const yBuffer = getYBuffer({ yInterval, totalSeries, showAllSeries });
  const pointInPixel = [mousePos.plotCanvas.x ?? 0, mousePos.plotCanvas.y ?? 0];
  if (chart.containPixel('grid', pointInPixel)) {
    const pointInGrid = chart.convertFromPixel('grid', pointInPixel);
    if (pointInGrid[0] !== undefined && pointInGrid[1] !== undefined) {
      return legacyCheckforNearbySeries(chartData, pointInGrid, yBuffer, chart, format);
    }
  }

  return [];
}

/*
 * Check if two numbers are within a specified percentage range
 */
export function isWithinPercentageRange({
  valueToCheck,
  baseValue,
  percentage,
}: {
  valueToCheck: number;
  baseValue: number;
  percentage: number;
}): boolean {
  const range = (percentage / 100) * baseValue;
  const lowerBound = baseValue - range;
  const upperBound = baseValue + range;
  return valueToCheck >= lowerBound && valueToCheck <= upperBound;
}

/*
 * Get range to check within for nearby series to show in tooltip.
 */
export function getYBuffer({
  yInterval,
  totalSeries,
  showAllSeries = false,
}: {
  yInterval: number;
  totalSeries: number;
  showAllSeries?: boolean;
}): number {
  if (showAllSeries) {
    return yInterval * 10; // roughly correlates with grid so entire canvas is searched
  }

  // never let nearby series range be less than roughly the size of a single tick
  const yBufferMin = yInterval * 0.3;

  // tooltip trigger area gets smaller with more series
  if (totalSeries > SHOW_FEWER_SERIES_LIMIT) {
    const adjustedBuffer = (yInterval * DYNAMIC_NEARBY_SERIES_MULTIPLIER) / totalSeries;
    return Math.max(yBufferMin, adjustedBuffer);
  }

  // increase multiplier to expand nearby series range
  return Math.max(yBufferMin, yInterval * INCREASE_NEARBY_SERIES_MULTIPLIER);
}
