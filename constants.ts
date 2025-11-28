import { EventItem, EventCategory, EventLocation } from './types';

export const EVENTS: EventItem[] = [
  {
    id: '1',
    title: "Da Bach a Bernstein",
    subtitle: "Flautista G.L. Petrucci - Pianista P. Pisa",
    description: "Un viaggio musicale straordinario. Esecuzione di brani classici rivisitati in chiave moderna con maestri d'eccezione.",
    date: new Date('2025-12-06'),
    time: "21:00",
    location: EventLocation.TEATRO_COMUNALE,
    category: EventCategory.CLASSICAL,
    imageUrl: "https://images.unsplash.com/photo-1552422535-c45813c61732?q=80&w=800&auto=format&fit=crop",
    tags: ["Concerto", "Duo", "Classica"]
  },
  {
    id: '2',
    title: "Coro di Clarinetti",
    subtitle: "Chiesa di Santa Restituta",
    description: "Suggestiva esibizione di ensemble di clarinetti nella splendida cornice della Chiesa Parrocchiale di Santa Restituta.",
    date: new Date('2025-12-07'),
    time: "17:00",
    location: EventLocation.CHIESA_SANTA_RESTA,
    category: EventCategory.CLASSICAL,
    imageUrl: "https://images.unsplash.com/photo-1573871666450-427771765c87?q=80&w=800&auto=format&fit=crop",
    tags: ["Ensemble", "Fiati"]
  },
  {
    id: '3',
    title: "Concerto Marea - Duo di Chitarre",
    subtitle: "Chiesa di Dunarobba",
    description: "Le armonie delle chitarre classiche risuonano a Dunarobba. Un evento imperdibile per gli amanti delle sei corde.",
    date: new Date('2025-12-13'),
    time: "21:00",
    location: EventLocation.CHIESA_DUNAROBBA,
    category: EventCategory.MUSIC,
    imageUrl: "https://images.unsplash.com/photo-1556449895-a33c9dba33dd?q=80&w=800&auto=format&fit=crop",
    tags: ["Chitarra", "Duo"]
  },
  {
    id: '4',
    title: "50° di Pasolini - Stefano De Majo",
    subtitle: "Spettacolo Teatrale",
    description: "Tributo a Pier Paolo Pasolini interpretato dal maestro Stefano De Majo. Un viaggio tra le parole e il pensiero del grande intellettuale.",
    date: new Date('2025-12-14'),
    time: "21:00",
    location: EventLocation.TEATRO_COMUNALE,
    category: EventCategory.THEATER,
    imageUrl: "https://images.unsplash.com/photo-1503095392237-595977092e08?q=80&w=800&auto=format&fit=crop",
    tags: ["Teatro", "Cultura"]
  },
  {
    id: '5',
    title: "New Time Sax Quartet",
    subtitle: "Quartetto di Sassofoni",
    description: "Quartetto di sassofoni che spazia dal classico al moderno, portando energia e ritmo al Teatro Comunale.",
    date: new Date('2025-12-20'),
    time: "21:00",
    location: EventLocation.TEATRO_COMUNALE,
    category: EventCategory.MUSIC,
    imageUrl: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?q=80&w=800&auto=format&fit=crop",
    tags: ["Jazz", "Sax"]
  },
  {
    id: '6',
    title: "Gruppo Nera Mar",
    subtitle: "Tradizione e Innovazione",
    description: "Tradizione e innovazione si incontrano in questa performance musicale coinvolgente.",
    date: new Date('2025-12-21'),
    time: "18:00",
    location: EventLocation.TEATRO_COMUNALE,
    category: EventCategory.MUSIC,
    imageUrl: "https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=800&auto=format&fit=crop",
    tags: ["Folk", "Umbria"]
  },
  {
    id: '7',
    title: "Concerto della SFAU",
    subtitle: "Società Filarmonica",
    description: "Il tradizionale concerto della Società Filarmonica di Avigliano Umbro per chiudere l'anno in musica.",
    date: new Date('2025-12-27'),
    time: "21:00",
    location: EventLocation.TEATRO_COMUNALE,
    category: EventCategory.CLASSICAL,
    imageUrl: "https://images.unsplash.com/photo-1563821731-9f9b5c234d3b?q=80&w=800&auto=format&fit=crop",
    tags: ["Orchestra", "Tradizione"]
  },
  {
    id: '8',
    title: "Duo Onofri",
    subtitle: "Chiesa di Toscolano",
    description: "Un intimo concerto tra le mura della splendida frazione di Toscolano.",
    date: new Date('2025-12-28'),
    time: "18:30",
    location: EventLocation.CHIESA_TOSCOLANO,
    category: EventCategory.MUSIC,
    imageUrl: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=800&auto=format&fit=crop",
    tags: ["Violino", "Classica"]
  },
  {
    id: '9',
    title: "Nicolò Lauteri",
    subtitle: "Chiesa di Sismano",
    description: "Recital solista di pianoforte nella suggestiva cornice della Chiesa di Sismano.",
    date: new Date('2026-01-03'),
    time: "21:00",
    location: EventLocation.CHIESA_SISMANO,
    category: EventCategory.CLASSICAL,
    imageUrl: "https://images.unsplash.com/photo-1552422535-c45813c61732?q=80&w=800&auto=format&fit=crop",
    tags: ["Piano", "Recital"]
  },
  {
    id: '10',
    title: "Adriano Pimpolari",
    subtitle: "Teatro Comunale",
    description: "Concerto solista al Teatro Comunale. Un pomeriggio all'insegna del talento.",
    date: new Date('2026-01-04'),
    time: "18:30",
    location: EventLocation.TEATRO_COMUNALE,
    category: EventCategory.MUSIC,
    imageUrl: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=800&auto=format&fit=crop",
    tags: ["Musica", "Solo"]
  },
   {
    id: '11',
    title: "La favola di Natale",
    subtitle: "di Giovannino Guareschi",
    description: "Con Pino Menzolini (voce recitante) e Federico Gili (fisarmonica). Un racconto emozionante per celebrare l'Epifania.",
    date: new Date('2026-01-05'),
    time: "17:30",
    location: EventLocation.TEATRO_COMUNALE,
    category: EventCategory.THEATER,
    imageUrl: "https://images.unsplash.com/photo-1607627000458-217e7bb52382?q=80&w=800&auto=format&fit=crop",
    tags: ["Famiglia", "Narrazione"]
  },
  {
    id: '12',
    title: "Corale Castiglione",
    subtitle: "Chiesa di Avigliano Umbro",
    description: "La potenza dell'armonia corale risuona nella Chiesa di Avigliano. Un repertorio sacro e profano.",
    date: new Date('2026-01-10'),
    time: "21:00",
    location: EventLocation.CHIESA_AVIGLIANO,
    category: EventCategory.CLASSICAL,
    imageUrl: "https://images.unsplash.com/photo-1525926477800-7a3be5800fcb?q=80&w=800&auto=format&fit=crop",
    tags: ["Coro", "Sacro"]
  },
  {
    id: '13',
    title: "Scuola Comunale di Musica",
    subtitle: "Saggio e Concerto",
    description: "I talenti della Scuola Comunale di Musica si esibiscono al Teatro Comunale.",
    date: new Date('2026-01-11'),
    time: "17:30",
    location: EventLocation.TEATRO_COMUNALE,
    category: EventCategory.MUSIC,
    imageUrl: "https://images.unsplash.com/photo-1514119412350-a174d90cb931?q=80&w=800&auto=format&fit=crop",
    tags: ["Scuola", "Giovani"]
  },
  {
    id: '14',
    title: "Ottoni Amerini",
    subtitle: "Ensemble di Ottoni",
    description: "Ensemble di ottoni che propone un repertorio brillante e maestoso.",
    date: new Date('2026-01-17'),
    time: "21:00",
    location: EventLocation.TEATRO_COMUNALE,
    category: EventCategory.CLASSICAL,
    imageUrl: "https://images.unsplash.com/photo-1576435728678-35d016118064?q=80&w=800&auto=format&fit=crop",
    tags: ["Brass", "Ottoni"]
  },
  {
    id: '15',
    title: "Sunrise Orchestra",
    subtitle: "Orchestra Sinfonica",
    description: "Orchestra lirico-sinfonica per una serata di grandi arrangiamenti.",
    date: new Date('2026-01-18'),
    time: "18:00",
    location: EventLocation.TEATRO_COMUNALE,
    category: EventCategory.CLASSICAL,
    imageUrl: "https://images.unsplash.com/photo-1465847899078-b413929f7120?q=80&w=800&auto=format&fit=crop",
    tags: ["Sinfonica", "Orchestra"]
  },
  {
    id: '16',
    title: "Nouveau Ensemble - Tributo a Battiato",
    subtitle: "Omaggio al Maestro",
    description: "Un omaggio sentito e raffinato al Maestro Franco Battiato e alla sua poetica senza tempo.",
    date: new Date('2026-01-24'),
    time: "21:00",
    location: EventLocation.TEATRO_COMUNALE,
    category: EventCategory.MUSIC,
    imageUrl: "https://images.unsplash.com/photo-1499364615650-ec387c133026?q=80&w=800&auto=format&fit=crop",
    tags: ["Tributo", "Pop"]
  },
  {
    id: '17',
    title: "Smoothless 3",
    subtitle: "Jazz e Soul",
    description: "Jazz, soul e contaminazioni moderne chiudono la rassegna di gennaio.",
    date: new Date('2026-01-31'),
    time: "21:00",
    location: EventLocation.TEATRO_COMUNALE,
    category: EventCategory.MUSIC,
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop",
    tags: ["Jazz", "Soul"]
  }
];

export const MONTHS = [
  "Tutti i mesi",
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];