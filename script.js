
import { GoogleGenAI } from "@google/genai";

// --- CONFIGURATION ---
// 1. LINK EVENTI
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=0&single=true&output=csv"; 

// 2. LINK CONTENUTI CMS
const CONTENT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv";

// --- DATI E COSTANTI ---
const EventCategory = {
    ALL: "Tutte le categorie",
    MUSIC: "Musica",
    THEATER: "Teatro",
    EXHIBITION: "Mostra",
    FESTIVAL: "Sagra",
    CLASSICAL: "Musica Classica",
    CONFERENCE: "Conferenze",
    BOOKS: "Presentazione Libri",
    KIDS: "Bambini e Famiglie",
    FOLK: "Feste Popolari",
    CULTURE: "Cultura"
};

const EventLocation = {
    ALL: "Tutti i luoghi",
    TEATRO_COMUNALE: "Teatro Comunale",
    CHIESA_SANTA_RESTA: "Chiesa di Santa Restituta",
    CHIESA_DUNAROBBA: "Chiesa di Dunarobba",
    CHIESA_SISMANO: "Chiesa di Sismano",
    CHIESA_TOSCOLANO: "Chiesa di Toscolano",
    CHIESA_AVIGLIANO: "Chiesa di Avigliano Umbro",
    PIAZZA_DEL_MUNICIPIO: "Piazza del Municipio"
};

const MONTHS = [
    "Tutti i mesi", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

// --- STATE ---
let events = [];
let chatHistory = [{ role: 'bot', text: "Ciao! Sono il tuo assistente virtuale per Avigliano Umbro. Cerchi un concerto o un evento teatrale?" }];
let filters = { search: '', month: 'Tutti i mesi', category: 'Tutte le categorie', location: 'Tutti i luoghi' };

// --- HELPER FUNCTIONS ---

/**
 * ROBUST GOOGLE DRIVE IMAGE FORMATTER
 * Detects Drive links and converts them to high-res thumbnails.
 */
function formatImageUrl(url) {
    if (!url) return ''; 
    if (url.includes('drive.google.com')) {
        const idMatch = url.match(/\/d\/(.+?)\/|id=(.+?)&|id=(.+?)$/);
        const id = idMatch ? (idMatch[1] || idMatch[2] || idMatch[3]) : null;
        if (id) {
            return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
        }
    }
    return url;
}

/**
 * Simple CSV Line Parser
 */
function parseCSVLine(text) {
    const result = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            result.push(cell.trim());
            cell = '';
        } else cell += char;
    }
    result.push(cell.trim());
    return result.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
}

// --- FUNCTIONS EXPOSED TO WINDOW ---

window.toggleMobileMenu = () => {
    const menu = document.getElementById('mobile-menu-overlay');
    menu.classList.toggle('hidden');
};

window.scrollToEvents = () => {
    document.getElementById('eventi-section').scrollIntoView({ behavior: 'smooth' });
};

window.toggleChat = () => {
    const win = document.getElementById('chat-window');
    const btn = document.getElementById('chat-toggle');
    const isHidden = win.classList.contains('hidden');

    if (isHidden) {
        win.classList.remove('hidden');
        btn.classList.add('bg-stone-800', 'text-white');
        btn.innerHTML = '<span>Chiudi Chat</span>';
    } else {
        win.classList.add('hidden');
        btn.classList.remove('bg-stone-800', 'text-white');
        btn.classList.add('bg-white', 'text-brand-900');
        btn.innerHTML = '<i data-lucide="sparkles" class="w-5 h-5 text-brand-gold"></i><span>Chiedi a Gemini</span>';
    }
    if (window.lucide) window.lucide.createIcons();
};

window.resetFilters = () => {
    filters = { search: '', month: 'Tutti i mesi', category: 'Tutte le categorie', location: 'Tutti i luoghi' };
    document.getElementById('search-input').value = '';
    document.getElementById('filter-month').value = 'Tutti i mesi';
    document.getElementById('filter-category').value = 'Tutte le categorie';
    document.getElementById('filter-location').value = 'Tutti i luoghi';
    renderEvents();
};

// --- MODAL LOGIC ---

