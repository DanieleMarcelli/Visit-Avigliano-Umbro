export const trimCsvCell = (value: string = ''): string => value.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
