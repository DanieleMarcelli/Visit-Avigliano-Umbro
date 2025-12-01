import { HeroContent } from '../types';

const HERO_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv';

export const DEFAULT_HERO_CONTENT: HeroContent = {
  backgroundUrl: 'https://images.unsplash.com/photo-1505764706515-aa95265c5abc?q=80&w=1920&auto=format&fit=crop',
  eyebrow: 'UMBRIA',
  title: 'Avigliano Umbro',
  description: 'Scopri borghi, tradizioni e natura autentica nel cuore verde d\'Italia.',
  primaryCta: 'Scopri gli eventi',
  secondaryCta: 'Itinerario'
};

const FIELD_MAP: Record<string, keyof HeroContent> = {
  hero_bg: 'backgroundUrl',
  hero_background: 'backgroundUrl',
  hero_backgroundurl: 'backgroundUrl',
  hero_eyebrow: 'eyebrow',
  hero_tagline: 'eyebrow',
  hero_title: 'title',
  hero_text: 'title',
  hero_description: 'description',
  hero_desc: 'description',
  hero_cta_primary: 'primaryCta',
  hero_cta: 'primaryCta',
  hero_cta_secondary: 'secondaryCta',
  hero_cta_alt: 'secondaryCta'
};

const CSV_LINE_SPLIT = /\r?\n/;

const trimQuotes = (value: string) => value.replace(/^"|"$/g, '').trim();

const parseHeroRow = (csvText: string): Partial<HeroContent> => {
  const rows = csvText.split(CSV_LINE_SPLIT).filter(Boolean);
  if (rows.length < 2) return {};

  const headerCells = rows[0].split(',').map(trimQuotes);
  const valueCells = rows[1].split(',').map(trimQuotes);

  return headerCells.reduce<Partial<HeroContent>>((acc, rawKey, index) => {
    const mappedKey = FIELD_MAP[rawKey.toLowerCase()];
    if (!mappedKey) return acc;

    const value = valueCells[index];
    if (!value) return acc;

    if (mappedKey === 'backgroundUrl') {
      return { ...acc, [mappedKey]: value.replace(/"/g, '').trim() };
    }

    return { ...acc, [mappedKey]: value };
  }, {});
};

export const fetchHeroContent = async (): Promise<HeroContent> => {
  try {
    const response = await fetch(HERO_CSV_URL);
    if (!response.ok) {
      console.warn('Impossibile caricare il CSV dell\'hero:', response.statusText);
      return DEFAULT_HERO_CONTENT;
    }

    const csvText = await response.text();
    const parsed = parseHeroRow(csvText);

    return { ...DEFAULT_HERO_CONTENT, ...parsed };
  } catch (error) {
    console.error('Errore nel recupero dell\'hero dal CSV:', error);
    return DEFAULT_HERO_CONTENT;
  }
};
