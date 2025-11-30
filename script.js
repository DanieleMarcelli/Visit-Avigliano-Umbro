mport { GoogleGenAI } from "@google/genai";

// --- CONFIGURATION ---
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=0&single=true&output=csv"; 
const CONTENT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv";

// --- DATA CONSTANTS ---
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

// Cammino Configurator Data - Improved Text
const CAMMINO_STAGES = {
    "3": [
        { title: "Tappa 1: Avigliano - Sismano", km: "15 km", diff: "+450m", desc: "Partenza dalla Piazza del Municipio, salendo tra oliveti secolari fino alla rocca medievale di Sismano." },
        { title: "Tappa 2: Sismano - Dunarobba", km: "22 km", diff: "+600m", desc: "Attraversamento dei boschi di castagno con arrivo suggestivo alla Foresta Fossile millenaria." },
        { title: "Tappa 3: Dunarobba - Avigliano", km: "18 km", diff: "+350m", desc: "Chiusura dell'anello passando per la Grotta Bella e i panorami sui Monti Amerini." }
    ],
    "2": [
        { title: "Tappa 1: Avigliano - Dunarobba (Via Alta)", km: "35 km", diff: "+1100m", desc: "Tappa sfidante che unisce storia e natura selvaggia, toccando Sismano e Toscolano in un giorno." },
        { title: "Tappa 2: Dunarobba - Avigliano", km: "25 km", diff: "+600m", desc: "Rientro panoramico attraverso crinali ventosi e piccoli borghi rurali dimenticati dal tempo." }
    ],
    "4": [
        { title: "Tappa 1: Avigliano - Toscolano", km: "12 km", diff: "+300m", desc: "Inizio dolce verso il borgo circolare, ideale per acclimatarsi e visitare le chiese locali." },
        { title: "Tappa 2: Toscolano - Sismano", km: "14 km", diff: "+400m", desc: "Immersione nella macchia mediterranea, tra silenzi profondi e antichi sentieri di pastori." },
        { title: "Tappa 3: Sismano - Dunarobba", km: "15 km", diff: "+350m", desc: "Giornata dedicata alla geologia e alla storia, con visita approfondita al sito paleontologico." },
        { title: "Tappa 4: Dunarobba - Avigliano", km: "14 km", diff: "+250m", desc: "Rientro rilassante su strade bianche con vista sulla valle del Tevere." }
    ]
};

// --- STATE ---
let events = [];
let cmsData = {}; 
let chatHistory = [{ role: 'bot', text: "Ciao! Sono il tuo assistente virtuale. Cerchi un evento o info sul territorio?" }];
let filters = { search: '', month: 'Tutti i mesi', category: 'Tutte le categorie', location: 'Tutti i luoghi' };

// --- HELPERS ---

function formatImageUrl(url) {
    if (!url) return ''; 
    if (url.includes('drive.google.com')) {
        const idMatch = url.match(/\/d\/(.+?)\/|id=(.+?)&|id=(.+?)$/);
        const id = idMatch ? (idMatch[1] || idMatch[2] || idMatch[3]) : null;
        if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    return url;
}

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

function generateEventSchema(eventsList) {
    const schemaScript = document.getElementById('events-json-ld');
    if (!schemaScript) return;

    const schemaData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": eventsList.map((e, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
                "@type": "Event",
                "name": e.title,
                "startDate": `${e.date}T${e.time}`,
                "location": {
                    "@type": "Place",
                    "name": e.location,
                    "address": {
                        "@type": "PostalAddress",
                        "addressLocality": "Avigliano Umbro",
                        "addressRegion": "TR",
                        "addressCountry": "IT"
                    }
                },
                "image": e.imageUrl,
                "description": e.description
            }
        }))
    };
    schemaScript.textContent = JSON.stringify(schemaData);
}

// --- GLOBAL FUNCTIONS ---

