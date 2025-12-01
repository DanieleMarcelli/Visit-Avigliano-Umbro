import { HeaderContent } from '../types';

const HEADER_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv';

export const DEFAULT_HEADER_CONTENT: HeaderContent = {
  logoUrl: 'https://picsum.photos/50/50',
  title: 'Visit Avigliano Umbro',
  subtitle: 'Portale Turistico',
  navTerritory: 'Territorio',
  navHistory: 'Storia',
  navContacts: 'Contatti',
  eventsLabel: 'Eventi',
  shareLabel: 'Condividi',
  languageLabel: 'Lingua'
};

const FIELD_MAP: Record<string, keyof HeaderContent> = {
  logourl: 'logoUrl',
  titolo: 'title',
  title: 'title',
  sottotitolo: 'subtitle',
  subtitle: 'subtitle',
  territorio: 'navTerritory',
  storia: 'navHistory',
  contatti: 'navContacts',
  eventi: 'eventsLabel',
  share: 'shareLabel',
  lingua: 'languageLabel'
};

const CSV_LINE_SPLIT = /\r?\n/;

const trimQuotes = (value: string) => value.replace(/^"|"$/g, '').trim();

const parseHeaderRow = (csvText: string): Partial<HeaderContent> => {
  const rows = csvText.split(CSV_LINE_SPLIT).filter(Boolean);
  if (rows.length < 2) return {};

  const headerCells = rows[0].split(',').map(trimQuotes);
  const valueCells = rows[1].split(',').map(trimQuotes);

  return headerCells.reduce<Partial<HeaderContent>>((acc, rawKey, index) => {
    const mappedKey = FIELD_MAP[rawKey.toLowerCase()];
    if (!mappedKey) return acc;

    const value = valueCells[index];
    if (!value) return acc;

    return { ...acc, [mappedKey]: value };
  }, {});
};

export const fetchHeaderContent = async (): Promise<HeaderContent> => {
  try {
    const response = await fetch(HEADER_CSV_URL);
    if (!response.ok) {
      console.warn('Impossibile caricare il CSV dell\'header:', response.statusText);
      return DEFAULT_HEADER_CONTENT;
    }

    const csvText = await response.text();
    const parsed = parseHeaderRow(csvText);

    return { ...DEFAULT_HEADER_CONTENT, ...parsed };
  } catch (error) {
    console.error('Errore nel recupero dell\'header dal CSV:', error);
    return DEFAULT_HEADER_CONTENT;
  }
};
