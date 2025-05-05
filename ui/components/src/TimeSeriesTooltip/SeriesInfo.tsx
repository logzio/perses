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

import { Box } from '@mui/material';
import { ReactElement } from 'react';
import { SeriesMarker } from './SeriesMarker';
import { SeriesLabelsStack } from './SeriesLabelsStack';
import { TOOLTIP_LABELS_MAX_WIDTH, EMPHASIZED_SERIES_DESCRIPTION, NEARBY_SERIES_DESCRIPTION } from './tooltip-model';

export interface SeriesInfoProps {
  seriesName: string;
  y: number;
  formattedY: string;
  markerColor: string;
  totalSeries: number;
  isSelected: boolean;
  emphasizeText?: boolean;
  wrapLabels?: boolean;
  onSelected?: () => void;
}

export function SeriesInfo(props: SeriesInfoProps): ReactElement {
  const {
    seriesName,
    formattedY,
    markerColor,
    totalSeries,
    emphasizeText = false,
    wrapLabels = true,
    isSelected,
    onSelected,
  } = props;

  // metric __name__ comes before opening curly brace, ignore if not populated
  // ex with metric name: node_load15{env="demo",job="node"}
  // ex without metric name: {env="demo",job="node"}
  const splitName = seriesName.split('{');
  const seriesLabels = splitName[1] ?? seriesName;

  // remove curly braces that wrap labels
  const formattedSeriesLabels = seriesLabels.replace(/[{}]/g, '');

  // determine whether to show labels on separate lines
  const splitLabels = formattedSeriesLabels.split(',');
  if (totalSeries === 1 && splitLabels.length > 1) {
    const metricName = splitName[0] ? `${splitName[0]}:` : 'value:';
    return (
      <SeriesLabelsStack
        formattedY={formattedY}
        metricName={metricName}
        metricLabels={splitLabels}
        markerColor={markerColor}
      />
    );
  }

  // add space after commas so wrapLabels works
  const formattedSeriesInfo = seriesName.replace(/[,]/g, ', ');

  return (
    <Box
      onClick={onSelected}
      sx={(theme) => ({
        display: 'flex',
        justifyContent: 'space-between',
        padding: theme.spacing(0.5, 1),
        borderRadius: 1,
        paddingTop: 0.5,
        background: isSelected ? theme.palette.grey['100'] : undefined,
        cursor: onSelected ? 'pointer' : 'default',
        transition: 'background 0.2s ease-in-out',

        ':hover': {
          background: onSelected ? theme.palette.grey['200'] : undefined,
        },
      })}
    >
      <Box sx={{ maxWidth: '520px' }}>
        <SeriesMarker markerColor={markerColor} sx={{ marginTop: 0.25 }} />
        <Box
          component="span"
          sx={(theme) => ({
            display: 'inline-block',
            width: 'calc(100% - 20px)',
            minWidth: 150,
            maxWidth: TOOLTIP_LABELS_MAX_WIDTH,
            overflow: 'hidden',
            color: theme.palette.text.primary,
            fontWeight: emphasizeText ? theme.typography.fontWeightBold : theme.typography.fontWeightRegular,
            textOverflow: 'ellipsis',
            whiteSpace: wrapLabels ? 'normal' : 'nowrap',
          })}
          aria-label={emphasizeText ? EMPHASIZED_SERIES_DESCRIPTION : NEARBY_SERIES_DESCRIPTION}
        >
          {formattedSeriesInfo}
        </Box>
      </Box>
      <Box
        sx={(theme) => ({
          paddingLeft: 1.5,
          textAlign: 'right',
          verticalAlign: 'top',
          fontWeight: emphasizeText ? theme.typography.fontWeightBold : theme.typography.fontWeightRegular,
        })}
      >
        {formattedY}
      </Box>
    </Box>
  );
}
