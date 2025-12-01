// CONFIGURATION URLS
const CSV_EVENTS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=0&single=true&output=csv";
const CSV_CONTENT = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv";

// STATE
let cmsData = {}; 
let allEvents = [];
let pendingEvents = [];

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
                    if (el.tagName === 'IMG') {
                        el.src = imgUrl;
                        el.onload = () => el.classList.remove('opacity-0');
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

// --- EVENTS LOADER ---
async function initEvents() {
    try {
        const resp = await fetch(CSV_EVENTS);
        const text = await resp.text();
        const rows = parseCSV(text);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        // CSV: Date(0), Time(1), Title(2), Subtitle(3), Desc(4), Loc(5), Cat(6), Img(7)
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
                img: formatUrl(row[7]) || 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=800'
            };
        })
        .filter(e => {
            const d = new Date(e.dateStr);
            return !isNaN(d) && d >= today;
        })
        .sort((a,b) => new Date(a.dateStr) - new Date(b.dateStr));
        
        renderEvents();
        
    } catch (err) {
        console.error("Events Error:", err);
        document.getElementById('events-slider').innerHTML = '<div class="w-full text-center text-stone-400 py-10">Caricamento eventi non riuscito.</div>';
    }
}

function renderEvents() {
    const slider = document.getElementById('events-slider');
    slider.innerHTML = '';
    
    const featured = allEvents.slice(0, 6);
    pendingEvents = allEvents.slice(6);
    
    if (featured.length === 0) {
        slider.innerHTML = '<div class="w-full text-center text-stone-400 py-10 font-serif italic">Nessun evento in programma prossimamente.</div>';
        return;
    }

    featured.forEach(e => {
        const d = new Date(e.dateStr);
        const day = d.getDate();
        const month = d.toLocaleString('it-IT', { month: 'short' }).toUpperCase();
        
        // --- MODIFICA QUI: RAPPORTO 7:10 ---
        // Width: 280px / Height: 400px (280/400 = 0.7 esatto)
        const card = `
        <div class="snap-center shrink-0 w-[280px] h-[400px] relative rounded-2xl overflow-hidden group cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 bg-stone-900 border border-stone-200" onclick="openModal('${e.id}')">
            
            <img src="${e.img}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-95 group-hover:opacity-100">
            
            <div class="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent opacity-80 hover:opacity-70 transition-opacity"></div>
            
            <div class="absolute top-4 right-4 bg-white/20 backdrop-blur border border-white/20 px-3 py-1 rounded-full text-[9px] font-bold uppercase text-white tracking-widest shadow-sm">
                ${e.cat}
            </div>

            <div class="absolute bottom-0 left-0 w-full p-6 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                
                <div class="flex items-center gap-3 mb-2 text-bronze-200">
                    <div class="flex flex-col items-center leading-none border-r border-white/30 pr-3">
                        <span class="text-xl font-serif font-bold text-white">${day}</span>
                        <span class="text-[9px] uppercase tracking-widest text-white/80">${month}</span>
                    </div>
                    <div class="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold">
                        <i data-lucide="clock" class="w-3 h-3"></i> ${e.time}
                    </div>
                </div>

                <h3 class="text-xl font-serif leading-tight mb-1 group-hover:text-bronze-300 transition-colors line-clamp-2 drop-shadow-md">${e.title}</h3>
                ${e.subtitle ? `<p class="text-xs text-stone-200 font-light mb-3 line-clamp-1 italic drop-shadow">${e.subtitle}</p>` : '<div class="mb-3"></div>'}
                
                <div class="flex items-center gap-2 text-[10px] text-stone-300 uppercase tracking-widest border-t border-white/20 pt-3">
                    <i data-lucide="map-pin" class="w-3 h-3 text-bronze-400"></i> ${e.loc}
                </div>
            </div>
        </div>
        `;
        slider.insertAdjacentHTML('beforeend', card);
    });

    if (pendingEvents.length > 0) {
        document.getElementById('load-more-btn').classList.remove('hidden');
    }
    
    if(window.lucide) window.lucide.createIcons();
    
    // Popola i dati per il modale
    allEvents.forEach(e => {
        cmsData[e.id] = { 
            text: e.desc, 
            img: e.img, 
            title: e.title, 
            subtitle: `${e.dateStr} | Ore ${e.time} | ${e.loc}` 
        };
    });
}

window.showAllEvents = () => {
    const grid = document.getElementById('all-events-grid');
    grid.innerHTML = '';
    
    pendingEvents.forEach(e => {
        const d = new Date(e.dateStr);
        const dateStr = d.toLocaleDateString('it-IT');
        
        // Card orizzontale per la lista "Vedi tutti"
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
                <p class="text-xs text-stone-500 italic line-clamp-1 mb-2">${e.subtitle || ''}</p>
                <span class="text-stone-400 text-xs flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${e.loc}</span>
            </div>
        </div>
        `;
        grid.insertAdjacentHTML('beforeend', item);
    });
    
    grid.classList.remove('hidden');
    document.getElementById('load-more-btn').style.display = 'none';
    if(window.lucide) window.lucide.createIcons();
};

// --- MODAL SYSTEM ---
window.openModal = (baseId) => {
    const titleKey = baseId + "_title";
    const descKey = baseId + "_desc";
    const imgKey = baseId + "_img";
    
    let title = "Dettaglio";
    let desc = "Descrizione non disponibile.";
    let img = "";
    let subtitle = "Experience"; 
    
    if (cmsData[baseId] && cmsData[baseId].title) { // Evento
        title = cmsData[baseId].title;
        desc = cmsData[baseId].text;
        img = cmsData[baseId].img;
        if(cmsData[baseId].subtitle) subtitle = cmsData[baseId].subtitle;
    } else { // Sezione CMS
        if (cmsData[titleKey]?.text) title = cmsData[titleKey].text;
        if (cmsData[descKey]?.text) desc = cmsData[descKey].text;
        if (cmsData[imgKey]?.img) img = cmsData[imgKey].img;
    }

    const modal = document.getElementById('info-modal');
    document.getElementById('modal-title').innerHTML = title;
    document.getElementById('modal-subtitle').innerHTML = subtitle;
    document.getElementById('modal-desc').innerHTML = desc;
    
    const modalImg = document.getElementById('modal-img');
    if(img) {
        modalImg.src = img;
    } else {
        modalImg.src = 'https://via.placeholder.com/800x600?text=Avigliano+Umbro';
    }
    
    modal.classList.remove('hidden');
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
