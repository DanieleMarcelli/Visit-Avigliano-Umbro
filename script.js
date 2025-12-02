// CONFIGURATION URLS
const CSV_EVENTS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=0&single=true&output=csv";
const CSV_CONTENT = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv";

// STATE
let cmsData = {}; 
let allEvents = [];
let filteredEvents = [];
let currentCategory = 'Tutti';

// UTILS
function formatUrl(url) {
    if (!url) return '';
    if (url.includes('drive.google.com') || url.includes('/d/')) {
        const idMatch = url.match(/\/d\/(.+?)\/|id=(.+?)&|id=(.+?)$/);
        const id = idMatch ? (idMatch[1] || idMatch[2] || idMatch[3]) : null;
        if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    return url;
}

// PARSER
function parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('---')) continue;
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
        result.push(row.map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"')));
    }
    return result;
}

// LOADER
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
                    else { el.style.backgroundImage = `url('${imgUrl}')`; }
                }
                if (textContent && !imgUrl) el.innerHTML = textContent;
            });
        });
    } catch (err) { console.error("CMS Error:", err); }
}

async function initEvents() {
    try {
        const resp = await fetch(CSV_EVENTS);
        const text = await resp.text();
        const rows = parseCSV(text);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        allEvents = rows.map((row, idx) => ({
            id: `evt-${idx}`,
            dateStr: row[0],
            time: row[1] || '',
            title: row[2],
            subtitle: row[3],
            desc: row[4],
            loc: row[5],
            cat: row[6] || 'Evento',
            img: formatUrl(row[7]) || 'https://via.placeholder.com/400x600',
            organizer: row[8]
        })).filter(e => {
            const d = new Date(e.dateStr);
            return !isNaN(d) && d >= today;
        }).sort((a,b) => new Date(a.dateStr) - new Date(b.dateStr));
        
        renderFilters();
        filterEvents('Tutti');
    } catch (err) { console.error("Events Error:", err); }
}

// FILTER & RENDER
function renderFilters() {
    const container = document.getElementById('category-filters');
    if(!container) return;
    const categories = ['Tutti', ...new Set(allEvents.map(e => e.cat))];
    container.innerHTML = categories.map(cat => `
        <button onclick="filterEvents('${cat}')" 
            class="filter-btn px-6 py-2 border transition-all text-xs font-bold uppercase tracking-widest ${cat === currentCategory ? 'bg-gold text-white border-gold' : 'border-white/20 hover:border-gold hover:text-gold'}">
            ${cat}
        </button>
    `).join('');
}

window.filterEvents = (category) => {
    currentCategory = category;
    filteredEvents = category === 'Tutti' ? allEvents : allEvents.filter(e => e.cat === category);
    renderFilters(); // Re-render per aggiornare stile attivo
    renderEvents();
};

function renderEvents() {
    const slider = document.getElementById('events-slider');
    if(!slider) return;
    slider.innerHTML = '';
    
    const displayEvents = filteredEvents.slice(0, 6);
    const hasMore = filteredEvents.length > 6;

    if (displayEvents.length === 0) {
        slider.innerHTML = '<div class="w-full text-center py-20 text-white/50 font-serif italic">Nessun evento in questa categoria.</div>';
        return;
    }

    displayEvents.forEach(e => {
        const d = new Date(e.dateStr);
        const day = d.getDate();
        const month = d.toLocaleString('it-IT', { month: 'short' }).toUpperCase();
        
        // CARD VERTICALE 7:10
        const card = `
        <div class="snap-center shrink-0 w-[280px] h-[400px] relative group cursor-pointer overflow-hidden bg-ink border border-white/10" onclick="openModal('${e.id}')">
            <img src="${e.img}" class="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700">
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
            
            <div class="absolute top-4 right-4 bg-black/50 backdrop-blur border border-white/20 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
                ${e.cat}
            </div>

            <div class="absolute bottom-0 left-0 w-full p-6 text-white translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <div class="flex items-center gap-3 mb-2 text-gold">
                    <span class="text-2xl font-serif leading-none">${day}</span>
                    <div class="flex flex-col text-[9px] uppercase font-bold tracking-widest leading-none text-white/70">
                        <span>${month}</span>
                        <span>${e.time}</span>
                    </div>
                </div>
                <h3 class="text-xl font-serif leading-tight mb-2 group-hover:text-gold transition-colors line-clamp-2">${e.title}</h3>
                <div class="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 transition-all duration-500 overflow-hidden">
                    <p class="text-xs text-white/70 font-light mb-3 line-clamp-2">${e.loc}</p>
                    <span class="text-[9px] font-bold uppercase tracking-widest border-b border-gold pb-1 text-gold">Dettagli</span>
                </div>
            </div>
        </div>
        `;
        slider.insertAdjacentHTML('beforeend', card);
    });

    const loadBtn = document.getElementById('load-more-btn');
    if(loadBtn) loadBtn.classList.toggle('hidden', !hasMore);
    
    if(window.lucide) window.lucide.createIcons();
}

