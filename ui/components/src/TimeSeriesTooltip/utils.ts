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
import { Theme } from '@mui/material';
import {
  CursorCoordinates,
  CursorData,
  TOOLTIP_MAX_WIDTH,
  TOOLTIP_MAX_HEIGHT,
  TOOLTIP_MIN_WIDTH,
  TOOLTIP_BG_COLOR_FALLBACK,
  TOOLTIP_PADDING,
} from './tooltip-model';

/**
 * Determine position of tooltip depending on chart dimensions and the number of focused series
 */
export function assembleTransform(
  mousePos: CursorData['coords'],
  pinnedPos: CursorCoordinates | null,
  tooltipHeight: number,
  tooltipWidth: number,
  containerElement?: Element | null
): string | undefined {
  if (mousePos === null) {
    return undefined;
  }

  const cursorPaddingX = 32;
  const cursorPaddingY = 16;

  if (pinnedPos !== null) {
    mousePos = pinnedPos;
  }

  if (mousePos.plotCanvas.x === undefined) return undefined;

  let x = mousePos.page.x + cursorPaddingX; // Default to right side of the cursor
  let y = mousePos.page.y + cursorPaddingY;

  // If containerElement is defined, adjust coordinates relative to the container
  if (containerElement) {
    const containerRect = containerElement.getBoundingClientRect();
    x = x - containerRect.left + containerElement.scrollLeft;
    y = y - containerRect.top + containerElement.scrollTop;

    // Ensure tooltip does not go out of the container's bottom
    const containerBottom = containerRect.top + containerElement.scrollHeight;
    if (y + tooltipHeight > containerBottom) {
      y = Math.max(containerBottom - tooltipHeight - cursorPaddingY, TOOLTIP_PADDING / 2);
    }
  } else {
    // Ensure tooltip does not go out of the screen on the bottom
    if (y + tooltipHeight > window.innerHeight + window.scrollY) {
      y = Math.max(window.innerHeight + window.scrollY - tooltipHeight - cursorPaddingY, TOOLTIP_PADDING / 2);
    }
  }

  // Ensure tooltip does not go out of the screen on the right
  if (x + tooltipWidth > window.innerWidth) {
    x = mousePos.page.x - tooltipWidth - cursorPaddingX; // Move to the left of the cursor
  }

  // Ensure tooltip does not go out of the screen on the left
  if (x < cursorPaddingX) {
    x = cursorPaddingX;
  }

  // Ensure tooltip does not go out of the screen on the top
  if (y < TOOLTIP_PADDING / 2) {
    y = TOOLTIP_PADDING / 2;
  }

  return `translate3d(${x}px, ${y}px, 0)`;
}

/**
 * Helper for tooltip positioning styles
 */
export function getTooltipStyles(
  theme: Theme,
  pinnedPos: CursorCoordinates | null,
  maxHeight?: number
): Record<string, unknown> {
  const adjustedMaxHeight = maxHeight ? maxHeight - TOOLTIP_PADDING : undefined;
  return {
    minWidth: TOOLTIP_MIN_WIDTH,
    maxWidth: TOOLTIP_MAX_WIDTH,
    maxHeight: adjustedMaxHeight ?? TOOLTIP_MAX_HEIGHT,
    padding: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: '6px',
    fontSize: '11px',
    visibility: 'visible',
    opacity: 1,
    transition: 'all 0.1s ease-out',
    // LOGZ.IO CHANGE START:: Drilldown panel [APPZ-377]
    backgroundColor: theme.palette.background.paper ?? TOOLTIP_BG_COLOR_FALLBACK,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.grey['200']}`,
    boxShadow: theme.shadows[4],
    // LOGZ.IO CHANGE END:: Drilldown panel [APPZ-377]
    // LOGZ.IO CHANGE START:: Custom Drilldown preview [APPZ-709]
    // Ensure pinned tooltip shows on top of all content, especially in panel editor
    zIndex: pinnedPos !== null ? theme.zIndex.modal + 1 : theme.zIndex.tooltip,
    // LOGZ.IO CHANGE END:: Custom Drilldown preview [APPZ-709]
    overflow: 'hidden',
    '&:hover': {
      overflowY: 'auto',
    },
  };
}

// LOGZ.IO CHANGE START:: Tooltip is not behaving correctly [APPZ-1418]

export function getPixelXFromGrid(chart: EChartsInstance, xValue: number): number {
  const pixelValue = chart.convertToPixel('grid', [xValue, 0]);
  return pixelValue[0] ?? 0;
}

export function calculateVisualYForSeries({
  rawY,
  stackId,
  stackTotals,
}: {
  rawY: number;
  stackId?: string;
  stackTotals: Map<string, number>;
}): number {
  if (stackId === undefined) {
    return rawY;
  }

  const currentStackTotal = stackTotals.get(stackId) ?? 0;
  const visualY = currentStackTotal + rawY;
  stackTotals.set(stackId, visualY);

  return visualY;
}

export function calculateBarBandwidth({
  timestampCenterX,
  prevTimestamp,
  nextTimestamp,
  chart,
  defaultBandwidth = 20,
}: {
  timestampCenterX: number;
  prevTimestamp: number | undefined;
  nextTimestamp: number | undefined;
  chart: EChartsInstance;
  defaultBandwidth?: number;
}): number {
  const hasLeftNeighbor = prevTimestamp !== undefined;
  const hasRightNeighbor = nextTimestamp !== undefined;

  if (!hasLeftNeighbor && !hasRightNeighbor) {
    return defaultBandwidth;
  }

  let leftTimestampX: number | null = null;
  let rightTimestampX: number | null = null;

  if (hasLeftNeighbor) {
    leftTimestampX = getPixelXFromGrid(chart, prevTimestamp);
  }

  if (hasRightNeighbor) {
    rightTimestampX = getPixelXFromGrid(chart, nextTimestamp);
  }

  if (leftTimestampX !== null && rightTimestampX !== null) {
    const distanceToLeft = Math.abs(timestampCenterX - leftTimestampX);
    const distanceToRight = Math.abs(rightTimestampX - timestampCenterX);
    return Math.min(distanceToLeft, distanceToRight);
  }

  if (leftTimestampX !== null) {
    return Math.abs(timestampCenterX - leftTimestampX);
  }

  if (rightTimestampX !== null) {
    return Math.abs(rightTimestampX - timestampCenterX);
  }

  return defaultBandwidth;
}

export function calculateBarSegmentBounds({
  timestampCenterX,
  bandwidth,
  seriesIdx,
  barSeriesOrder,
}: {
  timestampCenterX: number;
  bandwidth: number;
  seriesIdx: number;
  barSeriesOrder: number[];
}): { segLeft: number; segRight: number } {
  const groupLeft = timestampCenterX - bandwidth / 2;
  const barsInGroup = barSeriesOrder.length || 1;
  const idxInBars = Math.max(0, barSeriesOrder.indexOf(seriesIdx));
  const segmentWidth = bandwidth / barsInGroup;
  const segLeft = groupLeft + idxInBars * segmentWidth;
  const segRight = segLeft + segmentWidth;

  return { segLeft, segRight };
}

export function calculateBarYBounds({
  visualY,
  rawY,
  isStacked,
}: {
  visualY: number;
  rawY: number;
  isStacked: boolean;
}): {
  base: number;
  lower: number;
  upper: number;
} {
  const base = isStacked ? visualY - rawY : 0;
  const lower = Math.min(base, visualY);
  const upper = Math.max(base, visualY);

  return { base, lower, upper };
}
// LOGZ.IO CHANGE END:: Tooltip is not behaving correctly [APPZ-1418]
