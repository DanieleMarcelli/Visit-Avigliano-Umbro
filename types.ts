export enum EventCategory {
  ALL = "Tutte le categorie",
  MUSIC = "Musica",
  THEATER = "Teatro",
  EXHIBITION = "Mostra",
  FESTIVAL = "Sagra",
  CLASSICAL = "Musica Classica"
}

export enum EventLocation {
  ALL = "Tutti i luoghi",
  TEATRO_COMUNALE = "Teatro Comunale",
  CHIESA_SANTA_RESTA = "Chiesa di Santa Restituta",
  CHIESA_DUNAROBBA = "Chiesa di Dunarobba",
  CHIESA_SISMANO = "Chiesa di Sismano",
  CHIESA_TOSCOLANO = "Chiesa di Toscolano",
  CHIESA_AVIGLIANO = "Chiesa di Avigliano Umbro",
  PIAZZA_DEL_MUNICIPIO = "Piazza del Municipio"
}

export interface EventItem {
  id: string;
  title: string;
  subtitle?: string; // e.g., "Stefano De Majo"
  description: string;
  date: Date;
  time: string;
  location: EventLocation;
  category: EventCategory;
  imageUrl: string;
  tags: string[];
}

export interface FilterState {
  search: string;
  month: string;
  category: EventCategory | string;
  location: EventLocation | string;
}