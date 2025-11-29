// --- CONFIGURATION ---
// 1. LINK EVENTI (Struttura: Data, Ora, Titolo, Sottotitolo, Descrizione, Luogo, Categoria, Immagine, Organizzatore)
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=0&single=true&output=csv; 

// 2. LINK CONTENUTI CMS (Struttura: ID, Testo, Immagine)
const CONTENT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv"; 

// --- DATI E COSTANTI ---
const EventCategory = {
    ALL: "Tutte le categorie",
    MUSIC: "Musica",
    THEATER: "Teatro",
    EXHIBITION: "Mostra",
    FESTIVAL: "Sagra",
    CLASSICAL: "Musica Classica"
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

// Fallback events if sheet fails or is empty initially
const INITIAL_EVENTS = [];

// --- STATE ---
let events = [];
let notificationCount = 0;
let chatHistory = [{ role: 'bot', text: "Ciao! Sono il tuo assistente virtuale per Avigliano Umbro. Cerchi un concerto o un evento teatrale?" }];
let filters = { search: '', month: 'Tutti i mesi', category: 'Tutte le categorie', location: 'Tutti i luoghi' };

// Get API Key safely
const getApiKey = () => localStorage.getItem('GEMINI_API_KEY');

// --- HELPER FUNCTIONS ---

/**
 * ROBUST GOOGLE DRIVE IMAGE FORMATTER
 * Detects Drive links and converts them to high-res thumbnails.
 */
function formatImageUrl(url) {
    if (!url) return ''; // Return empty if null
    
    // 1. Handle Google Drive Links
    if (url.includes('drive.google.com')) {
        // Regex to extract the ID from various Drive URL formats
        const idMatch = url.match(/\/d\/(.+?)\/|id=(.+?)&|id=(.+?)$/);
        const id = idMatch ? (idMatch[1] || idMatch[2] || idMatch[3]) : null;
        
        if (id) {
            // Return high-res thumbnail URL (sz=w1000 requests a 1000px wide image)
            return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
        }
    }
    
    // 2. Return original URL if it's not Drive (e.g., Unsplash, direct links)
    return url;
}

/**
 * Simple CSV Line Parser that respects quotes
 */
function parseCSVLine(text) {
    const result = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cell.trim());
            cell = '';
        } else {
            cell += char;
        }
    }
    result.push(cell.trim());
    return result.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"')); // Clean surrounding quotes
}

// --- FUNCTIONS EXPOSED TO WINDOW ---

window.setApiKey = () => {
    const key = prompt("Inserisci la tua Google Gemini API Key per abilitare l'AI:");
    if (key) {
        localStorage.setItem('GEMINI_API_KEY', key);
        alert("API Key salvata!");
    }
};

