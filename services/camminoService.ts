import { trimCsvCell } from './sharedCsvUtils';

const CAMMINO_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv';

/**
 * CSV columns (order preserved from header):
 * "Tappa", "Da", "A", "Distanza (km)", "Dislivello (m)", "Tempo stimato",
 * "Difficoltà", "Comuni interessati", "Punti di interesse", "Descrizione", "Immagine"
 */
export type CamminoStage = {
  'Tappa': string;
  'Da': string;
  'A': string;
  'Distanza (km)': string;
  'Dislivello (m)': string;
  'Tempo stimato': string;
  'Difficoltà': string;
  'Comuni interessati': string;
  'Punti di interesse': string;
  'Descrizione': string;
  'Immagine': string;
};

export const CAMMINO_STAGE_FIELDS: Record<keyof CamminoStage, keyof CamminoStage> = {
  'Tappa': 'Tappa',
  'Da': 'Da',
  'A': 'A',
  'Distanza (km)': 'Distanza (km)',
  'Dislivello (m)': 'Dislivello (m)',
  'Tempo stimato': 'Tempo stimato',
  'Difficoltà': 'Difficoltà',
  'Comuni interessati': 'Comuni interessati',
  'Punti di interesse': 'Punti di interesse',
  'Descrizione': 'Descrizione',
  'Immagine': 'Immagine'
};

const CSV_LINE_SPLIT = /\r?\n/;

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }

  result.push(cell);
  return result.map(trimCsvCell);
};

const mapRowToStage = (header: string[], row: string[]): CamminoStage => {
  return header.reduce((acc, key, index) => {
    const typedKey = key as keyof CamminoStage;
    return {
      ...acc,
      [typedKey]: row[index] ?? ''
    };
  }, {} as CamminoStage);
};

export const fetchCamminoStages = async (): Promise<CamminoStage[]> => {
  const response = await fetch(CAMMINO_CSV_URL);
  if (!response.ok) {
    throw new Error(`Impossibile caricare il CSV del cammino: ${response.statusText}`);
  }

  const csvText = await response.text();
  const rows = csvText.split(CSV_LINE_SPLIT).filter(Boolean).map(parseCsvLine);
  if (rows.length < 2) return [];

  const header = rows[0];
  const dataRows = rows.slice(1);

  return dataRows.map(row => mapRowToStage(header, row));
};
