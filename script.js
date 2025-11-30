async function loadContentCMS() {
    if (!CONTENT_CSV_URL) return;
    try {
        const response = await fetch(CONTENT_CSV_URL);
        const text = await response.text();
        const rows = text.split('\n').filter(r => r.trim() !== '');
        
        // Prima passata: Popola i dati
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

        // Seconda passata: Rivela gli elementi (rimuove il flash)
        // Aspetta un frame per assicurarsi che il DOM sia aggiornato
        requestAnimationFrame(() => {
            document.querySelectorAll('[data-content-id]').forEach(element => {
                element.classList.remove('opacity-0');
            });
        });

    } catch (e) { 
        console.error("CMS Error:", e);
        // Fallback in caso di errore: mostra comunque gli elementi vuoti per non rompere il layout
        document.querySelectorAll('[data-content-id]').forEach(element => {
            element.classList.remove('opacity-0');
        });
    }
}

// Ensure functions are available globally for inline HTML event handlers
window.scrollToEvents = function() {
  const eventsSection = document.getElementById('eventi-section');
  if (eventsSection) {
    eventsSection.scrollIntoView({ behavior: 'smooth' });
  }
};

window.toggleMobileMenu = function() {
    const overlay = document.getElementById('mobile-menu-overlay');
    if (overlay) {
        overlay.classList.toggle('hidden');
        if (!overlay.classList.contains('hidden')) {
            document.body.classList.add('overflow-hidden');
        } else {
            document.body.classList.remove('overflow-hidden');
        }
    }
};

window.openContentModal = function(baseId) {
    // 1. Apri la modale
    const modal = document.getElementById('event-modal');
    modal.classList.remove('hidden');

    // 2. Nascondi i dettagli evento
    const eventDetails = document.getElementById('modal-event-details');
    eventDetails.classList.add('hidden');

    // 3. Popola i dati dal CMS globale
    const title = cmsData[`${baseId}-titolo`] || "Titolo non disponibile";
    const imgUrl = cmsData[`${baseId}-img`] || "https://picsum.photos/800/600";
    const fullDesc = cmsData[`${baseId}-full`] || cmsData[`${baseId}-desc`] || "Descrizione in arrivo...";
    
    // Set elements
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-subtitle').innerText = ""; // Nessun sottotitolo per i luoghi
    document.getElementById('modal-category').innerText = "Luogo di Interesse";
    document.getElementById('modal-img').src = imgUrl;
    document.getElementById('modal-desc').innerText = fullDesc;
};

// ... existing code ...
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1rO_63f6qY4zHqU7z4q6y_8q9y0r1t2u3i4o5p6a7s8d9f0g1h2j3k4l5m6n7o8p9q0r1s2t3u4/pub?output=csv"; 
const CONTENT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR-c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6/pub?output=csv";

// Helper function to handle Google Drive images
function formatImageUrl(url) {
    if (!url) return 'https://picsum.photos/800/600';
    if (url.includes('drive.google.com')) {
        try {
            // Extract ID logic
            const idMatch = url.match(/[-\w]{25,}/);
            if (idMatch) {
                return `https://drive.google.com/thumbnail?id=${idMatch[0]}&sz=w1000`;
            }
        } catch (e) {
            console.error("Error formatting Drive URL", e);
        }
    }
    return url;
}

// Global CMS Data Store
let cmsData = {};

function parseCSVLine(line) {
    const result = [];
    let startValueIndex = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQuotes = !inQuotes; }
        else if (line[i] === ',' && !inQuotes) {
            let val = line.substring(startValueIndex, i).trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            result.push(val.replace(/""/g, '"'));
            startValueIndex = i + 1;
        }
    }
    let lastVal = line.substring(startValueIndex).trim();
    if (lastVal.startsWith('"') && lastVal.endsWith('"')) lastVal = lastVal.slice(1, -1);
    result.push(lastVal.replace(/""/g, '"'));
    return result;
}

// Event Data Store
let sheetEvents = [];

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

