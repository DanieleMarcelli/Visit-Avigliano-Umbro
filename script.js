// CONFIGURAZIONE URL
const CSV_EVENTS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=0&single=true&output=csv";
const CSV_CONTENT = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv";

// STATO
let cmsData = {}; 
let allEvents = [];
let filteredEvents = [];
let currentCategory = 'Tutti';

// --- PARSER CSV AVANZATO (Gestisce virgole e "a capo" dentro le celle) ---
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        // Gestione virgolette (escaped quotes)
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentCell += '"'; 
                i++; 
            } else {
                insideQuotes = !insideQuotes;
            }
        } 
        // Gestione separatore colonna (solo se non siamo tra virgolette)
        else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } 
        // Gestione fine riga (solo se non siamo tra virgolette)
        else if ((char === '\r' || char === '\n') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') i++; // Salta doppio carattere Windows
            currentRow.push(currentCell.trim());
            if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } 
        // Carattere normale
        else {
            currentCell += char;
        }
    }
    // Aggiungi l'ultima riga se esiste
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }
    
    // Rimuove l'header (la prima riga)
    return rows.slice(1);
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

// --- CARICAMENTO CMS (Testi e Immagini Statiche) ---
async function initCMS() {
    try {
        const resp = await fetch(CSV_CONTENT);
        if(!resp.ok) throw new Error("Errore CSV Content");
        const text = await resp.text();
        const rows = parseCSV(text);
        
        rows.forEach(row => {
            // Assicuriamoci che la riga abbia almeno 2 colonne
            if (row.length < 2) return;
            
            const id = row[0];
            const textContent = row[1];
            const imgUrl = formatUrl(row[2]);
            
            if (!id) return;
            
            cmsData[id] = { text: textContent, img: imgUrl };
            
            const els = document.querySelectorAll(`[data-content-id="${id}"]`);
            els.forEach(el => {
                if (imgUrl) {
                    if (el.tagName === 'IMG') { 
                        el.src = imgUrl; 
                        el.onload = () => el.classList.remove('opacity-0');
                        if(el.complete) el.classList.remove('opacity-0');
                    } else { 
                        el.style.backgroundImage = `url('${imgUrl}')`; 
                        el.classList.remove('opacity-0'); 
                    }
                }
                if (textContent && !imgUrl) el.innerHTML = textContent;
            });
        });
    } catch (err) { console.error("CMS Error:", err); }
}

// --- CARICAMENTO EVENTI (Calendario) ---
async function initEvents() {
    try {
        const resp = await fetch(CSV_EVENTS);
        if(!resp.ok) throw new Error("Errore CSV Eventi");
        const text = await resp.text();
        const rows = parseCSV(text);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        // Mappatura Colonne (Basata sul tuo Excel):
        // 0:Data, 1:Ora, 2:Titolo, 3:Sottotitolo, 4:Descrizione, 5:Luogo, 6:Categoria, 7:Immagine, 8:Organizzatore
        allEvents = rows.map((row, idx) => ({
            id: `evt-${idx}`,
            dateStr: row[0],
            time: row[1] || '',
            title: row[2] || 'Titolo mancante',
            subtitle: row[3] || '',
            desc: row[4] || 'Nessuna descrizione disponibile.',
            loc: row[5] || 'Avigliano Umbro',
            cat: row[6] || 'Evento',
            img: formatUrl(row[7]) || 'https://via.placeholder.com/400x600?text=Evento',
            organizer: row[8] || ''
        })).filter(e => {
            // Filtra date non valide
            const d = new Date(e.dateStr);
            return !isNaN(d) && d >= today; // Mostra solo eventi futuri o oggi
        }).sort((a,b) => new Date(a.dateStr) - new Date(b.dateStr));
        
        renderFilters();
        filterEvents('Tutti');
        
    } catch (err) { 
        console.error("Events Error:", err); 
        const slider = document.getElementById('events-slider');
        if(slider) slider.innerHTML = '<div class="w-full text-center text-stone-400 py-10">Errore caricamento eventi.</div>';
    }
}

