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
    } catch (error) { return []; }
}

// --- GLOBAL EXPORTS ---

window.loadMoreEvents = () => {
    const container = document.getElementById('events-container');
    const btnContainer = document.getElementById('load-more-container');
    
    pendingEvents.forEach(e => {
        container.insertAdjacentHTML('beforeend', renderEventCard(e));
    });
    
    if (window.lucide) window.lucide.createIcons();
    btnContainer.style.display = 'none';
};

window.toggleChat = () => {
    const win = document.getElementById('chat-window');
    if(win) win.classList.toggle('hidden');
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
                <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-neon border-4 border-abyss shadow-md"></div>
                <h4 class="text-xl font-serif font-bold text-white mb-1">${stage.title}</h4>
                <div class="flex items-center gap-4 text-xs font-bold text-neon uppercase tracking-wider mb-3">
                    <span class="bg-neon/10 border border-neon/20 px-2 py-1 rounded">${stage.km}</span>
                    <span class="bg-neon/10 border border-neon/20 px-2 py-1 rounded">${stage.diff}</span>
                </div>
                <p class="text-slate-400 text-sm leading-relaxed">${stage.desc}</p>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
};

function renderEventCard(e) {
    const d = new Date(e.date);
    const day = !isNaN(d) ? d.getDate() : "?";
    const month = !isNaN(d) ? d.toLocaleString('it-IT', { month: 'short' }).toUpperCase() : "";

    return `
        <div class="min-w-[280px] snap-center relative aspect-[7/10] bg-abyss rounded-lg overflow-hidden group cursor-pointer border border-white/5 hover:border-neon/50 transition-all duration-300">
            <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style="background-image: url('${e.imageUrl}')"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/40 to-transparent"></div>
            
            <div class="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white border border-white/10">
                ${e.category}
            </div>

            <div class="absolute bottom-0 left-0 p-6 w-full">
                <div class="flex items-end gap-4 mb-2">
                    <div class="text-neon font-display text-5xl leading-none">${day}</div>
                    <div class="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1 border-l border-slate-600 pl-2">${month}</div>
                </div>
                <h3 class="text-xl font-display text-white leading-tight mb-2 group-hover:text-neon transition-colors line-clamp-2">${e.title}</h3>
                <p class="text-slate-400 text-xs flex items-center gap-2">
                    <i class="fa-solid fa-location-dot"></i> ${e.location}
                </p>
            </div>
        </div>
    `;
}

// --- INIT ---

document.addEventListener('DOMContentLoaded', async () => {
    await loadContentCMS();
    
    // Init Cammino
    if(document.getElementById('cammino-timeline')) window.updateCamminoTimeline();

    // Init Events
    const rawEvents = await fetchEventsFromSheet();
    const today = new Date(); today.setHours(0,0,0,0);
    
    events = rawEvents.filter(e => {
        const d = new Date(e.date);
        return !isNaN(d) && d >= today;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));

    const container = document.getElementById('events-container');
    if(container) {
        container.innerHTML = ''; // Clear skeletons
        events.slice(0, 4).forEach(e => {
            container.insertAdjacentHTML('beforeend', renderEventCard(e));
        });
        pendingEvents = events.slice(4);
        
        const btnContainer = document.getElementById('load-more-container');
        if (pendingEvents.length > 0 && btnContainer) {
            btnContainer.classList.remove('hidden');
        }
    }
    
    if (window.lucide) window.lucide.createIcons();
});