window.toggleMobileMenu = () => {
    const menu = document.getElementById('mobile-menu-overlay');
    if (!menu) return;
    
    // Toggle Hidden Class with Transition Logic
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Ensure lock
    } else {
        menu.classList.add('hidden');
        document.body.style.overflow = ''; // Release lock
    }
};

window.scrollToEvents = () => {
    const eventsSection = document.getElementById('eventi-section');
    if (eventsSection) {
        eventsSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        window.location.href = 'index.html#eventi-section';
    }
};

window.toggleChat = () => {
    const win = document.getElementById('chat-window');
    const btn = document.getElementById('chat-toggle');
    if (!win || !btn) return;

    if (win.classList.contains('hidden')) {
        win.classList.remove('hidden');
        btn.classList.add('bg-stone-800', 'text-white');
        btn.classList.remove('bg-white', 'text-brand-900');
        btn.innerHTML = '<span>Chiudi</span>';
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
    const searchInput = document.getElementById('search-input');
    if(searchInput) searchInput.value = '';
    document.getElementById('filter-month').value = 'Tutti i mesi';
    document.getElementById('filter-category').value = 'Tutte le categorie';
    document.getElementById('filter-location').value = 'Tutti i luoghi';
    renderEvents();
};

window.updateCamminoTimeline = () => {
    const container = document.getElementById('cammino-timeline');
    if (!container) return;

    const durationInput = document.querySelector('input[name="duration"]:checked');
    const modeInput = document.querySelector('input[name="mode"]:checked');
    
    const duration = durationInput ? durationInput.value : "3";
    const mode = modeInput ? modeInput.value : "foot";

    const stages = CAMMINO_STAGES[duration] || CAMMINO_STAGES["3"];
    
    container.innerHTML = '';

    stages.forEach((stage, index) => {
        const isLast = index === stages.length - 1;
        const html = `
            <div class="relative pl-8 pb-10 ${isLast ? '' : 'border-l-2 border-emerald-200'} ml-2 fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-md"></div>
                
                <h4 class="text-xl font-serif font-bold text-stone-900 mb-1">${stage.title}</h4>
                <div class="flex items-center gap-4 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">
                    <span class="bg-emerald-50 border border-emerald-100 px-2 py-1 rounded shadow-sm">${stage.km}</span>
                    <span class="bg-emerald-50 border border-emerald-100 px-2 py-1 rounded shadow-sm">${stage.diff}</span>
                    ${mode === 'bike' ? '<span class="bg-emerald-50 border border-emerald-100 px-2 py-1 rounded"><i data-lucide="bike" class="w-3 h-3 inline"></i> Ciclabile</span>' : ''}
                </div>
                <p class="text-stone-600 text-sm leading-relaxed">${stage.desc}</p>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
    if (window.lucide) window.lucide.createIcons();
};

// --- MODAL HANDLING ---

window.openModal = (eventId) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const modal = document.getElementById('event-modal');
    document.getElementById('modal-event-details').classList.remove('hidden');

    document.getElementById('modal-img').src = event.imageUrl;
    document.getElementById('modal-category').innerText = event.category;
    document.getElementById('modal-title').innerText = event.title;
    document.getElementById('modal-subtitle').innerText = event.subtitle || '';
    
    const dateObj = new Date(event.date);
    const fullDate = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('modal-date').innerText = fullDate;
    
    document.getElementById('modal-time').innerText = event.time;
    document.getElementById('modal-location').innerText = event.location;
    document.getElementById('modal-desc').innerText = event.description;

    const orgContainer = document.getElementById('modal-organizer-container');
    if (event.organizer) {
        document.getElementById('modal-organizer').innerText = event.organizer;
        orgContainer.classList.remove('hidden');
    } else {
        orgContainer.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.openContentModal = (baseId) => {
    const modal = document.getElementById('event-modal');
    const detailsBlock = document.getElementById('modal-event-details');
    if(detailsBlock) detailsBlock.classList.add('hidden');

    // Fetch Content
    const imgEl = document.querySelector(`[data-content-id="${baseId}-img"]`);
    const imgSrc = imgEl ? (imgEl.tagName === 'IMG' ? imgEl.src : imgEl.style.backgroundImage.slice(5, -2)) : 'https://picsum.photos/800/600';
    document.getElementById('modal-img').src = imgSrc;

    const titleEl = document.querySelector(`[data-content-id="${baseId}-titolo"]`);
    document.getElementById('modal-title').innerText = titleEl ? titleEl.innerText : 'Dettaglio';

    document.getElementById('modal-category').innerText = baseId.includes('foresta') || baseId.includes('grotta') ? 'Natura' : 'Borgo';
    document.getElementById('modal-subtitle').innerText = ''; 

    // Description Fallback Logic
    const fullDesc = cmsData[`${baseId}-full`];
    const shortDescEl = document.querySelector(`[data-content-id="${baseId}-desc"]`);
    document.getElementById('modal-desc').innerText = fullDesc || (shortDescEl ? shortDescEl.innerText : 'Descrizione non disponibile.');

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeModal = () => {
    document.getElementById('event-modal').classList.add('hidden');
    document.body.style.overflow = '';
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
        const eventContext = events.map(e => `${e.title} (${e.date})`).join(", ");
        const systemPrompt = `Sei l'assistente turistico amichevole di Visit Avigliano Umbro. Ecco gli eventi: ${eventContext}. Sii breve e accogliente.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: text,
            config: { systemInstruction: systemPrompt }
        });
        chatHistory.push({ role: 'bot', text: response.text });
    } catch (e) {
        console.error(e);
        chatHistory.push({ role: 'bot', text: "Non riesco a connettermi al momento." });
    }
    renderChatMessages();
};