window.scrollToEvents = () => {
    clearNotifications();
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

window.deleteEvent = (id) => {
    if(confirm('Eliminare evento locale? (Gli eventi dal Foglio Google non possono essere eliminati da qui)')) {
        let stored = JSON.parse(localStorage.getItem('visit_avigliano_events') || '[]');
        stored = stored.filter(e => e.id !== id);
        localStorage.setItem('visit_avigliano_events', JSON.stringify(stored));
        
        loadEvents().then(() => {
             renderAdminList(); 
             renderEvents();
        });
    }
};

window.sendChatMessage = async () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    chatHistory.push({ role: 'user', text });
    renderChatMessages();
    input.value = '';

    const apiKey = getApiKey();
    if (apiKey) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const systemPrompt = `Sei un assistente turistico per Avigliano Umbro. Ecco gli eventi attuali: ${JSON.stringify(events.map(e => `${e.title} il ${e.date}`))}. Sii breve e amichevole.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: text,
                config: { systemInstruction: systemPrompt }
            });
            chatHistory.push({ role: 'bot', text: response.text });
        } catch (e) {
            console.error(e);
            chatHistory.push({ role: 'bot', text: "Errore di connessione (Verifica API Key)." });
        }
    } else {
        chatHistory.push({ role: 'bot', text: "API Key non configurata. Clicca su 'Configura API Key' nel pannello Admin." });
    }
    renderChatMessages();
};

// --- CORE LOGIC ---

// 1. CMS CONTENT LOADER
async function loadContentCMS() {
    // If URL is placeholder or empty, skip
    if (!CONTENT_CSV_URL || CONTENT_CSV_URL.includes("INSERISCI_QUI")) {
        console.warn("CMS CSV URL non configurato o placeholder presente.");
        return;
    }

    try {
        const response = await fetch(CONTENT_CSV_URL);
        const text = await response.text();
        
        const rows = text.split('\n').filter(r => r.trim() !== '');
        
        // Skip header (row 0), process data
        rows.slice(1).forEach(row => {
            const cols = parseCSVLine(row);
            const id = cols[0];       // Column A: ID (e.g., "nav-logo", "hero-title")
            const contentText = cols[1]; // Column B: Text
            const imageUrl = cols[2];    // Column C: Image URL

            if (id) {
                // Find element(s) by data-content-id
                const elements = document.querySelectorAll(`[data-content-id="${id}"]`);
                
                elements.forEach(element => {
                    // Update Text
                    if (contentText) {
                        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                            element.placeholder = contentText;
                        } else {
                            // Use innerHTML to allow simple formatting like <br>
                            element.innerHTML = contentText;
                        }
                    }

                    // Update Image
                    if (imageUrl) {
                        const formattedUrl = formatImageUrl(imageUrl);
                        
                        if (element.tagName === 'IMG') {
                            element.src = formattedUrl;
                        } else {
                            // Assume background image for Divs
                            element.style.backgroundImage = `url('${formattedUrl}')`;
                        }
                    }
                });
            }
        });
        console.log("CMS Content Loaded Successfully");
    } catch (e) {
        console.error("Errore caricamento CMS:", e);
    }
}

// 2. EVENTS LOADER
async function fetchEventsFromSheet() {
    if (!SHEET_CSV_URL) return [];

    try {
        const response = await fetch(SHEET_CSV_URL);
        const data = await response.text();
        
        const rows = data.split('\n').filter(r => r.trim() !== '');
        
        const sheetEvents = rows.slice(1).map((row, index) => {
            const cleanCols = parseCSVLine(row); 
            
            // Format Image URL using the new Drive-compatible function
            const rawImg = cleanCols[7] || '';
            const formattedImg = formatImageUrl(rawImg) || 'https://picsum.photos/800/600';

            return {
                id: `sheet-${index}`,
                date: cleanCols[0] || new Date().toISOString().split('T')[0],
                time: cleanCols[1] || '21:00',
                title: cleanCols[2] || 'Evento senza titolo',
                subtitle: cleanCols[3] || '',
                description: cleanCols[4] || '',
                location: cleanCols[5] || 'Avigliano Umbro',
                category: cleanCols[6] || 'Altro',
                imageUrl: formattedImg,
                organizer: cleanCols[8] || '', 
                tags: ['Live']
            };
        });
        
        return sheetEvents;
    } catch (error) {
        console.error("Errore nel caricamento eventi:", error);
        return [];
    }
}

async function loadEvents() {
    const sheetEvents = await fetchEventsFromSheet();
    const stored = localStorage.getItem('visit_avigliano_events');
    const localEvents = stored ? JSON.parse(stored) : [];

    events = [...sheetEvents, ...localEvents];
    
    if (events.length === 0 && INITIAL_EVENTS.length > 0) {
        events = [...INITIAL_EVENTS];
    }
    
    const storedNotif = localStorage.getItem('visit_avigliano_notif');
    if (storedNotif) {
        notificationCount = parseInt(storedNotif);
    }
}

function saveLocalEvent(newEvent) {
    // Format image before saving locally
    newEvent.imageUrl = formatImageUrl(newEvent.imageUrl);

    const stored = JSON.parse(localStorage.getItem('visit_avigliano_events') || '[]');
    stored.unshift(newEvent);
    localStorage.setItem('visit_avigliano_events', JSON.stringify(stored));
    
    loadEvents().then(() => {
        notificationCount++;
        localStorage.setItem('visit_avigliano_notif', notificationCount.toString());
        updateNotificationBadge();
        renderEvents();
        renderAdminList();
    });
}

function updateNotificationBadge() {
    const badge = document.getElementById('nav-notification');
    if (notificationCount > 0) {
        badge.innerText = notificationCount > 9 ? '9+' : notificationCount;
        badge.classList.remove('hidden');
        badge.classList.add('flex');
    } else {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
    }
}

function clearNotifications() {
    notificationCount = 0;
    localStorage.setItem('visit_avigliano_notif', '0');
    updateNotificationBadge();
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
    const adminCatSelect = document.getElementById('input-category');
    const adminLocSelect = document.getElementById('input-location');

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
        if (c !== EventCategory.ALL) {
            const adminOpt = document.createElement('option');
            adminOpt.value = c;
            adminOpt.innerText = c;
            adminCatSelect.appendChild(adminOpt);
        }
    });

    Object.values(EventLocation).forEach(l => {
        const opt = document.createElement('option');
        opt.value = l;
        opt.innerText = l;
        locSelect.appendChild(opt);
        if (l !== EventLocation.ALL) {
             const adminOpt = document.createElement('option');
            adminOpt.value = l;
            adminOpt.innerText = l;
            adminLocSelect.appendChild(adminOpt);
        }
    });
}

function renderEvents() {
    const grid = document.getElementById('events-grid');
    const countLabel = document.getElementById('results-count');
    const emptyState = document.getElementById('empty-state');
    
    grid.innerHTML = '';
    
    const filtered = events.filter(e => {
        const searchMatch = !filters.search || e.title.toLowerCase().includes(filters.search.toLowerCase()) || e.description.toLowerCase().includes(filters.search.toLowerCase());
        const catMatch = filters.category === EventCategory.ALL || e.category === filters.category;
        const locMatch = filters.location === EventLocation.ALL || e.location === filters.location;
        let monthMatch = true;
        if (filters.month !== MONTHS[0]) {
             const d = new Date(e.date);
             if (!isNaN(d.getTime())) {
                 const mName = d.toLocaleString('it-IT', { month: 'long' });
                 const capMonth = mName.charAt(0).toUpperCase() + mName.slice(1);
                 monthMatch = capMonth === filters.month;
             }
        }
        return searchMatch && catMatch && locMatch && monthMatch;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));

    countLabel.innerText = `${filtered.length} eventi trovati`;

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        filtered.forEach(event => {
            const dateObj = new Date(event.date);
            let day = "?";
            let month = "???";
            
            if (!isNaN(dateObj.getTime())) {
                day = dateObj.getDate();
                month = dateObj.toLocaleString('it-IT', { month: 'short' }).toUpperCase();
            }
            
            const cardHtml = `
                <div class="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-stone-200 flex flex-col h-full relative fade-in cursor-pointer hover:scale-[1.02]">
                    <div class="relative aspect-[7/10] overflow-hidden bg-stone-100 border-b border-stone-100">
                        <img src="${event.imageUrl}" alt="${event.title}" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" onerror="this.src='https://picsum.photos/800/600'" />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                        <div class="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-brand-900 shadow-sm border border-stone-100">
                            ${event.category}
                        </div>
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
                        <p class="text-stone-600 text-sm line-clamp-3 mb-6 flex-1">${event.description}</p>
                        <div class="mt-auto pt-4 border-t border-stone-100 flex justify-between items-center">
                             <div class="flex gap-2">
                                ${(event.tags || []).slice(0,2).map(t => `<span class="text-[10px] uppercase tracking-wide text-stone-500 bg-stone-100 px-2 py-1 rounded-md font-medium">${t}</span>`).join('')}
                            </div>
                             <button class="text-brand-900 hover:text-brand-700 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors">
                                <i data-lucide="info" class="w-4 h-4"></i>
                                Dettagli
                            </button>
                        </div>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', cardHtml);
        });
        if (window.lucide) window.lucide.createIcons();
    }
}