window.openModal = (eventId) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const modal = document.getElementById('event-modal');
    
    // Populate Data
    document.getElementById('modal-img').src = event.imageUrl;
    document.getElementById('modal-category').innerText = event.category;
    document.getElementById('modal-title').innerText = event.title;
    document.getElementById('modal-subtitle').innerText = event.subtitle || '';
    
    // Date formatting
    const dateObj = new Date(event.date);
    const fullDate = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('modal-date').innerText = fullDate;
    
    document.getElementById('modal-time').innerText = event.time;
    document.getElementById('modal-location').innerText = event.location;
    document.getElementById('modal-desc').innerText = event.description;

    // Organizer
    const orgContainer = document.getElementById('modal-organizer-container');
    if (event.organizer) {
        document.getElementById('modal-organizer').innerText = `A cura di: ${event.organizer}`;
        orgContainer.classList.remove('hidden');
    } else {
        orgContainer.classList.add('hidden');
    }

    // Show Modal
    modal.classList.remove('hidden');
};

window.closeModal = () => {
    document.getElementById('event-modal').classList.add('hidden');
};

window.sendChatMessage = async () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    chatHistory.push({ role: 'user', text });
    renderChatMessages();
    input.value = '';

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        // Simplified prompt context with current event titles
        const eventContext = events.map(e => `${e.title} (${e.date})`).join(", ");
        const systemPrompt = `Sei l'assistente turistico di Avigliano Umbro. Ecco gli eventi in programma: ${eventContext}. Rispondi brevemente.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: text,
            config: { systemInstruction: systemPrompt }
        });
        chatHistory.push({ role: 'bot', text: response.text });
    } catch (e) {
        console.error(e);
        chatHistory.push({ role: 'bot', text: "Errore di connessione o API Key mancante." });
    }
    renderChatMessages();
};

// --- CORE LOGIC ---

// 1. CMS CONTENT LOADER
async function loadContentCMS() {
    if (!CONTENT_CSV_URL) return;

    try {
        const response = await fetch(CONTENT_CSV_URL);
        const text = await response.text();
        const rows = text.split('\n').filter(r => r.trim() !== '');
        
        rows.slice(1).forEach(row => {
            const cols = parseCSVLine(row);
            const id = cols[0];       
            const contentText = cols[1]; 
            const imageUrl = cols[2];    

            if (id) {
                const elements = document.querySelectorAll(`[data-content-id="${id}"]`);
                elements.forEach(element => {
                    if (contentText) {
                        element.tagName === 'INPUT' ? element.placeholder = contentText : element.innerHTML = contentText;
                    }
                    if (imageUrl) {
                        const formattedUrl = formatImageUrl(imageUrl);
                        element.tagName === 'IMG' ? element.src = formattedUrl : element.style.backgroundImage = `url('${formattedUrl}')`;
                    }
                });
            }
        });
        console.log("CMS Loaded");
    } catch (e) {
        console.error("CMS Error:", e);
    }
}

// 2. EVENTS LOADER (Strictly CSV)
async function fetchEventsFromSheet() {
    if (!SHEET_CSV_URL) return [];
    try {
        const response = await fetch(SHEET_CSV_URL);
        const data = await response.text();
        const rows = data.split('\n').filter(r => r.trim() !== '');
        
        const sheetEvents = rows.slice(1).map((row, index) => {
            const cols = parseCSVLine(row); 
            const rawImg = cols[7] || '';
            const formattedImg = formatImageUrl(rawImg) || 'https://picsum.photos/800/600';

            return {
                id: `evt-${index}`,
                date: cols[0] || new Date().toISOString().split('T')[0],
                time: cols[1] || '21:00',
                title: cols[2] || 'Evento',
                subtitle: cols[3] || '',
                description: cols[4] || '',
                location: cols[5] || 'Avigliano Umbro',
                category: cols[6] || 'Altro',
                imageUrl: formattedImg,
                organizer: cols[8] || '', 
                tags: ['Live']
            };
        });
        return sheetEvents;
    } catch (error) {
        console.error("Event Fetch Error:", error);
        return [];
    }
}

async function loadEvents() {
    events = await fetchEventsFromSheet();
}

function renderChatMessages() {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    chatHistory.forEach(msg => {
        const div = document.createElement('div');
        div.className = `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`;
        div.innerHTML = `
            <div class="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-brand-900 text-white rounded-br-none' : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none'}">
                ${msg.text}
            </div>
        `;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

function populateSelects() {
    const monthSelect = document.getElementById('filter-month');
    const catSelect = document.getElementById('filter-category');
    const locSelect = document.getElementById('filter-location');

    MONTHS.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.innerText = m;
        monthSelect.appendChild(opt);
    });

    Object.values(EventCategory).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.innerText = c;
        catSelect.appendChild(opt);
    });

    Object.values(EventLocation).forEach(l => {
        const opt = document.createElement('option');
        opt.value = l;
        opt.innerText = l;
        locSelect.appendChild(opt);
    });
}

/**
 * SMART RENDER: TOP 4 GRID + REST COMPACT
 */
function renderEvents() {
    const mainGrid = document.getElementById('events-main-grid');
    const futureList = document.getElementById('events-future-list');
    const countLabel = document.getElementById('results-count');
    const emptyState = document.getElementById('empty-state');
    const loader = document.getElementById('events-loader');
    const loadMoreContainer = document.getElementById('load-more-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    if(loader) loader.classList.add('hidden');

    mainGrid.innerHTML = '';
    futureList.innerHTML = ''; 

    // Date Logic
    const today = new Date();
    today.setHours(0,0,0,0);

    // Filter Logic
    let filtered = events.filter(e => {
        // A. REMOVE PAST EVENTS
        const eventDate = new Date(e.date);
        const eventMidnight = new Date(eventDate);
        eventMidnight.setHours(0,0,0,0);
        
        if (eventMidnight < today) return false;

        // B. STANDARD FILTERS
        const searchMatch = !filters.search || e.title.toLowerCase().includes(filters.search.toLowerCase()) || e.description.toLowerCase().includes(filters.search.toLowerCase());
        const catMatch = filters.category === EventCategory.ALL || e.category === filters.category;
        const locMatch = filters.location === EventLocation.ALL || e.location === filters.location;
        let monthMatch = true;
        if (filters.month !== MONTHS[0]) {
             if (!isNaN(eventDate.getTime())) {
                 const mName = eventDate.toLocaleString('it-IT', { month: 'long' });
                 const capMonth = mName.charAt(0).toUpperCase() + mName.slice(1);
                 monthMatch = capMonth === filters.month;
             }
        }
        return searchMatch && catMatch && locMatch && monthMatch;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));

    countLabel.innerText = `${filtered.length} eventi in programma`;

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        loadMoreContainer.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');

        // SPLIT: Top 4 vs Rest
        const mainEvents = filtered.slice(0, 4);
        const futureEvents = filtered.slice(4);

        // RENDER GRID (Main 4)
        mainEvents.forEach(event => {
            const dateObj = new Date(event.date);
            const day = !isNaN(dateObj) ? dateObj.getDate() : "?";
            const month = !isNaN(dateObj) ? dateObj.toLocaleString('it-IT', { month: 'short' }).toUpperCase() : "???";
            
            const cardHtml = `
                <div class="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-stone-200 flex flex-col h-full relative fade-in cursor-pointer hover:scale-[1.02] btn-open-modal" data-id="${event.id}">
                    <div class="relative aspect-[7/10] overflow-hidden bg-stone-100 border-b border-stone-100">
                        <img src="${event.imageUrl}" alt="${event.title}" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" onerror="this.src='https://picsum.photos/800/600'" />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                        <div class="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-brand-900 shadow-sm border border-stone-100">${event.category}</div>
                        <div class="absolute bottom-4 left-4 flex flex-col items-center justify-center w-12 h-14 bg-white/95 backdrop-blur-sm rounded-lg text-brand-900 shadow-lg border border-stone-100">
                            <span class="text-xl font-bold leading-none">${day}</span>
                            <span class="text-[10px] uppercase font-bold tracking-wider">${month}</span>
                        </div>
                    </div>
                    <div class="p-5 flex-1 flex flex-col">
                        <div class="mb-3">
                            <h3 class="text-xl font-bold text-stone-900 leading-tight group-hover:text-brand-800 transition-colors font-serif">${event.title}</h3>
                            ${event.subtitle ? `<p class="text-sm text-brand-800 font-medium mt-1">${event.subtitle}</p>` : ''}
                            ${event.organizer ? `<p class="text-xs text-stone-400 mt-2 italic flex items-center gap-1"><i data-lucide="users" class="w-3 h-3"></i> A cura di: ${event.organizer}</p>` : ''}
                        </div>
                        <div class="flex flex-wrap gap-y-2 gap-x-4 text-xs text-stone-500 mb-4 items-center">
                            <div class="flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3 text-brand-gold"></i> <span class="truncate max-w-[150px]">${event.location}</span></div>
                            <div class="flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3 text-brand-gold"></i> <span>${event.time}</span></div>
                        </div>
                        <div class="mt-auto pt-4 border-t border-stone-100 flex justify-between items-center">
                             <button class="text-brand-900 hover:text-brand-700 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors">
                                <i data-lucide="info" class="w-4 h-4"></i> Dettagli
                            </button>
                        </div>
                    </div>
                </div>
            `;
            mainGrid.insertAdjacentHTML('beforeend', cardHtml);
        });

        // RENDER COMPACT LIST (Rest) - UPDATED FOR VERTICAL THUMBNAIL (7:10)
        if (futureEvents.length > 0) {
            // Re-add header
            futureList.insertAdjacentHTML('beforeend', `
                 <div class="flex items-center gap-4 mb-6 mt-4">
                    <div class="h-px bg-stone-200 flex-1"></div>
                    <span class="text-sm font-bold text-stone-400 uppercase tracking-widest">Prossimi Appuntamenti</span>
                    <div class="h-px bg-stone-200 flex-1"></div>
                </div>
            `);

            futureEvents.forEach(event => {
                const dateObj = new Date(event.date);
                const fullDate = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

                const compactHtml = `
                    <div class="flex items-center gap-4 bg-white p-4 rounded-lg border border-stone-200 shadow-sm hover:shadow-md transition-all group cursor-pointer hover:border-brand-200 btn-open-modal" data-id="${event.id}">
                        <!-- VERTICAL THUMBNAIL (7:10 ratio) -->
                        <div class="w-20 aspect-[7/10] rounded-md overflow-hidden flex-shrink-0 bg-stone-100 shadow-sm border border-stone-100">
                            <img src="${event.imageUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform" onerror="this.src='https://picsum.photos/100/100'">
                        </div>
                        <div class="flex-grow">
                            <div class="text-[10px] text-brand-900 font-bold uppercase tracking-wider mb-0.5">${fullDate}</div>
                            <h4 class="font-bold text-stone-900 text-lg leading-tight group-hover:text-brand-900">${event.title}</h4>
                            <div class="text-xs text-stone-500 mt-1 flex items-center gap-2">
                                <span>${event.time}</span> • <span class="truncate">${event.location}</span>
                            </div>
                        </div>
                        <div class="flex-shrink-0">
                             <button class="w-10 h-10 rounded-full bg-stone-50 text-brand-900 flex items-center justify-center group-hover:bg-brand-900 group-hover:text-white transition-colors">
                                <i data-lucide="arrow-right" class="w-5 h-5"></i>
                             </button>
                        </div>
                    </div>
                `;
                futureList.insertAdjacentHTML('beforeend', compactHtml);
            });
            
            // Logic for Load More
            loadMoreContainer.classList.remove('hidden');
            loadMoreBtn.classList.remove('hidden');
            futureList.classList.add('hidden');

            const newBtn = loadMoreBtn.cloneNode(true);
            loadMoreBtn.parentNode.replaceChild(newBtn, loadMoreBtn);
            
            newBtn.addEventListener('click', () => {
                futureList.classList.remove('hidden');
                futureList.classList.add('fade-in'); 
                newBtn.parentElement.classList.add('hidden'); 
            });

        } else {
            loadMoreContainer.classList.add('hidden');
        }

        if (window.lucide) window.lucide.createIcons();
    }
}

// --- INIT ---

document.addEventListener('DOMContentLoaded', async () => {
    populateSelects();
    
    // Add Event Delegation for Modals
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.btn-open-modal');
        if (trigger) {
            const id = trigger.dataset.id;
            window.openModal(id);
        }
    });

    document.addEventListener('keydown', (e) => {
        if(e.key === "Escape") window.closeModal();
    });

    await loadContentCMS();
    await loadEvents();
    renderEvents();
    renderChatMessages();
    
    ['search-input', 'filter-month', 'filter-category', 'filter-location'].forEach(id => {
        document.getElementById(id).addEventListener(id === 'search-input' ? 'input' : 'change', (e) => {
            const key = id.replace('filter-', '').replace('-input', '');
            filters[key] = e.target.value;
            renderEvents();
        });
    });

    document.getElementById('contact-form').addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Grazie per averci contattato!');
        document.getElementById('contact-form').reset();
    });

    if (window.lucide) window.lucide.createIcons();
});
