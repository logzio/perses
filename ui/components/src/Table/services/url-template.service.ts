// Copyright 2025 The Perses Authors
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

/**
 * Replaces cell-specific variables in URL templates
 * Processes patterns like ${__field.name}, ${__value.text}, and ${__data.fields.fieldName}
 *
 * @param urlTemplate - The URL template string containing variables
 * @param columnName - The name of the column for ${__field.name}
 * @param cellValue - The value of the current cell for ${__value.text}
 * @param rowData - The row data for ${__data.fields.fieldName}
 * @returns The URL template with cell-specific variables replaced
 */
/* eslint-disable */
export const replaceCellVariables = (
    urlTemplate: string | undefined,
    columnName: string,
    cellValue: any,
    rowData: any
  ): string | undefined => {
    if (!urlTemplate) return undefined;
  
    let result = urlTemplate;
  
    // Replace ${__field.name} with column name
    result = result.replace(/\${__field\.name}/g, columnName || '');
  
    // Replace ${__value.text} with cell value
    result = result.replace(/\${__value\.text}/g, cellValue !== null && cellValue !== undefined ? String(cellValue) : '');
  
    // Replace ${__data.fields.fieldName} with row data values
    result = result.replace(/\${__data\.fields\.([^}]+)}/g, (match, fieldName) => {
      // Use safe property access pattern
      let value;
      try {
        // Split by dots to handle nested properties
        const parts = fieldName.split('.');
        let current = rowData;
  
        // Navigate through nested properties
        for (const part of parts) {
          if (current === undefined || current === null) {
            return '';
          }
          current = current[part];
        }
  
        value = current;
      } catch (e) {
        value = undefined;
      }
  
      return value !== null && value !== undefined ? String(value) : '';
    });
  
    return result;
  };
  