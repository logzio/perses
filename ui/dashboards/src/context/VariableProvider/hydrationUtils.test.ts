// Copyright 2024 The Perses Authors
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

import { DEFAULT_ALL_VALUE, VariableDefinition, ExternalVariableDefinition } from '@perses-dev/core';
import { hydrateVariableDefinitionStates } from './hydrationUtils';

describe('hydrateVariableStates', () => {
  test('normalizes single "all" value in an array', () => {
    const definitions: VariableDefinition[] = [
      {
        kind: 'ListVariable',
        spec: {
          name: 'instance',
          display: {
            name: 'Instance',
            hidden: false,
          },
          allowAllValue: true,
          allowMultiple: true,
          defaultValue: ['$__all'],
          plugin: {
            kind: 'PrometheusLabelValuesVariable',
            spec: {
              labelName: 'instance',
            },
          },
        },
      },
    ];
    const result = hydrateVariableDefinitionStates(definitions, {});
    expect(result?.get({ name: 'instance' })?.value).toEqual(DEFAULT_ALL_VALUE);
  });
  test('external definitions overridden and overriding', () => {
    const definitions: VariableDefinition[] = [
      {
        kind: 'TextVariable',
        spec: {
          name: 'project_var',
          value: 'something',
        },
      },
      {
        kind: 'TextVariable',
        spec: {
          name: 'greetings',
          value: 'something',
        },
      },
    ];

    const externalDefinitions: ExternalVariableDefinition[] = [
      {
        source: 'project',
        definitions: [
          {
            kind: 'TextVariable',
            spec: {
              name: 'greetings',
              display: {
                name: 'Greetings(project)',
              },
              value: 'hello',
            },
          },
          {
            kind: 'TextVariable',
            spec: {
              name: 'project_var',
              value: 'something',
            },
          },
        ],
      },
      {
        source: 'global',
        definitions: [
          {
            kind: 'TextVariable',
            spec: {
              name: 'greetings',
              display: {
                name: 'Greetings(global)',
              },
              value: 'hello',
            },
          },
          {
            kind: 'TextVariable',
            spec: {
              name: 'global_var',
              value: 'global scope value',
            },
          },
        ],
      },
    ];

    const localStateResult = hydrateVariableDefinitionStates(definitions, {}, externalDefinitions);

    // Verify hydration of local variable state
    expect(localStateResult.get({ name: 'project_var' })).toEqual({
      value: 'something',
      loading: false,
      overriding: true,
      overridden: false,
    });
    expect(localStateResult.get({ name: 'greetings' })).toEqual({
      value: 'something',
      loading: false,
      overriding: true,
      overridden: false,
    });

    // Verify hydration of external variable state
    expect(localStateResult.get({ source: 'project', name: 'greetings' })).toEqual({
      value: 'hello',
      loading: false,
      overriding: true,
      overridden: true,
    });
    expect(localStateResult.get({ source: 'project', name: 'project_var' })).toEqual({
      value: 'something',
      loading: false,
      overriding: false,
      overridden: true,
    });
    expect(localStateResult.get({ source: 'global', name: 'greetings' })).toEqual({
      value: 'hello',
      loading: false,
      overriding: false,
      overridden: true,
    });
    expect(localStateResult.get({ source: 'global', name: 'global_var' })).toEqual({
      value: 'global scope value',
      loading: false,
      overriding: false,
      overridden: false,
    });
  });
  // LOGZ.IO CHANGE START:: APPZ-2108-renaming-account-breaks-dashboards

  test('uses defaultValue when initialValues is empty (simulates setVariableDefinitions re-hydration)', () => {
    const definitions: VariableDefinition[] = [
      {
        kind: 'ListVariable',
        spec: {
          name: 'datasource',
          display: { name: 'Datasource', hidden: false },
          allowAllValue: false,
          allowMultiple: false,
          defaultValue: 'prom-34',
          plugin: {
            kind: 'StaticListVariable',
            spec: { values: ['prom-12', 'prom-34'] },
          },
        },
      },
    ];

    const result = hydrateVariableDefinitionStates(definitions, {});
    expect(result.get({ name: 'datasource' })?.value).toEqual('prom-34');
  });

  test('initialValues override defaultValue when present', () => {
    const definitions: VariableDefinition[] = [
      {
        kind: 'ListVariable',
        spec: {
          name: 'datasource',
          display: { name: 'Datasource', hidden: false },
          allowAllValue: false,
          allowMultiple: false,
          defaultValue: 'prom-34',
          plugin: {
            kind: 'StaticListVariable',
            spec: { values: ['prom-12', 'prom-34'] },
          },
        },
      },
    ];

    const staleParams = { datasource: 'prom-12' };
    const result = hydrateVariableDefinitionStates(definitions, staleParams);
    expect(result.get({ name: 'datasource' })?.value).toEqual('prom-12');
  });
});
