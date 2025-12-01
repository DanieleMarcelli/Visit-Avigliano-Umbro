import { GoogleGenAI } from "@google/genai";

// --- CONFIGURATION ---
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=0&single=true&output=csv"; 
const CONTENT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv";

// --- STATE ---
let events = [];
let pendingEvents = [];
let cmsData = {}; 

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

// --- ROBUST PARSER ---
// Fixes the issue where empty columns (e.g. ID,,LINK) caused data shifts
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
    result.push(cell.trim()); // Push the last cell
    
    // Clean quotes
    return result.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
}

function formatImageUrl(url) {
    if (!url) return ''; 
    // Fix Google Drive Links to be usable as images
    if (url.includes('drive.google.com') || url.includes('/d/')) {
        const idMatch = url.match(/\/d\/(.+?)\/|id=(.+?)&|id=(.+?)$/);
        const id = idMatch ? (idMatch[1] || idMatch[2] || idMatch[3]) : null;
        if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w2000`;
    }
    return url;
}

// --- CMS LOADER ---
async function loadContentCMS() {
    if (!CONTENT_CSV_URL) return;
    try {
        const response = await fetch(CONTENT_CSV_URL);
        const text = await response.text();
        const rows = text.split('\n').filter(r => r.trim() !== '');
        
        // Skip Header row
        rows.slice(1).forEach(row => {
            // Apply Robust Parser
            const cols = parseCSVLine(row);
            
            // Expected: Col 0 = ID, Col 1 = Text, Col 2 = Image
            const id = cols[0];       
            const contentText = cols[1]; 
            const imageUrl = cols[2];    

            if (id) {
                // Store for Modals
                cmsData[id] = { text: contentText, image: imageUrl };

                // Update DOM Elements with matching data-content-id
                const elements = document.querySelectorAll(`[data-content-id="${id}"]`);
                elements.forEach(element => {
                    // Update Text
                    if (contentText) {
                        if (element.tagName === 'INPUT') element.placeholder = contentText;
                        else element.innerHTML = contentText;
                    }
                    
                    // Update Image/BG
                    if (imageUrl) {
                        const formattedUrl = formatImageUrl(imageUrl);
                        if (element.tagName === 'IMG') {
                            element.src = formattedUrl;
                            element.onload = () => element.classList.remove('opacity-0');
                        } else {
                            element.style.backgroundImage = `url('${formattedUrl}')`;
                            element.classList.remove('opacity-0');
                        }
                    } else if (element.classList.contains('opacity-0') && contentText) {
                         // Fade in text-only elements
                         element.classList.remove('opacity-0');
                    }
                });
            }
        });
        
        // Ensure Lucide icons re-render if inserted via HTML
        if (window.lucide) window.lucide.createIcons();

    } catch (e) { console.error("CMS Error:", e); }
}

// --- EVENTS LOADER ---
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
                desc: cols[4],
                location: cols[5],
                category: cols[6],
                imageUrl: formatImageUrl(cols[7]) || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800',
            };
        });
    } catch (error) { console.error(error); return []; }
}

// --- RENDERERS ---

function renderEventCard(e) {
    const d = new Date(e.date);
    const day = !isNaN(d) ? d.getDate() : "?";
    const month = !isNaN(d) ? d.toLocaleString('it-IT', { month: 'short' }).toUpperCase() : "";

    return `
        <div class="snap-center shrink-0 min-w-[280px] md:min-w-0 w-[280px] md:w-auto relative aspect-[7/10] bg-deep-800 rounded-2xl overflow-hidden group cursor-pointer border border-white/5 hover:border-gold-500/50 transition-all duration-300 shadow-xl">
            <img src="${e.imageUrl}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100" loading="lazy" />
            <div class="absolute inset-0 bg-gradient-to-t from-deep-950 via-deep-950/40 to-transparent"></div>
            
            <div class="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white border border-white/10 z-10">
                ${e.category}
            </div>
            
            <div class="absolute bottom-0 left-0 p-6 w-full z-10">
                <div class="flex items-end gap-3 mb-2">
                    <span class="text-gold-400 font-serif text-4xl leading-none font-bold">${day}</span>
                    <span class="text-slate-300 font-bold text-xs uppercase tracking-widest mb-1 border-l border-white/20 pl-2">${month}</span>
                </div>
                <h3 class="text-xl font-serif text-white leading-tight mb-2 group-hover:text-gold-400 transition-colors line-clamp-2">${e.title}</h3>
                <p class="text-slate-400 text-xs flex items-center gap-2 line-clamp-1">
                    <i data-lucide="map-pin" class="w-3 h-3 text-gold-500"></i> ${e.location}
                </p>
            </div>
        </div>
    `;
}

function renderCompactEvent(e) {
    const d = new Date(e.date);
    const dateStr = !isNaN(d) ? d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) : e.date;

    return `
        <div class="flex gap-4 p-4 bg-deep-800 border border-white/5 rounded-xl hover:border-gold-500/30 transition-colors cursor-pointer group items-center">
            <div class="w-20 h-20 rounded-lg bg-deep-950 overflow-hidden shrink-0 relative">
                <img src="${e.imageUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
            </div>
            <div class="flex flex-col">
                <span class="text-gold-400 text-[10px] font-bold uppercase tracking-widest mb-1">${dateStr}</span>
                <h4 class="text-white font-serif text-lg leading-tight group-hover:text-gold-400 transition-colors line-clamp-1">${e.title}</h4>
                <span class="text-slate-500 text-xs mt-1 flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${e.location}</span>
            </div>
        </div>
    `;
}

// --- GLOBAL EXPORTS (For HTML onclick) ---

window.openModal = (baseId) => {
    const modal = document.getElementById('content-modal');
    if(!modal) return;
    
    // Logic: 
    // 1. Try to find keys in CMS Data (robust approach)
    // 2. Fallback to DOM elements if CMS isn't ready
    
    // Keys convention in CSV: "prefix", "prefix_title", "prefix_desc", "prefix_img"
    const titleKey = `${baseId}_title`;
    const descKey = `${baseId}_desc`; // Specific desc key
    const imgKey = `${baseId}_img`;
    
    let title = "Dettaglio";
    let desc = "Descrizione non disponibile.";
    let img = "https://via.placeholder.com/800x600";

    // Title
    if (cmsData[titleKey]?.text) title = cmsData[titleKey].text;
    else if (cmsData[baseId]?.text) title = cmsData[baseId].text; // Fallback to base ID text

    // Image
    if (cmsData[imgKey]?.image) img = formatImageUrl(cmsData[imgKey].image);
    else if (cmsData[baseId]?.image) img = formatImageUrl(cmsData[baseId].image); // Fallback to base ID img

    // Description (often in CSV the main ID row has the desc if it's a Bento item, or a separate _desc ID)
    if (cmsData[descKey]?.text) desc = cmsData[descKey].text;
    else if (cmsData[baseId]?.text && cmsData[baseId]?.text !== title) desc = cmsData[baseId].text;

    // Set DOM
    document.getElementById('modal-title').innerHTML = title;
    document.getElementById('modal-desc').innerHTML = desc; // Allow HTML in desc
    document.getElementById('modal-img').src = img;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeModal = () => {
    const modal = document.getElementById('content-modal');
    if(modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
};

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

    container.insertAdjacentHTML('beforeend', `<div class="bg-deep-800 p-3 rounded-lg rounded-tr-none text-white ml-auto border border-white/5 text-right max-w-[80%] mb-2 shadow">${text}</div>`);
    input.value = '';
    container.scrollTop = container.scrollHeight;
    
    setTimeout(() => {
        const reply = "Questa è una demo. In futuro l'AI risponderà utilizzando l'API di Gemini.";
        container.insertAdjacentHTML('beforeend', `<div class="bg-white/5 p-3 rounded-lg rounded-tl-none border border-white/5 text-left max-w-[80%] mb-2">${reply}</div>`);
        container.scrollTop = container.scrollHeight;
    }, 600);
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
                <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-cyan-400 border-4 border-deep-900 shadow-md"></div>
                <h4 class="text-xl font-serif font-bold text-white mb-1">${stage.title}</h4>
                <div class="flex items-center gap-4 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">
                    <span class="bg-cyan-400/10 border border-cyan-400/20 px-2 py-1 rounded">${stage.km}</span>
                    <span class="bg-cyan-400/10 border border-cyan-400/20 px-2 py-1 rounded">${stage.diff}</span>
                </div>
                <p class="text-slate-400 text-sm leading-relaxed">${stage.desc}</p>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
};

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load CMS Content
    await loadContentCMS();
    
    // 2. Cammino Timeline (if on page)
    if(document.getElementById('cammino-timeline')) window.updateCamminoTimeline();

    // 3. Load Events
    const rawEvents = await fetchEventsFromSheet();
    const today = new Date(); today.setHours(0,0,0,0);
    
    // Filter past events
    events = rawEvents.filter(e => {
        const d = new Date(e.date);
        return !isNaN(d) && d >= today;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));

    // Render Events
    const container = document.getElementById('events-main-grid');
    if(container && events.length > 0) {
        container.innerHTML = ''; 
        events.slice(0, 4).forEach(e => {
            container.insertAdjacentHTML('beforeend', renderEventCard(e));
        });
        
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