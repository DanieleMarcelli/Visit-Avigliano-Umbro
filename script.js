// CONFIGURATION URLS
const CSV_EVENTS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=0&single=true&output=csv";
const CSV_CONTENT = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv";

// STATE
let cmsData = {}; 
let allEvents = [];
let filteredEvents = [];
let currentCategory = 'Tutti';

// --- PARSER CSV ---
function parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const row = [];
        let currentCell = '';
        let insideQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') { insideQuotes = !insideQuotes; } 
            else if (char === ',' && !insideQuotes) { row.push(currentCell.trim()); currentCell = ''; } 
            else { currentCell += char; }
        }
        row.push(currentCell.trim());
        const cleanedRow = row.map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"'));
        result.push(cleanedRow);
    }
    return result;
}

function formatUrl(url) {
    if (!url) return '';
    if (url.includes('drive.google.com') || url.includes('/d/')) {
        const idMatch = url.match(/\/d\/(.+?)\/|id=(.+?)&|id=(.+?)$/);
        const id = idMatch ? (idMatch[1] || idMatch[2] || idMatch[3]) : null;
        if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w2000`;
    }
    return url;
}

// --- CMS LOADER ---
async function initCMS() {
    try {
        const resp = await fetch(CSV_CONTENT);
        const text = await resp.text();
        const rows = parseCSV(text);
        rows.forEach(row => {
            const id = row[0];
            const textContent = row[1];
            const imgUrl = formatUrl(row[2]);
            if (!id) return;
            cmsData[id] = { text: textContent, img: imgUrl };
            const els = document.querySelectorAll(`[data-content-id="${id}"]`);
            els.forEach(el => {
                if (imgUrl) {
                    if (el.tagName === 'IMG') { el.src = imgUrl; el.onload = () => el.classList.remove('opacity-0'); } 
                    else { el.style.backgroundImage = `url('${imgUrl}')`; el.classList.remove('opacity-0'); }
                }
                if (textContent && !imgUrl) el.innerHTML = textContent;
            });
        });
    } catch (err) { console.error("CMS Error:", err); }
}

// --- EVENTS LOADER ---
async function initEvents() {
    try {
        const resp = await fetch(CSV_EVENTS);
        const text = await resp.text();
        const rows = parseCSV(text);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        // Colonna 8: Organizzatore
        allEvents = rows.map((row, idx) => {
            return {
                id: `evt-${idx}`,
                dateStr: row[0],
                time: row[1] || 'Orario da definire',
                title: row[2],
                subtitle: row[3],
                desc: row[4],
                loc: row[5],
                cat: row[6] || 'Evento',
                img: formatUrl(row[7]) || 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=800',
                organizer: row[8] || 'Comune di Avigliano Umbro'
            };
        })
        .filter(e => {
            const d = new Date(e.dateStr);
            return !isNaN(d) && d >= today;
        })
        .sort((a,b) => new Date(a.dateStr) - new Date(b.dateStr));
        
        renderFilters();
        filterEvents('Tutti');
        
    } catch (err) {
        console.error("Events Error:", err);
        document.getElementById('events-slider').innerHTML = '<div class="w-full text-center text-stone-400 py-10">Errore caricamento.</div>';
    }
}

// --- FILTER LOGIC ---
function renderFilters() {
    const categories = ['Tutti', ...new Set(allEvents.map(e => e.cat))];
    const container = document.getElementById('category-filters');
    container.innerHTML = categories.map(cat => `
        <button onclick="filterEvents('${cat}')" 
            class="filter-btn px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all whitespace-nowrap
            ${cat === currentCategory ? 'bg-bronze-500 text-white border-bronze-500' : 'bg-white text-stone-600 border-stone-200 hover:border-bronze-400'}">
            ${cat}
        </button>
    `).join('');
}

window.filterEvents = (category) => {
    currentCategory = category;
    filteredEvents = category === 'Tutti' ? allEvents : allEvents.filter(e => e.cat === category);
    
    // Update button styles
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if(btn.innerText === category) {
            btn.className = "filter-btn px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all whitespace-nowrap bg-bronze-500 text-white border-bronze-500";
        } else {
            btn.className = "filter-btn px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all whitespace-nowrap bg-white text-stone-600 border-stone-200 hover:border-bronze-400";
        }
    });

    renderEvents();
};

// --- RENDER ---
function renderEvents() {
    const slider = document.getElementById('events-slider');
    slider.innerHTML = '';
    
    const displayEvents = filteredEvents.slice(0, 6);
    const hasMore = filteredEvents.length > 6;
    
    if (displayEvents.length === 0) {
        slider.innerHTML = '<div class="w-full text-center text-stone-400 py-10 font-serif italic">Nessun evento in questa categoria.</div>';
        return;
    }

    displayEvents.forEach(e => {
        const d = new Date(e.dateStr);
        const day = d.getDate();
        const month = d.toLocaleString('it-IT', { month: 'short' }).toUpperCase();
        
        // HOVER EFFECT: group-hover:translate-y-0 reveals description
        const card = `
        <div class="snap-center shrink-0 w-[280px] h-[400px] relative rounded-2xl overflow-hidden group cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 bg-stone-900 border border-stone-200" onclick="openModal('${e.id}')">
            <img src="${e.img}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-100 group-hover:opacity-40">
            <div class="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-80 group-hover:bg-stone-900/80 transition-all duration-500"></div>
            
            <div class="absolute top-4 right-4 bg-white/20 backdrop-blur border border-white/20 px-3 py-1 rounded-full text-[9px] font-bold uppercase text-white tracking-widest shadow-sm">
                ${e.cat}
            </div>

            <div class="absolute bottom-0 left-0 w-full p-6 text-white transition-all duration-500 transform translate-y-[20px] group-hover:translate-y-0">
                <div class="flex items-center gap-3 mb-2 text-bronze-400">
                    <div class="flex flex-col items-center leading-none border-r border-white/30 pr-3">
                        <span class="text-xl font-serif font-bold text-white">${day}</span>
                        <span class="text-[9px] uppercase tracking-widest text-white/80">${month}</span>
                    </div>
                    <div class="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold">
                        <i data-lucide="clock" class="w-3 h-3"></i> ${e.time}
                    </div>
                </div>

                <h3 class="text-xl font-serif leading-tight mb-2 group-hover:text-bronze-300 transition-colors line-clamp-2 drop-shadow-md">${e.title}</h3>
                
                <div class="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 transition-all duration-500 overflow-hidden">
                    <p class="text-xs text-stone-300 font-light mb-4 line-clamp-3">${e.desc}</p>
                    <span class="text-[10px] font-bold uppercase tracking-widest text-bronze-400 border-b border-bronze-400/50 pb-0.5">Leggi tutto</span>
                </div>
            </div>
        </div>
        `;
        slider.insertAdjacentHTML('beforeend', card);
    });

    const loadMoreBtn = document.getElementById('load-more-btn');
    if (hasMore) {
        loadMoreBtn.classList.remove('hidden');
        loadMoreBtn.querySelector('button').innerText = `Vedi altri eventi (${filteredEvents.length - 6})`;
    } else {
        loadMoreBtn.classList.add('hidden');
    }
    
    if(window.lucide) window.lucide.createIcons();
}

window.showAllEvents = () => {
    const grid = document.getElementById('all-events-grid');
    grid.innerHTML = '';
    
    // Show remaining events
    const remaining = filteredEvents.slice(6);
    
    remaining.forEach(e => {
        const d = new Date(e.dateStr);
        const dateStr = d.toLocaleDateString('it-IT');
        
        const item = `
        <div class="flex gap-5 p-5 bg-white border border-stone-100 rounded-2xl hover:border-bronze-300 transition-all cursor-pointer group items-center shadow-sm hover:shadow-md" onclick="openModal('${e.id}')">
            <div class="w-[70px] h-[100px] rounded-lg bg-stone-100 overflow-hidden shrink-0 relative shadow-inner">
                <img src="${e.img}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
            </div>
            <div class="flex flex-col justify-center">
                <div class="flex items-center gap-2 mb-1">
                    <span class="bg-bronze-100 text-bronze-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">${e.cat}</span>
                    <span class="text-stone-400 text-[10px] font-bold uppercase tracking-widest">${dateStr}</span>
                </div>
                <h4 class="text-stone-800 font-serif text-lg leading-tight group-hover:text-bronze-600 transition-colors line-clamp-1 mb-1">${e.title}</h4>
                <p class="text-xs text-stone-500 italic line-clamp-1 mb-2">${e.organizer}</p>
                <span class="text-stone-400 text-xs flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${e.loc}</span>
            </div>
        </div>
        `;
        grid.insertAdjacentHTML('beforeend', item);
    });
    
    grid.classList.remove('hidden');
    document.getElementById('load-more-btn').classList.add('hidden');
    if(window.lucide) window.lucide.createIcons();
};

// --- MODAL SYSTEM (FULL DETAILS) ---
window.openModal = (baseId) => {
    let content = {};
    
    // Is it an event?
    const evt = allEvents.find(e => e.id === baseId);
    
    if (evt) {
        const d = new Date(evt.dateStr);
        const fullDate = d.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        content = {
            title: evt.title,
            desc: evt.desc,
            img: evt.img,
            subtitle: evt.subtitle || 'Evento in programma',
            category: evt.cat,
            time: `${fullDate} | Ore ${evt.time}`,
            location: evt.loc,
            organizer: evt.organizer
        };
    } else {
        // Fallback for CMS sections
        const titleKey = baseId + "_title";
        const descKey = baseId + "_desc";
        const imgKey = baseId + "_img";
        content = {
            title: cmsData[baseId]?.title || (cmsData[titleKey]?.text) || "Dettaglio",
            desc: cmsData[baseId]?.text || (cmsData[descKey]?.text) || "",
            img: cmsData[baseId]?.img || (cmsData[imgKey]?.img) || "",
            subtitle: "Territorio & Cultura",
            category: "Info",
            time: "Sempre aperto",
            location: "Avigliano Umbro",
            organizer: "Comune di Avigliano Umbro"
        };
    }

    document.getElementById('modal-title').innerHTML = content.title;
    document.getElementById('modal-subtitle').innerHTML = content.subtitle;
    document.getElementById('modal-desc').innerHTML = content.desc;
    document.getElementById('modal-category').innerHTML = content.category;
    document.getElementById('modal-time').innerHTML = content.time;
    document.getElementById('modal-location').innerHTML = content.location;
    document.getElementById('modal-organizer').innerHTML = content.organizer;
    
    const modalImg = document.getElementById('modal-img');
    modalImg.src = content.img || 'https://via.placeholder.com/800x600';
    
    document.getElementById('info-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeModal = () => {
    document.getElementById('info-modal').classList.add('hidden');
    document.body.style.overflow = '';
};

document.addEventListener('DOMContentLoaded', () => {
    initCMS();
    initEvents();
});

document.addEventListener('DOMContentLoaded', () => {
    initCMS();
    initEvents();
});