function toggleAdmin() {
    const dash = document.getElementById('admin-dashboard');
    const btn = document.getElementById('admin-toggle-btn');
    if (dash.classList.contains('hidden')) {
        dash.classList.remove('hidden');
        btn.classList.add('bg-brand-900', 'text-white');
        renderAdminList();
    } else {
        dash.classList.add('hidden');
        btn.classList.remove('bg-brand-900', 'text-white');
    }
}

function renderAdminList() {
    const container = document.getElementById('admin-events-list');
    container.innerHTML = '';
    const localEvents = JSON.parse(localStorage.getItem('visit_avigliano_events') || '[]');
    
    if (localEvents.length === 0) {
        container.innerHTML = '<div class="p-4 text-sm text-stone-500 italic">Nessun evento locale aggiunto.</div>';
    }

    localEvents.forEach(e => {
        const item = `
            <div class="p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                <div class="w-16 h-24 overflow-hidden rounded-md shadow-sm bg-stone-200 flex-shrink-0">
                    <img src="${e.imageUrl}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1">
                    <h4 class="font-bold text-stone-900">${e.title}</h4>
                    <p class="text-xs text-stone-500">${e.date} • ${e.time}</p>
                    <span class="text-[10px] bg-stone-100 px-1 rounded">Locale</span>
                </div>
                <button onclick="deleteEvent('${e.id}')" class="p-2 text-stone-400 hover:text-red-600 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', item);
    });
    if (window.lucide) window.lucide.createIcons();
}

// --- INIT ---

document.addEventListener('DOMContentLoaded', async () => {
    populateSelects();
    updateNotificationBadge();
    
    // LOAD SEQUENCE: CMS Content first, then Events
    await loadContentCMS();
    await loadEvents();
    renderEvents();
    renderChatMessages();
    
    // Listeners
    ['search-input', 'filter-month', 'filter-category', 'filter-location'].forEach(id => {
        document.getElementById(id).addEventListener(id === 'search-input' ? 'input' : 'change', (e) => {
            const key = id.replace('filter-', '').replace('-input', '');
            filters[key] = e.target.value;
            renderEvents();
        });
    });

    document.getElementById('admin-toggle-btn').addEventListener('click', toggleAdmin);
    document.getElementById('close-admin-btn').addEventListener('click', toggleAdmin);

    const fileInput = document.getElementById('poster-input');
    const uploadZone = document.getElementById('upload-zone');
    
    uploadZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        
        document.getElementById('upload-placeholder').classList.add('hidden');
        document.getElementById('upload-loading').classList.remove('hidden');
        
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result.split(',')[1];
            document.getElementById('upload-preview-img').src = reader.result;
            
            const apiKey = getApiKey();
            if (apiKey) {
                try {
                    const ai = new GoogleGenAI({ apiKey });
                    const prompt = `Analyze this event poster. Return JSON: {title, subtitle, description, date(YYYY-MM-DD), time, location, category, tags}. Use these categories: ${Object.values(EventCategory).join(', ')}.`;
                    
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: {
                            parts: [
                                { inlineData: { mimeType: 'image/png', data: base64 } },
                                { text: prompt }
                            ]
                        },
                        config: { responseMimeType: "application/json" }
                    });
                    
                    const data = JSON.parse(response.text);
                    if (data) {
                        document.getElementById('input-title').value = data.title || '';
                        document.getElementById('input-desc').value = data.description || '';
                        document.getElementById('input-date').value = data.date || '';
                        document.getElementById('input-time').value = data.time || '';
                        if (data.location) document.getElementById('input-location').value = data.location;
                        if (data.category) document.getElementById('input-category').value = data.category;
                    }
                } catch (err) {
                    console.error("AI Error", err);
                    alert("Errore AI. Verifica API Key.");
                }
            }

            document.getElementById('upload-loading').classList.add('hidden');
            document.getElementById('upload-preview-container').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('event-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const newEvt = {
            id: Date.now().toString(),
            title: document.getElementById('input-title').value,
            description: document.getElementById('input-desc').value,
            date: document.getElementById('input-date').value,
            time: document.getElementById('input-time').value,
            location: document.getElementById('input-location').value,
            category: document.getElementById('input-category').value,
            imageUrl: document.getElementById('upload-preview-img').src || '',
            tags: ["Nuovo"]
        };
        saveLocalEvent(newEvt);
        
        document.getElementById('event-form').reset();
        document.getElementById('upload-preview-container').classList.add('hidden');
        document.getElementById('upload-placeholder').classList.remove('hidden');
        alert('Evento Pubblicato!');
    });

    document.getElementById('contact-form').addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Grazie per averci contattato!');
        document.getElementById('contact-form').reset();
    });

    if (window.lucide) window.lucide.createIcons();
});