// --- FILTRI ---
function renderFilters() {
    const container = document.getElementById('category-filters');
    if(!container) return;
    
    const categories = ['Tutti', ...new Set(allEvents.map(e => e.cat).filter(c => c))];
    container.innerHTML = categories.map(cat => `
        <button onclick="filterEvents('${cat}')" 
            class="filter-btn px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all whitespace-nowrap ${cat === currentCategory ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-bronze-400'}">
            ${cat}
        </button>
    `).join('');
}

window.filterEvents = (category) => {
    currentCategory = category;
    filteredEvents = category === 'Tutti' ? allEvents : allEvents.filter(e => e.cat === category);
    
    // Aggiorna stile bottoni
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if(btn.innerText === category) btn.className = "filter-btn px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all whitespace-nowrap bg-stone-900 text-white border-stone-900";
        else btn.className = "filter-btn px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all whitespace-nowrap bg-white text-stone-600 border-stone-200 hover:border-bronze-400";
    });
    renderEvents();
};

// --- RENDERIZZAZIONE CARD (Slider) ---
function renderEvents() {
    const slider = document.getElementById('events-slider');
    if(!slider) return;
    slider.innerHTML = '';
    
    const displayEvents = filteredEvents.slice(0, 6);
    const hasMore = filteredEvents.length > 6;
    
    if (displayEvents.length === 0) {
        slider.innerHTML = '<div class="w-full text-center text-stone-400 py-10 font-serif italic">Nessun evento trovato.</div>';
        return;
    }

    displayEvents.forEach(e => {
        const d = new Date(e.dateStr);
        const day = d.getDate();
        const month = d.toLocaleString('it-IT', { month: 'short' }).toUpperCase();
        
        // CARD 7:10 (280x400)
        const card = `
        <div class="snap-center shrink-0 w-[280px] h-[400px] relative rounded-2xl overflow-hidden group cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 bg-stone-900 border border-stone-200" onclick="openModal('${e.id}')">
            
            <img src="${e.img}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-100">
            
            <div class="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent opacity-90"></div>
            
            <div class="absolute top-4 right-4 bg-white/20 backdrop-blur border border-white/20 px-3 py-1 rounded-full text-[9px] font-bold uppercase text-white tracking-widest shadow-sm">
                ${e.cat}
            </div>

            <div class="absolute bottom-0 left-0 w-full p-6 text-white transition-all duration-500 transform translate-y-[20px] group-hover:translate-y-0">
                
                <div class="flex items-start gap-3 mb-2 text-bronze-400">
                    <div class="flex flex-col items-center leading-none border-r border-white/30 pr-3">
                        <span class="text-2xl font-serif font-bold text-white">${day}</span>
                        <span class="text-[9px] uppercase tracking-widest text-white/80">${month}</span>
                    </div>
                    <div class="flex flex-col justify-center">
                        <div class="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-white/90">
                            <i data-lucide="clock" class="w-3 h-3"></i> ${e.time}
                        </div>
                        <div class="flex items-center gap-1 text-[10px] uppercase tracking-wider text-stone-300 line-clamp-1">
                            <i data-lucide="map-pin" class="w-3 h-3"></i> ${e.loc}
                        </div>
                    </div>
                </div>

                <h3 class="text-xl font-serif leading-tight mb-1 group-hover:text-bronze-400 transition-colors line-clamp-2 drop-shadow-md">${e.title}</h3>
                ${e.subtitle ? `<p class="text-xs text-stone-300 font-light mb-2 line-clamp-1 italic">${e.subtitle}</p>` : ''}
                
                <div class="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 transition-all duration-500 overflow-hidden">
                    <p class="text-xs text-stone-300 font-light mb-3 line-clamp-2 border-t border-white/10 pt-2">${e.desc}</p>
                    <span class="text-[10px] font-bold uppercase tracking-widest text-bronze-400 border-b border-bronze-400/50 pb-0.5">Leggi tutto</span>
                </div>
            </div>
        </div>`;
        slider.insertAdjacentHTML('beforeend', card);
    });

    // Gestione bottone "Vedi tutti"
    const loadMoreBtn = document.getElementById('load-more-btn');
    if(loadMoreBtn) {
        if (hasMore) {
            loadMoreBtn.classList.remove('hidden');
            loadMoreBtn.querySelector('button').innerText = `Vedi altri eventi (${filteredEvents.length - 6})`;
        } else { 
            loadMoreBtn.classList.add('hidden'); 
        }
    }
    
    if(window.lucide) window.lucide.createIcons();
}

