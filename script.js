import { GoogleGenAI } from "@google/genai";

// --- DATA & CONSTANTS ---
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

const INITIAL_EVENTS = [
    {
        id: '1', title: "Da Bach a Bernstein", subtitle: "Flautista G.L. Petrucci - Pianista P. Pisa",
        description: "Un viaggio musicale straordinario. Esecuzione di brani classici rivisitati.",
        date: '2025-12-06', time: "21:00", location: EventLocation.TEATRO_COMUNALE,
        category: EventCategory.CLASSICAL, imageUrl: "https://images.unsplash.com/photo-1552422535-c45813c61732?q=80&w=800&auto=format&fit=crop", tags: ["Concerto", "Classica"]
    },
    {
        id: '2', title: "Coro di Clarinetti", subtitle: "Chiesa di Santa Restituta",
        description: "Suggestiva esibizione di ensemble di clarinetti.",
        date: '2025-12-07', time: "17:00", location: EventLocation.CHIESA_SANTA_RESTA,
        category: EventCategory.CLASSICAL, imageUrl: "https://images.unsplash.com/photo-1573871666450-427771765c87?q=80&w=800&auto=format&fit=crop", tags: ["Ensemble", "Fiati"]
    },
    {
        id: '3', title: "Concerto Marea", subtitle: "Duo di Chitarre",
        description: "Le armonie delle chitarre classiche risuonano a Dunarobba.",
        date: '2025-12-13', time: "21:00", location: EventLocation.CHIESA_DUNAROBBA,
        category: EventCategory.MUSIC, imageUrl: "https://images.unsplash.com/photo-1556449895-a33c9dba33dd?q=80&w=800&auto=format&fit=crop", tags: ["Chitarra"]
    },
    {
        id: '4', title: "50° di Pasolini", subtitle: "Stefano De Majo",
        description: "Tributo a Pier Paolo Pasolini interpretato dal maestro Stefano De Majo.",
        date: '2025-12-14', time: "21:00", location: EventLocation.TEATRO_COMUNALE,
        category: EventCategory.THEATER, imageUrl: "https://images.unsplash.com/photo-1503095392237-595977092e08?q=80&w=800&auto=format&fit=crop", tags: ["Teatro"]
    },
    {
        id: '5', title: "New Time Sax Quartet", subtitle: "Quartetto",
        description: "Quartetto di sassofoni che spazia dal classico al moderno.",
        date: '2025-12-20', time: "21:00", location: EventLocation.TEATRO_COMUNALE,
        category: EventCategory.MUSIC, imageUrl: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?q=80&w=800&auto=format&fit=crop", tags: ["Jazz", "Sax"]
    },
    {
        id: '9', title: "Nicolò Lauteri", subtitle: "Recital",
        description: "Recital solista di pianoforte.",
        date: '2026-01-03', time: "21:00", location: EventLocation.CHIESA_SISMANO,
        category: EventCategory.CLASSICAL, imageUrl: "https://images.unsplash.com/photo-1552422535-c45813c61732?q=80&w=800&auto=format&fit=crop", tags: ["Piano"]
    },
    {
        id: '11', title: "La favola di Natale", subtitle: "Giovannino Guareschi",
        description: "Con Pino Menzolini e Federico Gili. Racconto per l'Epifania.",
        date: '2026-01-05', time: "17:30", location: EventLocation.TEATRO_COMUNALE,
        category: EventCategory.THEATER, imageUrl: "https://images.unsplash.com/photo-1607627000458-217e7bb52382?q=80&w=800&auto=format&fit=crop", tags: ["Famiglia"]
    },
    {
        id: '14', title: "Ottoni Amerini", subtitle: "Ensemble",
        description: "Ensemble di ottoni con repertorio brillante.",
        date: '2026-01-17', time: "21:00", location: EventLocation.TEATRO_COMUNALE,
        category: EventCategory.CLASSICAL, imageUrl: "https://images.unsplash.com/photo-1576435728678-35d016118064?q=80&w=800&auto=format&fit=crop", tags: ["Brass"]
    },
    {
        id: '17', title: "Smoothless 3", subtitle: "Jazz e Soul",
        description: "Jazz, soul e contaminazioni moderne.",
        date: '2026-01-31', time: "21:00", location: EventLocation.TEATRO_COMUNALE,
        category: EventCategory.MUSIC, imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop", tags: ["Jazz", "Soul"]
    }
];

