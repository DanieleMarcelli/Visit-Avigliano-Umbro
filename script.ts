import { GoogleGenAI } from "@google/genai";
import { CAMMINO_STAGE_FIELDS, CamminoStage, fetchCamminoStages } from './services/camminoService.ts';

// --- CONFIGURATION ---
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=0&single=true&output=csv"; 
const CONTENT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv";

// --- STATE ---
let events: any[] = [];
let pendingEvents: any[] = [];
let cmsData: Record<string, { text?: string; image?: string }> = {};
let camminoStages: CamminoStage[] = [];
let chatHistory = [{ role: 'bot', text: "Ciao! Sono il tuo assistente virtuale. Cerchi un evento o info sul territorio?" }];

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

const toNumber = (value?: string) => {
    if (!value) return 0;
    const numeric = value.replace(/,/g, '.').match(/[\d.]+/);
    return numeric ? parseFloat(numeric[0]) : 0;
};

const withUnit = (value: string, unit: string) => {
    if (!value) return '';
    return /[a-zA-Z]/.test(value) ? value : `${value} ${unit}`;
};

const getStageValue = (stage: CamminoStage, key: keyof CamminoStage) => stage[key] || '';

const getStageTotals = (stages: CamminoStage[]) => {
    const distance = stages.reduce((sum, stage) => sum + toNumber(getStageValue(stage, CAMMINO_STAGE_FIELDS['Distanza (km)'])), 0);
    const elevation = stages.reduce((sum, stage) => sum + toNumber(getStageValue(stage, CAMMINO_STAGE_FIELDS['Dislivello (m)'])), 0);
    return { distance, elevation, count: stages.length };
};

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
                // Store in global object for modal use
                cmsData[id] = { text: contentText, image: imageUrl };

                // Update DOM elements
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

