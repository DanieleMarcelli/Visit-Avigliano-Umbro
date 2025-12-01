import { GoogleGenAI } from "@google/genai";

// --- CONFIGURATION ---
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=0&single=true&output=csv"; 
const CONTENT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv";

// --- STATE ---
let events = [];
let pendingEvents = [];
let cmsData = {}; 
let chatHistory = [{ role: 'bot', text: "Ciao! Sono il tuo assistente virtuale. Cerchi un evento o info sul territorio?" }];

const CAMMINO_STAGES = {
    "3": [
        { title: "Avigliano - Sismano", km: "15 km", diff: "+450m", desc: "Partenza dalla Piazza del Municipio." },
        { title: "Sismano - Dunarobba", km: "22 km", diff: "+600m", desc: "Attraversamento dei boschi di castagno." },
        { title: "Dunarobba - Avigliano", km: "18 km", diff: "+350m", desc: "Chiusura dell'anello passando per la Grotta Bella." }
    ],
    "2": [
        { title: "Avigliano - Dunarobba (Fast)", km: "35 km", diff: "+1100m", desc: "Tappa sfidante che unisce storia e natura." },
        { title: "Dunarobba - Avigliano", km: "25 km", diff: "+600m", desc: "Rientro panoramico." }
    ],
    "4": [
        { title: "Avigliano - Toscolano", km: "12 km", diff: "+300m", desc: "Inizio dolce verso il borgo circolare." },
        { title: "Toscolano - Sismano", km: "14 km", diff: "+400m", desc: "Immersione nella macchia mediterranea." },
        { title: "Sismano - Dunarobba", km: "15 km", diff: "+350m", desc: "Giornata dedicata alla geologia." },
        { title: "Dunarobba - Avigliano", km: "14 km", diff: "+250m", desc: "Rientro rilassante." }
    ]
};

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

// --- CORE FUNCTIONS ---

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
                const elements = document.querySelectorAll(`[data-content-id="${id}"]`);
                elements.forEach(element => {
                    if (contentText) {
                        element.tagName === 'INPUT' ? element.placeholder = contentText : element.innerHTML = contentText;
                    }
                    if (imageUrl) {
                        const formattedUrl = formatImageUrl(imageUrl);
                        element.tagName === 'IMG' ? element.src = formattedUrl : element.style.backgroundImage = `url('${formattedUrl}')`;
                    }
                    element.classList.remove('opacity-0');
                    // If it's the hero opacity animation, trigger it
                    if(element.classList.contains('animate-fade-in-up')) {
                        element.style.opacity = '1';
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
            // CSV Columns based on typical structure: Date, Time, Title, Subtitle, Desc, Location, Category, Image
            return {
                id: `evt-${index}`,
                date: cols[0],
                time: cols[1],
                title: cols[2],
                location: cols[5],
                category: cols[6],
                imageUrl: formatImageUrl(cols[7]) || 'https://picsum.photos/800/600',
            };
        });
    } catch (error) { console.error(error); return []; }
}

// --- RENDERING ---

function renderEventCard(e) {
    const d = new Date(e.date);
    const day = !isNaN(d) ? d.getDate() : "?";
    const month = !isNaN(d) ? d.toLocaleString('it-IT', { month: 'short' }).toUpperCase() : "";

    return `
        <div class="snap-center shrink-0 min-w-[280px] md:min-w-0 w-[280px] md:w-auto relative aspect-[7/10] bg-deep-900 rounded-2xl overflow-hidden group cursor-pointer border border-white/5 hover:border-neon-400/50 transition-all duration-300 shadow-lg">
            <img src="${e.imageUrl}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
            
            <div class="absolute inset-0 bg-gradient-to-t from-deep-950 via-deep-950/50 to-transparent"></div>
            
            <div class="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white border border-white/10 z-10">
                ${e.category}
            </div>

            <div class="absolute bottom-0 left-0 p-6 w-full z-10">
                <div class="flex items-end gap-4 mb-2">
                    <div class="text-neon-400 font-serif text-5xl leading-none font-bold drop-shadow-lg">${day}</div>
                    <div class="text-slate-300 font-bold text-xs uppercase tracking-widest mb-1 border-l border-slate-600 pl-2 shadow-black">${month}</div>
                </div>
                <h3 class="text-xl font-serif text-white leading-tight mb-2 group-hover:text-neon-400 transition-colors line-clamp-2 drop-shadow-md">${e.title}</h3>
                <p class="text-slate-400 text-xs flex items-center gap-2">
                    <i data-lucide="map-pin" class="w-3 h-3"></i> ${e.location}
                </p>
            </div>
        </div>
    `;
}