// --- STATE ---
let events = [];
let notificationCount = 0;
let chatHistory = [{ role: 'bot', text: "Ciao! Sono il tuo assistente virtuale per Avigliano Umbro. Cerchi un concerto o un evento teatrale?" }];
let filters = { search: '', month: 'Tutti i mesi', category: 'Tutte le categorie', location: 'Tutti i luoghi' };

// Get API Key safely
const getApiKey = () => localStorage.getItem('GEMINI_API_KEY');

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
    if(confirm('Eliminare evento?')) {
        events = events.filter(e => e.id !== id);
        saveEvents();
        renderAdminList();
        renderEvents();
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
            const systemPrompt = `Sei un assistente turistico per Avigliano Umbro. Ecco gli eventi attuali: ${JSON.stringify(events.map(e => `${e.title} il ${e.date}`))}. Sii breve.`;
            
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

function loadEvents() {
    const stored = localStorage.getItem('visit_avigliano_events');
    const storedNotif = localStorage.getItem('visit_avigliano_notif');
    
    if (stored) {
        events = JSON.parse(stored);
    } else {
        events = [...INITIAL_EVENTS];
        saveEvents();
    }

    if (storedNotif) {
        notificationCount = parseInt(storedNotif);
    }
}

function saveEvents() {
    localStorage.setItem('visit_avigliano_events', JSON.stringify(events));
}

function addEvent(newEvent) {
    events.unshift(newEvent);
    saveEvents();
    notificationCount++;
    localStorage.setItem('visit_avigliano_notif', notificationCount.toString());
    updateNotificationBadge();
    renderEvents();
    renderAdminList();
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
             const mName = d.toLocaleString('it-IT', { month: 'long' });
             const capMonth = mName.charAt(0).toUpperCase() + mName.slice(1);
             monthMatch = capMonth === filters.month;
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
            const day = dateObj.getDate();
            const month = dateObj.toLocaleString('it-IT', { month: 'short' }).toUpperCase();
            
            const cardHtml = `
                <div class="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-stone-200 flex flex-col h-full relative fade-in cursor-pointer hover:scale-[1.02]">
                    <div class="relative aspect-[7/10] overflow-hidden bg-stone-100 border-b border-stone-100">
                        <img src="${event.imageUrl}" alt="${event.title}" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
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
    events.forEach(e => {
        const item = `
            <div class="p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                <div class="w-16 h-24 overflow-hidden rounded-md shadow-sm bg-stone-200 flex-shrink-0">
                    <img src="${e.imageUrl}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1">
                    <h4 class="font-bold text-stone-900">${e.title}</h4>
                    <p class="text-xs text-stone-500">${e.date} • ${e.time}</p>
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

document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
    populateSelects();
    renderEvents();
    renderChatMessages();
    updateNotificationBadge();
    
    // Event Listeners for Filters
    ['search-input', 'filter-month', 'filter-category', 'filter-location'].forEach(id => {
        document.getElementById(id).addEventListener(id === 'search-input' ? 'input' : 'change', (e) => {
            const key = id.replace('filter-', '').replace('-input', '');
            filters[key] = e.target.value;
            renderEvents();
        });
    });

    // Admin Toggles
    document.getElementById('admin-toggle-btn').addEventListener('click', toggleAdmin);
    document.getElementById('close-admin-btn').addEventListener('click', toggleAdmin);

    // Image Upload & AI
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
                        // Simple matches for location/category
                        if (data.location) document.getElementById('input-location').value = data.location;
                        if (data.category) document.getElementById('input-category').value = data.category;
                    }
                } catch (err) {
                    console.error("AI Error", err);
                    alert("Errore durante l'analisi AI. Verifica la console o l'API Key.");
                }
            } else {
                alert("Per l'analisi automatica, imposta prima l'API Key.");
            }

            document.getElementById('upload-loading').classList.add('hidden');
            document.getElementById('upload-preview-container').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });

    // Submit
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
            imageUrl: document.getElementById('upload-preview-img').src || 'https://picsum.photos/800/600',
            tags: ["Nuovo"]
        };
        addEvent(newEvt);
        document.getElementById('event-form').reset();
        document.getElementById('upload-preview-container').classList.add('hidden');
        document.getElementById('upload-placeholder').classList.remove('hidden');
        alert('Evento Pubblicato!');
    });

    if (window.lucide) window.lucide.createIcons();
});
