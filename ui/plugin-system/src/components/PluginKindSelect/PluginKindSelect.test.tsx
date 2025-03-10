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

import userEvent from '@testing-library/user-event';
import { RenderResult, screen } from '@testing-library/react';
import { renderWithContext } from '../../test';
import { PluginKindSelect, PluginKindSelectProps } from './PluginKindSelect';

describe('PluginKindSelect', () => {
  const renderComponent = (props: PluginKindSelectProps): RenderResult => {
    return renderWithContext(<PluginKindSelect {...props} />);
  };

  // Opens the select and waits for loading to finish (i.e. options to appear)
  const openSelect = async (): Promise<HTMLElement[]> => {
    const select = screen.getByRole('combobox');
    userEvent.click(select);
    const options = await screen.findAllByTestId('option');
    return options;
  };

  it('displays the list of plugins for a plugin type', async () => {
    renderComponent({
      pluginTypes: ['Panel'],
      value: undefined,
    });

    // Open the select and verify the list of options from the test plugin data
    const options = await openSelect();
    expect(options).toHaveLength(2);

    let option = screen.queryByRole('option', { name: 'Bert Panel 1' });
    expect(option).toBeInTheDocument();
    option = screen.queryByRole('option', { name: 'Bert Panel 2' });
    expect(option).toBeInTheDocument();
  });

  it('shows the correct selected value', async () => {
    renderComponent({
      pluginTypes: ['Variable'],
      value: { type: 'Variable', kind: 'ErnieVariable1' },
    });

    // Use findByRole to wait for loading to finish and selected value to appear
    const select = await screen.findByLabelText('Ernie Variable 1', { selector: '[role="combobox"]' });
    expect(select).toBeInTheDocument();
  });

  it('can select new value', async () => {
    let onChangeValue: string | undefined = undefined;
    const onChange = jest.fn((value) => {
      onChangeValue = value;
    });
    renderComponent({
      pluginTypes: ['Variable'],
      value: { type: 'Variable', kind: 'ErnieVariable1' },
      onChange,
    });

    await openSelect();
    const newOption = screen.getByRole('option', { name: 'Bert Variable' });
    userEvent.click(newOption);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChangeValue).toStrictEqual({ type: 'Variable', kind: 'BertVariable' });
  });
});