function renderCompactEvent(e) {
    const d = new Date(e.date);
    const dateStr = !isNaN(d) ? d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) : e.date;

    return `
        <div class="flex gap-4 p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group">
            <div class="w-16 h-20 rounded-lg bg-deep-900 overflow-hidden shrink-0">
                <img src="${e.imageUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
            </div>
            <div class="flex flex-col justify-center">
                <span class="text-neon-400 text-xs font-bold uppercase tracking-widest mb-1">${dateStr}</span>
                <h4 class="text-white font-serif text-lg leading-tight group-hover:text-gold-400 transition-colors">${e.title}</h4>
                <span class="text-slate-500 text-xs mt-1 flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${e.location}</span>
            </div>
        </div>
    `;
}

// --- GLOBAL EXPORTS ---

window.showAllEvents = () => {
    const listContainer = document.getElementById('events-hidden-list');
    const btnContainer = document.getElementById('load-more-container');
    
    listContainer.innerHTML = '';
    pendingEvents.forEach(e => {
        listContainer.insertAdjacentHTML('beforeend', renderCompactEvent(e));
    });
    
    listContainer.classList.remove('hidden');
    btnContainer.style.display = 'none';
    if (window.lucide) window.lucide.createIcons();
};

window.toggleChat = () => {
    const win = document.getElementById('gemini-chat');
    if(win) win.classList.toggle('hidden');
};

window.sendChatMessage = () => {
    const input = document.getElementById('chat-input');
    const container = document.getElementById('chat-messages');
    const text = input.value.trim();
    if(!text) return;

    // Add User Message
    container.insertAdjacentHTML('beforeend', `<div class="bg-brand-900 p-3 rounded-lg rounded-tr-none text-white ml-auto border border-white/5">${text}</div>`);
    input.value = '';
    
    // Simulate AI Response (Fallback if no key)
    setTimeout(() => {
        const reply = "Grazie per la tua domanda! Al momento sono in modalità demo, ma presto potrò darti informazioni dettagliate sugli eventi e il territorio.";
        container.insertAdjacentHTML('beforeend', `<div class="bg-white/5 p-3 rounded-lg rounded-tl-none border border-white/5">${reply}</div>`);
        container.scrollTop = container.scrollHeight;
    }, 1000);
}

window.toggleMobileMenu = () => {
    const menu = document.getElementById('mobile-menu-overlay');
    if (menu) menu.classList.toggle('hidden');
    document.body.classList.toggle('overflow-hidden');
};

window.updateCamminoTimeline = () => {
    const container = document.getElementById('cammino-timeline');
    if (!container) return;

    const durationInput = document.querySelector('input[name="duration"]:checked');
    const duration = durationInput ? durationInput.value : "3";
    const stages = CAMMINO_STAGES[duration] || CAMMINO_STAGES["3"];
    
    container.innerHTML = '';
    stages.forEach((stage, index) => {
        const isLast = index === stages.length - 1;
        const html = `
            <div class="relative pl-8 pb-10 ${isLast ? '' : 'border-l-2 border-white/10'} ml-2 fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-neon-400 border-4 border-deep-900 shadow-md"></div>
                <h4 class="text-xl font-serif font-bold text-white mb-1">${stage.title}</h4>
                <div class="flex items-center gap-4 text-xs font-bold text-neon-400 uppercase tracking-wider mb-3">
                    <span class="bg-neon-400/10 border border-neon-400/20 px-2 py-1 rounded">${stage.km}</span>
                    <span class="bg-neon-400/10 border border-neon-400/20 px-2 py-1 rounded">${stage.diff}</span>
                </div>
                <p class="text-slate-400 text-sm leading-relaxed">${stage.desc}</p>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
};

// --- INIT ---

document.addEventListener('DOMContentLoaded', async () => {
    await loadContentCMS();
    
    // Init Cammino
    if(document.getElementById('cammino-timeline')) window.updateCamminoTimeline();

    // Init Events
    const rawEvents = await fetchEventsFromSheet();
    const today = new Date(); today.setHours(0,0,0,0);
    
    // Filter past events
    events = rawEvents.filter(e => {
        // Simple date parsing assuming YYYY-MM-DD
        const d = new Date(e.date);
        return !isNaN(d) && d >= today;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));

    // Render Events
    const container = document.getElementById('events-main-grid');
    if(container && events.length > 0) {
        container.innerHTML = ''; // Clear skeletons
        
        // Render Top 4
        events.slice(0, 4).forEach(e => {
            container.insertAdjacentHTML('beforeend', renderEventCard(e));
        });

        // Handle Remaining Events
        pendingEvents = events.slice(4);
        const btnContainer = document.getElementById('load-more-container');
        
        if (pendingEvents.length > 0 && btnContainer) {
            btnContainer.classList.remove('hidden');
        } else if (btnContainer) {
            btnContainer.classList.add('hidden');
        }
    } else if (container) {
         container.innerHTML = '<div class="col-span-4 text-center text-slate-500 py-10">Nessun evento in programma al momento.</div>';
    }
    
    if (window.lucide) window.lucide.createIcons();
});