// CONFIGURAZIONE URL
const CSV_EVENTS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=0&single=true&output=csv";
const CSV_CONTENT = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv";

// STATO
let cmsData = {}; 
let allEvents = [];
let filteredEvents = [];
let currentCategory = 'Tutti';

// SCROLL REVEAL OBSERVER
const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// PARSER CSV
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
        const cleanedRow = row.map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"'));
        if(cleanedRow.length > 0 && cleanedRow[0] !== '') result.push(cleanedRow);
    }
    return result;
}

function formatUrl(url) {
    if (!url) return '';
    if (url.includes('drive.google.com') || url.includes('/d/')) {
        const idMatch = url.match(/\/d\/(.+?)\/|id=(.+?)&|id=(.+?)$/);
        const id = idMatch ? (idMatch[1] || idMatch[2] || idMatch[3]) : null;
        if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    return url;
}

// CARICAMENTO CMS
async function initCMS() {
    try {
        const resp = await fetch(CSV_CONTENT);
        if(!resp.ok) throw new Error("Errore CSV Content");
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
                    if (el.tagName === 'IMG') { el.src = imgUrl; el.onload = () => el.classList.remove('opacity-0'); if(el.complete) el.classList.remove('opacity-0'); } 
                    else { el.style.backgroundImage = `url('${imgUrl}')`; el.classList.remove('opacity-0'); }
                }
                if (textContent && !imgUrl) el.innerHTML = textContent;
            });
        });
    } catch (err) { console.error("CMS Error:", err); }
}

// CARICAMENTO EVENTI
async function initEvents() {
    try {
        const resp = await fetch(CSV_EVENTS);
        if(!resp.ok) throw new Error("Errore CSV Eventi");
        const text = await resp.text();
        const rows = parseCSV(text);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        allEvents = rows.map((row, idx) => ({
            id: `evt-${idx}`,
            dateStr: row[0],
            time: row[1] || 'Orario da definire',
            title: row[2] || 'Titolo non disponibile',
            subtitle: row[3] || '',
            desc: row[4] || '',
            loc: row[5] || 'Avigliano Umbro',
            cat: row[6] || 'Evento',
            img: formatUrl(row[7]) || 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=800',
            organizer: row[8] || ''
        })).filter(e => {
            const d = new Date(e.dateStr);
            return !isNaN(d) && d >= today;
        }).sort((a,b) => new Date(a.dateStr) - new Date(b.dateStr));
        
        renderFilters();
        filterEvents('Tutti');
    } catch (err) { 
        console.error("Events Error:", err); 
        const slider = document.getElementById('events-slider');
        if(slider) slider.innerHTML = '<div class="w-full text-center text-stone-400 py-10">Errore caricamento eventi.</div>';
    }
}

// FILTRI
function renderFilters() {
    const container = document.getElementById('category-filters');
    if(!container) return;
    const categories = ['Tutti', ...new Set(allEvents.map(e => e.cat).filter(c => c))];
    container.innerHTML = categories.map(cat => `
        <button onclick="filterEvents('${cat}')" class="filter-btn px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all whitespace-nowrap ${cat === currentCategory ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-bronze-400'}">${cat}</button>
    `).join('');
}

window.filterEvents = (category) => {
    currentCategory = category;
    filteredEvents = category === 'Tutti' ? allEvents : allEvents.filter(e => e.cat === category);
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if(btn.innerText === category) btn.className = "filter-btn px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all whitespace-nowrap bg-stone-900 text-white border-stone-900";
        else btn.className = "filter-btn px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all whitespace-nowrap bg-white text-stone-600 border-stone-200 hover:border-bronze-400";
    });
    renderEvents();
};

// --- GENERATORE CARD UNIFICATO (CON FIX LEGGIBILITÀ) ---
function createCardHTML(e, isGrid = false) {
    const d = new Date(e.dateStr);
    const day = d.getDate();
    const month = d.toLocaleString('it-IT', { month: 'short' }).toUpperCase();
    
    const containerClass = isGrid ? 'w-full h-[400px]' : 'w-[280px] h-[400px] shrink-0 snap-center';
    
    return `
    <div class="${containerClass} relative rounded-2xl overflow-hidden group cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 bg-stone-900 border border-white/20 mx-auto" onclick="openModal('${e.id}')">
        
        <img src="${e.img}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-100">
        
        <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-10 pointer-events-none"></div>
        
        <div class="absolute top-4 right-4 bg-gold text-ink border border-gold px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm z-20">
            ${e.cat}
        </div>

        <div class="absolute bottom-0 left-0 w-full p-6 text-white transition-all duration-500 transform translate-y-[10px] group-hover:translate-y-0 z-20">
            
            <div class="flex items-start gap-3 mb-2 text-gold">
                <div class="flex flex-col items-center leading-none border-r border-white/30 pr-3">
                    <span class="text-3xl font-serif font-bold text-white">${day}</span>
                    <span class="text-[9px] uppercase tracking-widest text-white/80">${month}</span>
                </div>
                <div class="flex flex-col justify-center gap-1">
                    <div class="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-white/90">
                        <i data-lucide="clock" class="w-3 h-3 text-gold"></i> ${e.time}
                    </div>
                    <div class="flex items-center gap-1 text-[9px] uppercase tracking-wider text-stone-300 line-clamp-1">
                        <i data-lucide="map-pin" class="w-3 h-3 text-gold"></i> ${e.loc}
                    </div>
                </div>
            </div>

            <h3 class="text-xl font-serif leading-tight mb-1 group-hover:text-gold transition-colors line-clamp-2 drop-shadow-md text-white">${e.title}</h3>
            ${e.subtitle ? `<p class="text-xs text-stone-300 font-light italic line-clamp-1 mb-2">${e.subtitle}</p>` : ''}
            
            <div class="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 transition-all duration-500 overflow-hidden">
                <p class="text-xs text-stone-300 font-light mb-3 line-clamp-2 border-t border-white/20 pt-2">${e.desc}</p>
                <span class="text-[10px] font-bold uppercase tracking-widest text-gold border-b border-gold/50 pb-0.5">Leggi tutto</span>
            </div>
        </div>
    </div>`;
}