window.showAllEvents = () => {
    const grid = document.getElementById('all-events-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    const remaining = filteredEvents.slice(6);
    remaining.forEach(e => {
        const d = new Date(e.dateStr);
        const dateStr = d.toLocaleDateString('it-IT');
        const item = `
        <div class="flex gap-4 p-4 border border-white/10 bg-ink/50 hover:border-gold transition cursor-pointer group" onclick="openModal('${e.id}')">
            <div class="w-16 h-24 shrink-0 bg-stone-800 overflow-hidden relative">
                <img src="${e.img}" class="w-full h-full object-cover group-hover:scale-110 transition-transform">
            </div>
            <div>
                <span class="text-gold text-[10px] font-bold uppercase tracking-widest block mb-1">${dateStr}</span>
                <h4 class="text-white font-serif text-lg leading-tight group-hover:text-gold transition-colors line-clamp-1">${e.title}</h4>
                <p class="text-xs text-white/50 mt-2 line-clamp-1">${e.loc}</p>
            </div>
        </div>`;
        grid.insertAdjacentHTML('beforeend', item);
    });
    grid.classList.remove('hidden');
    document.getElementById('load-more-btn').classList.add('hidden');
}

// MODAL
window.openModal = (baseId) => {
    // Logica identica a prima ma riadattata per sicurezza
    // ... (Il resto rimane uguale alla versione robusta precedente)
    // Per brevità, assumiamo la funzione standard di popolamento modale
    let content = {};
    const evt = allEvents.find(e => e.id === baseId);
    
    if (evt) {
        const d = new Date(evt.dateStr);
        const fullDate = d.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        content = { title: evt.title, desc: evt.desc, img: evt.img, subtitle: 'Evento', category: evt.cat, time: `${fullDate} | ${evt.time}`, location: evt.loc, organizer: evt.organizer };
    } else {
        const titleKey = baseId + "_title", descKey = baseId + "_desc", imgKey = baseId + "_img";
        content = {
            title: cmsData[baseId]?.title || (cmsData[titleKey]?.text) || "Dettaglio",
            desc: cmsData[baseId]?.text || (cmsData[descKey]?.text) || "",
            img: cmsData[baseId]?.img || (cmsData[imgKey]?.img) || "",
            subtitle: "Territorio", category: "Info", time: "-", location: "Avigliano Umbro", organizer: "-"
        };
    }

    if(document.getElementById('modal-title')) {
        document.getElementById('modal-title').innerHTML = content.title;
        document.getElementById('modal-subtitle').innerHTML = content.subtitle;
        document.getElementById('modal-desc').innerHTML = content.desc;
        document.getElementById('modal-category').innerHTML = content.category;
        
        // Elementi opzionali per contenuti non-evento
        const timeEl = document.getElementById('modal-time'); if(timeEl) timeEl.innerHTML = content.time;
        const locEl = document.getElementById('modal-location'); if(locEl) locEl.innerHTML = content.location;
        const orgEl = document.getElementById('modal-organizer'); if(orgEl) orgEl.innerHTML = content.organizer;
        
        document.getElementById('modal-img').src = content.img || 'https://via.placeholder.com/800x600';
        document.getElementById('info-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
};

window.closeModal = () => {
    document.getElementById('info-modal').classList.add('hidden');
    document.body.style.overflow = '';
};

// INIT
document.addEventListener('DOMContentLoaded', () => {
    initCMS();
    initEvents();
    
    // Observer per animazioni
    const obs = new IntersectionObserver((entries)=>{
        entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('active') });
    }, {threshold: 0.1});
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
});