const MONTHS = ["Tutti i mesi", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

async function fetchEventsFromSheet() {
    if (!SHEET_CSV_URL) return;
    try {
        const response = await fetch(SHEET_CSV_URL);
        const text = await response.text();
        const rows = text.split('\n').filter(r => r.trim() !== ''); // Remove empty lines
        
        // Skip header row
        const dataRows = rows.slice(1);

        sheetEvents = dataRows.map((row, index) => {
            const cols = parseCSVLine(row);
            // Expected: Data, Ora, Titolo, Sottotitolo, Descrizione, Luogo, Categoria, Immagine, Organizzatore
            return {
                id: `sheet-${index}`,
                date: cols[0] ? new Date(cols[0]) : new Date(),
                time: cols[1] || '',
                title: cols[2] || 'Evento',
                subtitle: cols[3] || '',
                description: cols[4] || '',
                location: cols[5] || '',
                category: cols[6] || 'Altro',
                imageUrl: formatImageUrl(cols[7]),
                organizer: cols[8] || ''
            };
        });

        populateSelects();
        renderEvents();
        updateGeminiContext(sheetEvents);

    } catch (error) {
        console.error("Error fetching sheet:", error);
    }
}

function populateSelects() {
    const monthSelect = document.getElementById('filter-month');
    const catSelect = document.getElementById('filter-category');
    const locSelect = document.getElementById('filter-location');

    monthSelect.innerHTML = MONTHS.map(m => `<option value="${m}">${m}</option>`).join('');
    catSelect.innerHTML = Object.values(EventCategory).map(c => `<option value="${c}">${c}</option>`).join('');
    locSelect.innerHTML = Object.values(EventLocation).map(l => `<option value="${l}">${l}</option>`).join('');

    // Add listeners
    [monthSelect, catSelect, locSelect, document.getElementById('search-input')].forEach(el => {
        el.addEventListener('input', renderEvents);
    });
}

function renderEvents() {
    const searchText = document.getElementById('search-input').value.toLowerCase();
    const monthFilter = document.getElementById('filter-month').value;
    const catFilter = document.getElementById('filter-category').value;
    const locFilter = document.getElementById('filter-location').value;
    const loader = document.getElementById('events-loader');
    const emptyState = document.getElementById('empty-state');
    const resultsCount = document.getElementById('results-count');
    
    // Containers
    const mainGrid = document.getElementById('events-main-grid');
    const futureList = document.getElementById('events-future-list');
    const loadMoreContainer = document.getElementById('load-more-container');
    const loadMoreBtn = document.getElementById('load-more-btn');

    if (loader) loader.classList.add('hidden');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = sheetEvents.filter(e => {
        // 1. Filter out past events
        if (e.date < today) return false;

        // 2. Search
        const searchMatch = e.title.toLowerCase().includes(searchText) || 
                            e.description.toLowerCase().includes(searchText) ||
                            (e.subtitle && e.subtitle.toLowerCase().includes(searchText));
        if (!searchMatch) return false;

        // 3. Month
        if (monthFilter !== "Tutti i mesi") {
            const eventMonth = e.date.toLocaleString('it-IT', { month: 'long' });
            const capMonth = eventMonth.charAt(0).toUpperCase() + eventMonth.slice(1);
            if (capMonth.toLowerCase() !== monthFilter.toLowerCase()) return false;
        }

        // 4. Category
        if (catFilter !== "Tutte le categorie" && e.category !== catFilter) return false;

        // 5. Location
        if (locFilter !== "Tutti i luoghi" && e.location !== locFilter) return false;

        return true;
    }).sort((a, b) => a.date - b.date);

    // Update UI
    if (resultsCount) resultsCount.innerText = `${filtered.length} ${filtered.length === 1 ? 'evento trovato' : 'eventi trovati'}`;
    
    if (filtered.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (mainGrid) mainGrid.innerHTML = '';
        if (futureList) futureList.innerHTML = '';
        if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
        return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');

    // --- SPLIT LOGIC: TOP 4 (Main Grid) vs OTHERS (Compact List) ---
    // Actually, let's prioritize "This Week" logic if applicable, 
    // but a simple "Top 4" approach is robust for general use as requested.
    
    const mainEvents = filtered.slice(0, 4);
    const futureEvents = filtered.slice(4);

    // 1. Render Main Grid
    if (mainGrid) {
        mainGrid.innerHTML = mainEvents.map(event => `
            <div class="group bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden border border-stone-100 flex flex-col h-full relative cursor-pointer btn-open-modal" data-id="${event.id}">
                <div class="relative aspect-[7/10] overflow-hidden bg-stone-100">
                    <img src="${event.imageUrl}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" loading="lazy">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                    <div class="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-brand-900 shadow-sm">${event.category}</div>
                    <div class="absolute bottom-4 left-4 flex flex-col items-center justify-center w-12 h-14 bg-white/95 backdrop-blur-sm rounded-lg text-brand-900 shadow-lg">
                        <span class="text-xl font-bold leading-none">${event.date.getDate()}</span>
                        <span class="text-[10px] uppercase font-bold tracking-wider">${event.date.toLocaleString('it-IT', { month: 'short' }).toUpperCase()}</span>
                    </div>
                </div>
                <div class="p-5 flex-1 flex flex-col">
                    <div class="mb-3">
                        <h3 class="text-xl font-bold text-stone-900 leading-tight group-hover:text-brand-800 transition-colors font-serif">${event.title}</h3>
                        ${event.subtitle ? `<p class="text-sm text-brand-800 font-medium mt-1">${event.subtitle}</p>` : ''}
                        ${event.organizer ? `<p class="text-xs text-stone-400 italic mt-1">A cura di: ${event.organizer}</p>` : ''}
                    </div>
                    <div class="flex flex-wrap gap-y-2 gap-x-4 text-xs text-stone-500 mb-4 items-center">
                        <div class="flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3 text-brand-900/70"></i> <span class="truncate max-w-[150px]">${event.location}</span></div>
                        <div class="flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3 text-brand-900/70"></i> <span>${event.time}</span></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // 2. Render Future List (Hidden by default)
    if (futureList && loadMoreContainer) {
        if (futureEvents.length > 0) {
            futureList.innerHTML = futureEvents.map(event => `
                <div class="flex gap-4 p-4 bg-white rounded-xl border border-stone-100 hover:shadow-md transition-all cursor-pointer btn-open-modal group" data-id="${event.id}">
                     <div class="w-20 aspect-[7/10] bg-stone-200 rounded-md overflow-hidden flex-shrink-0 relative">
                        <img src="${event.imageUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy">
                        <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                    </div>
                    <div class="flex-1 flex flex-col justify-center">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-brand-900 font-bold text-xs uppercase tracking-wide">${event.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</span>
                            <span class="w-1 h-1 rounded-full bg-stone-300"></span>
                            <span class="text-stone-500 text-xs">${event.time}</span>
                        </div>
                        <h4 class="font-bold text-stone-900 text-lg leading-tight group-hover:text-brand-800 transition-colors">${event.title}</h4>
                        <p class="text-stone-500 text-sm truncate mt-1">${event.location}</p>
                    </div>
                    <div class="flex items-center pr-2 text-stone-300 group-hover:text-brand-900 transition-colors">
                        <i data-lucide="chevron-right" class="w-5 h-5"></i>
                    </div>
                </div>
            `).join('');
            
            loadMoreContainer.classList.remove('hidden');
            futureList.classList.add('hidden'); // Reset visibility
            
            // Fix button listener (remove old one to prevent multiple binds)
            const newBtn = loadMoreBtn.cloneNode(true);
            loadMoreBtn.parentNode.replaceChild(newBtn, loadMoreBtn);
            
            newBtn.addEventListener('click', () => {
                futureList.classList.remove('hidden');
                futureList.classList.add('animate-in', 'fade-in', 'slide-in-from-bottom-4');
                loadMoreContainer.classList.add('hidden');
            });
            
        } else {
            loadMoreContainer.classList.add('hidden');
            futureList.innerHTML = '';
        }
    }
    
    // Refresh Icons (Lucide)
    if (window.lucide) window.lucide.createIcons();
}

function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-month').selectedIndex = 0;
    document.getElementById('filter-category').selectedIndex = 0;
    document.getElementById('filter-location').selectedIndex = 0;
    renderEvents();
}

// Modal Logic
window.closeModal = function() {
    document.getElementById('event-modal').classList.add('hidden');
}

// Global click listener for event modal delegation
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-open-modal');
    if (btn) {
        const id = btn.dataset.id;
        const event = sheetEvents.find(ev => ev.id === id);
        if (event) openModal(event);
    }
});

function openModal(event) {
    const modal = document.getElementById('event-modal');
    modal.classList.remove('hidden');

    // Ensure details section is visible (might be hidden by Content Modal logic)
    document.getElementById('modal-event-details').classList.remove('hidden');

    document.getElementById('modal-title').innerText = event.title;
    document.getElementById('modal-subtitle').innerText = event.subtitle || "";
    document.getElementById('modal-category').innerText = event.category;
    document.getElementById('modal-img').src = event.imageUrl;
    
    // Details
    document.getElementById('modal-date').innerText = event.date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('modal-time').innerText = event.time;
    document.getElementById('modal-location').innerText = event.location;
    
    // Organizer
    const orgContainer = document.getElementById('modal-organizer-container');
    if (event.organizer) {
        orgContainer.classList.remove('hidden');
        document.getElementById('modal-organizer').innerText = event.organizer;
    } else {
        orgContainer.classList.add('hidden');
    }

    document.getElementById('modal-desc').innerText = event.description;
}

// Close modal on ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// JSON-LD SEO
function updateJsonLd(events) {
    const script = document.getElementById('events-json-ld');
    if (script) {
        const schema = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": events.map((e, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "Event",
                    "name": e.title,
                    "startDate": e.date.toISOString().split('T')[0],
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
        script.textContent = JSON.stringify(schema);
    }
}

// Chat Widget
window.toggleChat = function() {
    const chatWindow = document.getElementById('chat-window');
    const toggleBtn = document.getElementById('chat-toggle');
    chatWindow.classList.toggle('hidden');
    toggleBtn.classList.toggle('hidden');
}

// Gemini Logic (Basic)
let CURRENT_EVENTS_CONTEXT = [];
function updateGeminiContext(events) {
    CURRENT_EVENTS_CONTEXT = events.map(e => ({
        title: e.title,
        date: e.date.toISOString().split('T')[0],
        desc: e.description,
        loc: e.location
    }));
}

// Import Google GenAI (using global import map)
import { GoogleGenAI } from "@google/genai";

window.sendChatMessage = async function() {
    const input = document.getElementById('chat-input');
    const messagesDiv = document.getElementById('chat-messages');
    const userMsg = input.value.trim();
    
    if (!userMsg) return;

    // Add User Message
    messagesDiv.innerHTML += `
        <div class="flex justify-end"><div class="max-w-[80%] bg-brand-900 text-white rounded-2xl rounded-br-none px-4 py-2.5 text-sm shadow-sm">${userMsg}</div></div>
    `;
    input.value = '';
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Loading State
    const loadingId = 'loading-' + Date.now();
    messagesDiv.innerHTML += `
        <div id="${loadingId}" class="flex justify-start"><div class="bg-white border border-stone-200 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1"><div class="w-2 h-2 bg-stone-400 rounded-full animate-bounce"></div><div class="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div><div class="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div></div></div>
    `;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // API Call
    try {
        // NOTE: In production, API Key should be handled securely. For GitHub Pages static demo, we check localStorage or prompt.
        let apiKey = localStorage.getItem('GEMINI_API_KEY');
        if (!apiKey) {
             // For demo purposes only
             const userKey = prompt("Per usare la chat AI, inserisci la tua API Key di Google Gemini (non sarà salvata sul server):");
             if (userKey) {
                 localStorage.setItem('GEMINI_API_KEY', userKey);
                 apiKey = userKey;
             } else {
                 throw new Error("API Key mancante");
             }
        }

        const ai = new GoogleGenAI({ apiKey: apiKey });
        const contextString = `Oggi è: ${new Date().toLocaleDateString()}. Eventi attuali ad Avigliano Umbro: ${JSON.stringify(CURRENT_EVENTS_CONTEXT)}. Rispondi in italiano, sii gentile e turistico.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${contextString}\nDomanda Utente: ${userMsg}`,
        });

        const reply = response.text || "Non ho capito, riprova.";
        
        document.getElementById(loadingId).remove();
        messagesDiv.innerHTML += `
            <div class="flex justify-start"><div class="max-w-[80%] bg-white text-stone-800 border border-stone-200 rounded-2xl rounded-bl-none px-4 py-2.5 text-sm shadow-sm leading-relaxed">${reply}</div></div>
        `;

    } catch (e) {
        document.getElementById(loadingId).remove();
        messagesDiv.innerHTML += `
            <div class="flex justify-start"><div class="max-w-[80%] bg-red-50 text-red-600 border border-red-100 rounded-2xl rounded-bl-none px-4 py-2.5 text-sm shadow-sm">Errore: ${e.message}. Riprova.</div></div>
        `;
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Success Box Logic
function checkSuccessParam() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === '1') {
        const successBox = document.getElementById('contact-success-message');
        const contactForm = document.getElementById('contact-form');
        if (successBox) successBox.classList.remove('hidden');
        if (contactForm) contactForm.reset();
        
        // Clean URL
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + "#contatti";
        window.history.pushState({path:newUrl},'',newUrl);
    }
}

// FormSubmit Redirect URL Logic
function setFormRedirect() {
    const nextInput = document.getElementById('form-next-url');
    if (nextInput) {
        // Constructs current URL + ?success=1#contatti
        const currentUrl = window.location.href.split('#')[0].split('?')[0];
        nextInput.value = `${currentUrl}?success=1#contatti`;
    }
}

// Cammino Configurator Logic
window.updateCamminoTimeline = function() {
    const timeline = document.getElementById('cammino-timeline');
    if (!timeline) return;

    // Get values
    const mode = document.querySelector('input[name="mode"]:checked').value; // 'foot' or 'bike'
    const duration = document.querySelector('input[name="duration"]:checked').value; // '2', '3', '4'

    // Mock Data for Stages
    const stagesData = {
        '2': [
            { title: "Tappa 1: Avigliano - Sismano", km: "40 km", desc: "Una tappa intensa attraverso i boschi." },
            { title: "Tappa 2: Sismano - Avigliano", km: "40 km", desc: "Ritorno chiudendo l'anello." }
        ],
        '3': [
            { title: "Tappa 1: Avigliano - Toscolano", km: "25 km", desc: "Salita panoramica verso il borgo circolare." },
            { title: "Tappa 2: Toscolano - Dunarobba", km: "30 km", desc: "Passaggio per la Foresta Fossile." },
            { title: "Tappa 3: Dunarobba - Avigliano", km: "25 km", desc: "Rientro dolce tra gli uliveti." }
        ],
        '4': [
            { title: "Tappa 1: Avigliano - Santa Restituta", km: "18 km", desc: "Breve tappa per godersi la Grotta Bella." },
            { title: "Tappa 2: Santa Restituta - Toscolano", km: "22 km", desc: "Attraverso i castagneti secolari." },
            { title: "Tappa 3: Toscolano - Sismano", km: "20 km", desc: "Vista sul castello medievale." },
            { title: "Tappa 4: Sismano - Avigliano", km: "20 km", desc: "Ultimo sforzo verso casa." }
        ]
    };

    const currentStages = stagesData[duration];
    const modeIcon = mode === 'bike' ? 'bike' : 'footprints';

    timeline.innerHTML = currentStages.map((stage, idx) => `
        <div class="relative pl-8 pb-8 last:pb-0 animate-in slide-in-from-left-2 fade-in" style="animation-delay: ${idx * 100}ms">
            <!-- Dot -->
            <div class="absolute -left-[11px] top-0 w-6 h-6 rounded-full bg-white border-4 border-emerald-500 shadow-sm z-10"></div>
            
            <!-- Card -->
            <div class="bg-white p-4 rounded-xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-stone-800 text-sm md:text-base">${stage.title}</h4>
                    <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md whitespace-nowrap">${stage.km}</span>
                </div>
                <p class="text-xs text-stone-500">${stage.desc}</p>
                 <div class="mt-2 flex items-center gap-2 text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                    <i data-lucide="${modeIcon}" class="w-3 h-3"></i> ${mode === 'bike' ? 'Sterrato/Asfalto' : 'Sentiero'}
                </div>
            </div>
        </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

// INIT
document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the page with content CMS
    if (document.querySelector('[data-content-id]')) {
        loadContentCMS();
    }
    
    // Check if we are on events page (main index)
    if (document.getElementById('eventi-section')) {
        fetchEventsFromSheet();
    }

    // Check contact form success
    checkSuccessParam();
    setFormRedirect();

    // Check cammino page
    if (document.getElementById('cammino-timeline')) {
        window.updateCamminoTimeline();
    }
    
    // Icons
    if (window.lucide) window.lucide.createIcons();
});