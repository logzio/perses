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

import { OptionsEditorControl, SettingsAutocomplete } from '@perses-dev/components';
import { CALCULATIONS_CONFIG, CalculationConfig, CalculationType } from '@perses-dev/core';
import { ReactElement } from 'react';

type AutocompleteCalculationOption = CalculationConfig & { id: CalculationType };
const CALC_OPTIONS: AutocompleteCalculationOption[] = Object.entries(CALCULATIONS_CONFIG).map(([id, config]) => {
  return {
    id: id as CalculationType,
    ...config,
  };
});

export interface CalculationSelectorProps {
  value: CalculationType;
  onChange: (unit: CalculationType) => void;
}

export function CalculationSelector({ value, onChange }: CalculationSelectorProps): ReactElement {
  const handleCalculationChange = (_: unknown, newValue: AutocompleteCalculationOption): void => {
    onChange(newValue.id);
  };

  const calcConfig = CALCULATIONS_CONFIG[value];

  return (
    <OptionsEditorControl
      label="Calculation"
      control={
        <SettingsAutocomplete
          value={{
            ...calcConfig,
            id: value,
          }}
          options={CALC_OPTIONS}
          onChange={handleCalculationChange}
          disableClearable
        />
      }
    />
  );
}
