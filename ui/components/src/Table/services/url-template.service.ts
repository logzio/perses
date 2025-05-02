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
  
    result = result.replace(/\${__field\.name}/g, columnName || '');
  
    result = result.replace(/\${__value\.text}/g, cellValue !== null && cellValue !== undefined ? String(cellValue) : '');
  
    result = result.replace(/\${__data\.fields\.([^}]+)}/g, (match, fieldName) => {
      let value;
      try {
        const parts = fieldName.split('.');
        let current = rowData;
  
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
  