// RENDER (Gestisce Home e Pagina Eventi)
function renderEvents() {
    const sliderContainer = document.getElementById('events-slider'); // Home Slider
    const gridContainer = document.getElementById('events-page-grid'); // Eventi Page
    const homeGridContainer = document.getElementById('all-events-grid'); // Home Expanded
    
    // HOME SLIDER
    if (sliderContainer) {
        sliderContainer.innerHTML = '';
        const displayEvents = filteredEvents.slice(0, 6);
        if (displayEvents.length === 0) {
            sliderContainer.innerHTML = '<div class="w-full text-center text-stone-400 py-10 font-serif italic">Nessun evento trovato.</div>';
        } else {
            displayEvents.forEach(e => sliderContainer.insertAdjacentHTML('beforeend', createCardHTML(e)));
        }
        
        // Bottone "Scopri Tutti"
        const loadBtn = document.getElementById('load-more-btn');
        if(loadBtn) loadBtn.classList.toggle('hidden', filteredEvents.length <= 6);
    }

    // PAGINA EVENTI.HTML
    if (gridContainer) {
        gridContainer.innerHTML = '';
        if (filteredEvents.length === 0) {
            gridContainer.innerHTML = '<div class="col-span-full text-center py-20 text-stone-500 font-serif text-xl">Nessun evento in questa categoria.</div>';
        } else {
            filteredEvents.forEach(e => gridContainer.insertAdjacentHTML('beforeend', createCardHTML(e, true)));
        }
    }
    
    // Re-inizializza icone
    if(window.lucide) window.lucide.createIcons();
}

// RENDER ESPANSIONE HOME (VEDI TUTTI)
window.showAllEvents = () => {
    const grid = document.getElementById('all-events-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    const remaining = filteredEvents.slice(6);
    remaining.forEach(e => {
        grid.insertAdjacentHTML('beforeend', createCardHTML(e, true)); 
    });
    
    grid.classList.remove('hidden');
    document.getElementById('load-more-btn').classList.add('hidden');
    if(window.lucide) window.lucide.createIcons();
};

// MODAL
window.openModal = (baseId) => {
    let content = {};
    const evt = allEvents.find(e => e.id === baseId);
    
    if (evt) {
        const d = new Date(evt.dateStr);
        const fullDate = d.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        content = { title: evt.title, desc: evt.desc, img: evt.img, subtitle: evt.subtitle || 'Evento in programma', category: evt.cat, time: `${fullDate} | Ore ${evt.time}`, location: evt.loc, organizer: evt.organizer };
    } else {
        const titleKey = baseId + "_title", descKey = baseId + "_desc", imgKey = baseId + "_img";
        content = {
            title: cmsData[baseId]?.text || (cmsData[titleKey]?.text) || "Dettaglio", // Fix: usa .text per titolo base
            desc: cmsData[baseId]?.text || (cmsData[descKey]?.text) || "",
            img: cmsData[baseId]?.img || (cmsData[imgKey]?.img) || "",
            subtitle: "Territorio & Cultura", category: "Info", time: "Sempre aperto", location: "Avigliano Umbro", organizer: "Comune di Avigliano Umbro"
        };
    }
    
    if(document.getElementById('modal-title')) {
        document.getElementById('modal-title').innerHTML = content.title;
        document.getElementById('modal-subtitle').innerHTML = content.subtitle;
        document.getElementById('modal-desc').innerHTML = content.desc ? content.desc.replace(/\n/g, '<br>') : '';
        document.getElementById('modal-category').innerHTML = content.category;
        
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
    const revealElements = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            }
        });
    });
    revealElements.forEach(el => obs.observe(el));
    
    const logo = document.getElementById('nav_logo');
    if(logo && cmsData['nav_logo']) logo.src = cmsData['nav_logo'].img;
});