// --- CORE LOADING ---

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
                if (contentText) cmsData[id] = contentText;
                if (imageUrl) cmsData[`${id}-img`] = formatImageUrl(imageUrl);

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
    } catch (e) { console.error("CMS Error:", e); }
}

async function fetchEventsFromSheet() {
    if (!SHEET_CSV_URL) return [];
    try {
        const response = await fetch(SHEET_CSV_URL);
        const data = await response.text();
        const rows = data.split('\n').filter(r => r.trim() !== '');
        
        return rows.slice(1).map((row, index) => {
            const cols = parseCSVLine(row); 
            const formattedImg = formatImageUrl(cols[7]) || 'https://picsum.photos/800/600';
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
                organizer: cols[8] || ''
            };
        });
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
    if(!container) return;
    container.innerHTML = '';
    chatHistory.forEach(msg => {
        const div = document.createElement('div');
        div.className = `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`;
        div.innerHTML = `
            <div class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-brand-900 text-white rounded-br-none' : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none'}">
                ${msg.text}
            </div>
        `;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

function populateSelects() {
    const monthSelect = document.getElementById('filter-month');
    if(!monthSelect) return;
    
    // Clear first to prevent duplication on re-runs
    monthSelect.innerHTML = '';
    const catSelect = document.getElementById('filter-category'); catSelect.innerHTML = '';
    const locSelect = document.getElementById('filter-location'); locSelect.innerHTML = '';

    MONTHS.forEach(m => { const opt = new Option(m, m); monthSelect.appendChild(opt); });
    Object.values(EventCategory).forEach(c => { const opt = new Option(c, c); catSelect.appendChild(opt); });
    Object.values(EventLocation).forEach(l => { const opt = new Option(l, l); locSelect.appendChild(opt); });
}

function renderEvents() {
    const mainGrid = document.getElementById('events-main-grid');
    if(!mainGrid) return; 

    const futureList = document.getElementById('events-future-list');
    const countLabel = document.getElementById('results-count');
    const emptyState = document.getElementById('empty-state');
    const loader = document.getElementById('events-loader');
    const loadMoreContainer = document.getElementById('load-more-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    loader.classList.add('hidden');
    mainGrid.innerHTML = ''; futureList.innerHTML = ''; 

    const today = new Date(); today.setHours(0,0,0,0);

    let filtered = events.filter(e => {
        const eventDate = new Date(e.date);
        const eventMidnight = new Date(eventDate); eventMidnight.setHours(0,0,0,0);
        if (eventMidnight < today) return false;

        const searchMatch = !filters.search || e.title.toLowerCase().includes(filters.search.toLowerCase()) || e.description.toLowerCase().includes(filters.search.toLowerCase());
        const catMatch = filters.category === EventCategory.ALL || e.category === filters.category;
        const locMatch = filters.location === EventLocation.ALL || e.location === filters.location;
        let monthMatch = true;
        if (filters.month !== MONTHS[0]) {
             if (!isNaN(eventDate.getTime())) {
                 const mName = eventDate.toLocaleString('it-IT', { month: 'long' });
                 monthMatch = (mName.charAt(0).toUpperCase() + mName.slice(1)) === filters.month;
             }
        }
        return searchMatch && catMatch && locMatch && monthMatch;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));
    
    // Generate SEO Schema for filtered events
    generateEventSchema(filtered.slice(0, 10)); // Top 10 for SEO

    countLabel.innerText = `${filtered.length} eventi in programma`;

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        loadMoreContainer.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        const mainEvents = filtered.slice(0, 4);
        const futureEvents = filtered.slice(4);

        mainEvents.forEach(event => {
            const dateObj = new Date(event.date);
            const day = !isNaN(dateObj) ? dateObj.getDate() : "?";
            const month = !isNaN(dateObj) ? dateObj.toLocaleString('it-IT', { month: 'short' }).toUpperCase() : "???";
            
            const cardHtml = `
                <div role="button" tabindex="0" class="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-stone-100 flex flex-col h-full relative fade-in cursor-pointer hover:-translate-y-1 btn-open-modal focus:ring-2 focus:ring-brand-900 focus:outline-none" data-id="${event.id}" onkeydown="if(event.key === 'Enter') window.openModal('${event.id}')">
                    <div class="relative aspect-[7/10] overflow-hidden bg-stone-100 border-b border-stone-100">
                        <img src="${event.imageUrl}" alt="${event.title}" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" onerror="this.src='https://picsum.photos/800/600'" />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                        <div class="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-brand-900 shadow-sm border border-stone-100 uppercase tracking-widest">${event.category}</div>
                        <div class="absolute bottom-4 left-4 flex flex-col items-center justify-center w-14 h-16 bg-white/95 backdrop-blur-sm rounded-xl text-brand-900 shadow-lg border border-stone-100">
                            <span class="text-2xl font-serif font-bold leading-none">${day}</span>
                            <span class="text-[10px] uppercase font-bold tracking-widest">${month}</span>
                        </div>
                    </div>
                    <div class="p-6 flex-1 flex flex-col">
                        <div class="mb-4">
                            <h3 class="text-xl font-bold text-stone-900 leading-tight group-hover:text-brand-900 transition-colors font-serif">${event.title}</h3>
                            ${event.subtitle ? `<p class="text-sm text-stone-500 font-medium mt-1">${event.subtitle}</p>` : ''}
                        </div>
                        <div class="flex flex-wrap gap-y-2 gap-x-4 text-xs text-stone-500 mb-6 items-center">
                            <div class="flex items-center gap-1.5"><i data-lucide="map-pin" class="w-3.5 h-3.5 text-brand-gold"></i> <span class="truncate max-w-[150px] font-medium">${event.location}</span></div>
                            <div class="flex items-center gap-1.5"><i data-lucide="clock" class="w-3.5 h-3.5 text-brand-gold"></i> <span class="font-medium">${event.time}</span></div>
                        </div>
                        <div class="mt-auto pt-4 border-t border-stone-100 flex justify-between items-center">
                             <span class="text-brand-900 text-xs font-bold uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                                Dettagli <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i> 
                            </span>
                        </div>
                    </div>
                </div>
            `;
            mainGrid.insertAdjacentHTML('beforeend', cardHtml);
        });

        if (futureEvents.length > 0) {
            futureList.insertAdjacentHTML('beforeend', `
                 <div class="flex items-center gap-4 mb-8 mt-6">
                    <div class="h-px bg-stone-200 flex-1"></div>
                    <span class="text-xs font-bold text-stone-400 uppercase tracking-[0.2em]">Prossimamente</span>
                    <div class="h-px bg-stone-200 flex-1"></div>
                </div>
            `);

            futureEvents.forEach(event => {
                const dateObj = new Date(event.date);
                const fullDate = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

                const compactHtml = `
                    <div role="button" tabindex="0" class="flex items-center gap-5 bg-white p-4 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-all group cursor-pointer hover:border-brand-200 btn-open-modal focus:ring-2 focus:ring-brand-900 focus:outline-none" data-id="${event.id}" onkeydown="if(event.key === 'Enter') window.openModal('${event.id}')">
                        <div class="w-16 aspect-[7/10] rounded-lg overflow-hidden flex-shrink-0 bg-stone-100 shadow-sm border border-stone-100">
                            <img src="${event.imageUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform" onerror="this.src='https://picsum.photos/100/100'">
                        </div>
                        <div class="flex-grow">
                            <div class="text-[10px] text-brand-900 font-bold uppercase tracking-widest mb-1 opacity-80">${fullDate}</div>
                            <h4 class="font-bold text-stone-900 text-lg leading-tight group-hover:text-brand-900 font-serif">${event.title}</h4>
                            <div class="text-xs text-stone-500 mt-1 flex items-center gap-3">
                                <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> ${event.time}</span> 
                                <span class="truncate flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${event.location}</span>
                            </div>
                        </div>
                        <div class="flex-shrink-0 pr-2">
                             <div class="w-10 h-10 rounded-full bg-stone-50 text-stone-400 flex items-center justify-center group-hover:bg-brand-900 group-hover:text-white transition-all">
                                <i data-lucide="chevron-right" class="w-5 h-5"></i>
                             </div>
                        </div>
                    </div>
                `;
                futureList.insertAdjacentHTML('beforeend', compactHtml);
            });
            
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
    
    // Configurator Init
    if (document.getElementById('cammino-timeline')) {
        window.updateCamminoTimeline();
        const form = document.getElementById('cammino-form');
        if(form) {
             form.addEventListener('submit', (e) => {
                e.preventDefault();
                alert('Grazie! La tua richiesta per il Cammino è stata inviata. Ti contatteremo a breve.');
                form.reset();
            });
        }
    }
    
    // --- CONTACT FORM LOGIC (FORMSUBMIT) ---
    // Check if URL has success=1
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === '1') {
        const successMsg = document.getElementById('contact-success-message');
        if (successMsg) successMsg.classList.remove('hidden');
        // Clean URL without refresh
        window.history.replaceState({}, document.title, window.location.pathname + "#contatti");
    }

    // Set dynamic redirect URL for FormSubmit to work on GitHub Pages
    const nextInput = document.getElementById('form-next-url');
    if (nextInput) {
        // Redirects to same page with ?success=1 appended
        nextInput.value = window.location.origin + window.location.pathname + "?success=1#contatti";
    }
    // ----------------------------------------

    // Modal Events
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.btn-open-modal');
        if (trigger) {
            window.openModal(trigger.dataset.id);
        }
    });

    document.addEventListener('keydown', (e) => {
        if(e.key === "Escape") window.closeModal();
    });

    await loadContentCMS();
    await loadEvents();
    renderEvents();
    renderChatMessages();
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        ['search-input', 'filter-month', 'filter-category', 'filter-location'].forEach(id => {
            document.getElementById(id).addEventListener(id === 'search-input' ? 'input' : 'change', (e) => {
                const key = id.replace('filter-', '').replace('-input', '');
                filters[key] = e.target.value;
                renderEvents();
            });
        });
    }

    if (window.lucide) window.lucide.createIcons();
});