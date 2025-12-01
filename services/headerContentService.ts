import { HeaderContent } from '../types';

const HEADER_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv';

export const DEFAULT_HEADER_CONTENT: HeaderContent = {
  logoUrl: 'https://picsum.photos/50/50',
  title: 'Visit Avigliano Umbro',
  subtitle: 'Portale Turistico',
  navLake: 'Il Lago',
  navVillages: 'Borghi',
  navEvents: 'Eventi',
  navTrail: 'Il Cammino',
  shareLabel: 'Condividi',
  languageLabel: 'Lingua'
};

const ID_TO_FIELD: Record<string, keyof HeaderContent> = {
  nav_logo: 'logoUrl',
  nav_title: 'title',
  nav_subtitle: 'subtitle',
  nav_lago: 'navLake',
  nav_borghi: 'navVillages',
  nav_eventi: 'navEvents',
  nav_cammino: 'navTrail',
  nav_share: 'shareLabel',
  nav_lang: 'languageLabel'
};

const formatImageUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/\/d\/(.+?)\/|id=(.+?)&|id=(.+?)$/);
    const id = idMatch ? (idMatch[1] || idMatch[2] || idMatch[3]) : null;
    if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  }
  return url;
};

const parseHeaderContent = (csvText: string): Partial<HeaderContent> => {
  const rows = csvText.split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) return {};

  return rows.slice(1).reduce<Partial<HeaderContent>>((acc, row) => {
    const cells = row.split(',');
    const id = cells[0]?.replace(/^"|"$/g, '').trim();
    const textValue = cells[1]?.replace(/^"|"$/g, '').trim();
    const imageValue = cells[2]?.replace(/^"|"$/g, '').trim();

    const mappedField = id ? ID_TO_FIELD[id.toLowerCase()] : undefined;
    if (!mappedField) return acc;

    if (mappedField === 'logoUrl' && imageValue) {
      return { ...acc, logoUrl: formatImageUrl(imageValue) };
    }

    if (textValue) {
      return { ...acc, [mappedField]: textValue };
    }

    return acc;
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
    const parsed = parseHeaderContent(csvText);

    return { ...DEFAULT_HEADER_CONTENT, ...parsed };
  } catch (error) {
    console.error('Errore nel recupero dell\'header dal CSV:', error);
    return DEFAULT_HEADER_CONTENT;
  }
};