// --- RENDERIZZAZIONE GRIGLIA (Tutti gli eventi) ---
window.showAllEvents = () => {
    const grid = document.getElementById('all-events-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    const remaining = filteredEvents.slice(6);
    
    remaining.forEach(e => {
        const d = new Date(e.dateStr);
        const dateStr = d.toLocaleDateString('it-IT');
        const item = `
        <div class="flex gap-5 p-4 bg-white border border-stone-200 rounded-2xl hover:border-bronze-400 transition-all cursor-pointer group items-center shadow-sm hover:shadow-md" onclick="openModal('${e.id}')">
            <div class="w-[60px] h-[90px] rounded-lg bg-stone-200 overflow-hidden shrink-0 relative shadow-inner">
                <img src="${e.img}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
            </div>
            <div class="flex flex-col justify-center w-full">
                <div class="flex items-center justify-between mb-1">
                    <span class="bg-bronze-400 text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">${e.cat}</span>
                    <span class="text-stone-400 text-[10px] font-bold uppercase tracking-widest">${dateStr}</span>
                </div>
                <h4 class="text-stone-900 font-serif text-lg leading-tight group-hover:text-bronze-600 transition-colors line-clamp-1 mb-1">${e.title}</h4>
                <p class="text-xs text-stone-500 italic line-clamp-1 mb-2">${e.subtitle || e.organizer}</p>
                <span class="text-stone-400 text-xs flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${e.loc}</span>
            </div>
        </div>`;
        grid.insertAdjacentHTML('beforeend', item);
    });
    grid.classList.remove('hidden');
    document.getElementById('load-more-btn').classList.add('hidden');
    if(window.lucide) window.lucide.createIcons();
};

// --- SISTEMA MODALE ---
window.openModal = (baseId) => {
    let content = {};
    
    // Cerca negli eventi
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
    } 
    // Cerca nel CMS statico
    else {
        const titleKey = baseId + "_title", descKey = baseId + "_desc", imgKey = baseId + "_img";
        content = {
            title: cmsData[baseId]?.title || (cmsData[titleKey]?.text) || "Dettaglio",
            desc: cmsData[baseId]?.text || (cmsData[descKey]?.text) || "",
            img: cmsData[baseId]?.img || (cmsData[imgKey]?.img) || "",
            subtitle: "Territorio & Cultura", category: "Info", time: "Sempre aperto", location: "Avigliano Umbro", organizer: "Comune di Avigliano Umbro"
        };
    }
    
    // Popola il modale
    if(document.getElementById('modal-title')) {
        document.getElementById('modal-title').innerHTML = content.title;
        document.getElementById('modal-subtitle').innerHTML = content.subtitle;
        
        // Gestione descrizioni lunghe con a capo
        document.getElementById('modal-desc').innerHTML = content.desc.replace(/\n/g, '<br>');
        
        document.getElementById('modal-category').innerHTML = content.category;
        
        const tEl = document.getElementById('modal-time'); if(tEl) tEl.innerHTML = content.time;
        const lEl = document.getElementById('modal-location'); if(lEl) lEl.innerHTML = content.location;
        const oEl = document.getElementById('modal-organizer'); if(oEl) oEl.innerHTML = content.organizer;
        
        const mImg = document.getElementById('modal-img');
        if(mImg) mImg.src = content.img || 'https://via.placeholder.com/800x600';
        
        document.getElementById('info-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
};

window.closeModal = () => {
    document.getElementById('info-modal').classList.add('hidden');
    document.body.style.overflow = '';
};

// --- INIZIALIZZAZIONE ---
document.addEventListener('DOMContentLoaded', () => {
    initCMS();
    initEvents();
    
    // Scroll Reveal Animation
    const revealElements = document.querySelectorAll('.reveal');
    if(revealElements.length > 0) {
        const obs = new IntersectionObserver((entries)=>{
            entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('active') });
        }, {threshold: 0.1});
        revealElements.forEach(el => obs.observe(el));
    }
});