const renderStageCard = (stage: CamminoStage, index: number) => {
    const title = getStageValue(stage, CAMMINO_STAGE_FIELDS['Tappa']) || `Tappa ${index + 1}`;
    const from = getStageValue(stage, CAMMINO_STAGE_FIELDS['Da']);
    const to = getStageValue(stage, CAMMINO_STAGE_FIELDS['A']);
    const distance = getStageValue(stage, CAMMINO_STAGE_FIELDS['Distanza (km)']);
    const elevation = getStageValue(stage, CAMMINO_STAGE_FIELDS['Dislivello (m)']);
    const time = getStageValue(stage, CAMMINO_STAGE_FIELDS['Tempo stimato']);
    const difficulty = getStageValue(stage, CAMMINO_STAGE_FIELDS['Difficoltà']);
    const towns = getStageValue(stage, CAMMINO_STAGE_FIELDS['Comuni interessati']);
    const poi = getStageValue(stage, CAMMINO_STAGE_FIELDS['Punti di interesse']);
    const description = getStageValue(stage, CAMMINO_STAGE_FIELDS['Descrizione']);
    const image = formatImageUrl(getStageValue(stage, CAMMINO_STAGE_FIELDS['Immagine']));

    const subtitle = [from, to].filter(Boolean).length === 2 ? `Da ${from} a ${to}` : from || to;

    return `
        <div class="relative bg-deep-900 border border-white/5 rounded-2xl overflow-hidden shadow-lg group">
            ${image ? `<div class="absolute inset-0"> <div class="absolute inset-0 bg-gradient-to-t from-deep-950 via-deep-950/70 to-transparent z-[1]"></div><img src="${image}" class="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition duration-700" loading="lazy" /> </div>` : ''}
            <div class="relative z-[2] p-6 space-y-4">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <p class="text-[10px] uppercase tracking-[0.3em] text-gold-400 font-bold mb-1">Tappa ${index + 1}</p>
                        <h3 class="text-xl font-serif text-white leading-tight">${title}</h3>
                        ${subtitle ? `<p class="text-sm text-slate-400">${subtitle}</p>` : ''}
                    </div>
                    ${difficulty ? `<span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/10 border border-white/10 text-white">${difficulty}</span>` : ''}
                </div>
                <div class="flex flex-wrap gap-2 text-[11px] uppercase tracking-widest font-bold text-slate-200">
                    ${distance ? `<span class="bg-white/10 border border-white/10 px-3 py-1 rounded-full">${withUnit(distance, 'km')}</span>` : ''}
                    ${elevation ? `<span class="bg-white/10 border border-white/10 px-3 py-1 rounded-full">${withUnit(elevation, 'm D+')}</span>` : ''}
                    ${time ? `<span class="bg-white/10 border border-white/10 px-3 py-1 rounded-full">${time}</span>` : ''}
                </div>
                ${description ? `<p class="text-slate-300 text-sm leading-relaxed">${description}</p>` : ''}
                ${(towns || poi) ? `<div class="text-xs text-slate-400 space-y-1">
                    ${towns ? `<p class="flex items-center gap-2"><i data-lucide="map-pin" class="w-3 h-3"></i><span>${towns}</span></p>` : ''}
                    ${poi ? `<p class="flex items-center gap-2"><i data-lucide="sparkles" class="w-3 h-3"></i><span>${poi}</span></p>` : ''}
                </div>` : ''}
            </div>
        </div>
    `;
};

const updateCamminoSummary = () => {
    const summaryEl = document.getElementById('cammino-summary');
    if (!summaryEl || camminoStages.length === 0) return;

    const { distance, elevation, count } = getStageTotals(camminoStages);
    const distanceLabel = distance ? `${distance.toFixed(1)} km` : '';
    const elevationLabel = elevation ? `${Math.round(elevation)} m D+` : '';
    const badgeText = [distanceLabel, elevationLabel, count ? `${count} tappe` : ''].filter(Boolean).join(' · ');

    summaryEl.textContent = badgeText;
    summaryEl.classList.remove('hidden');
};

const renderCamminoStages = () => {
    const container = document.getElementById('cammino-timeline');
    if (!container) return;

    if (camminoStages.length === 0) {
        container.innerHTML = '<div class="text-sm text-slate-500 text-center py-8">Caricamento itinerario...</div>';
        return;
    }

    container.innerHTML = '';
    camminoStages.forEach((stage, index) => {
        container.insertAdjacentHTML('beforeend', renderStageCard(stage, index));
    });

    if (window.lucide) window.lucide.createIcons();
};

// --- GLOBAL EXPORTS ---

window.openModal = (baseId) => {
    const modal = document.getElementById('content-modal');
    if(!modal) return;
    
    // Attempt to grab content from CMS Data or fallback to DOM
    // The convention is: ID_title, ID_desc, ID_img
    
    let title = "Dettaglio";
    let desc = "Descrizione non disponibile.";
    let img = "https://via.placeholder.com/800x600";

    // Try finding via DOM if CMS data isn't fully ready or for fallback
    const domTitle = document.querySelector(`[data-content-id="${baseId}_title"]`);
    const domImg = document.querySelector(`[data-content-id="${baseId}_img"]`);
    // For description, we often have a separate ID for the full modal description in CMS, 
    // but if not, we might use the short desc or a placeholder.
    // Let's check cmsData first.
    
    if (cmsData[`${baseId}_title`]) title = cmsData[`${baseId}_title`].text;
    else if (domTitle) title = domTitle.innerText;

    if (cmsData[`${baseId}_img`]) img = formatImageUrl(cmsData[`${baseId}_img`].image);
    else if (domImg) img = domImg.src;

    // Description is the tricky part. We prefer a 'full' description from CMS
    if (cmsData[`${baseId}_desc`]) desc = cmsData[`${baseId}_desc`].text;
    
    document.getElementById('modal-title').innerHTML = title;
    document.getElementById('modal-desc').innerHTML = desc;
    document.getElementById('modal-img').src = img;
    document.getElementById('modal-subtitle').innerText = "Esplora";

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

    container.insertAdjacentHTML('beforeend', `<div class="bg-brand-900 p-3 rounded-lg rounded-tr-none text-white ml-auto border border-white/5 text-right max-w-[80%]">${text}</div>`);
    input.value = '';
    
    setTimeout(() => {
        const reply = "Grazie per il messaggio! Sono un assistente demo. Per informazioni ufficiali su eventi e orari, ti consiglio di controllare le sezioni dedicate del sito o contattare il Comune.";
        container.insertAdjacentHTML('beforeend', `<div class="bg-white/5 p-3 rounded-lg rounded-tl-none border border-white/5 text-left max-w-[80%]">${reply}</div>`);
        container.scrollTop = container.scrollHeight;
    }, 800);
}

window.toggleMobileMenu = () => {
    const menu = document.getElementById('mobile-menu-overlay');
    if (menu) menu.classList.toggle('hidden');
    document.body.classList.toggle('overflow-hidden');
};

const loadCamminoStages = async () => {
    const container = document.getElementById('cammino-timeline');
    if (container) container.innerHTML = '<div class="text-sm text-slate-500 text-center py-8">Caricamento itinerario...</div>';

    try {
        const stages = await fetchCamminoStages();
        camminoStages = stages.filter(stage => Object.values(stage).some(Boolean));
        renderCamminoStages();
        updateCamminoSummary();
    } catch (error) {
        console.error('Errore nel caricamento delle tappe:', error);
        if (container) container.innerHTML = '<div class="text-sm text-rose-200 text-center py-8">Impossibile caricare le tappe dal CSV. Riprova più tardi.</div>';
    }
};

window.updateCamminoTimeline = () => {
    renderCamminoStages();
};

// --- INIT ---

document.addEventListener('DOMContentLoaded', async () => {
    await loadContentCMS();
    
    if(document.getElementById('cammino-timeline')) await loadCamminoStages();

    const rawEvents = await fetchEventsFromSheet();
    const today = new Date(); today.setHours(0,0,0,0);
    
    events = rawEvents.filter(e => {
        const d = new Date(e.date);
        return !isNaN(d) && d >= today;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));

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