// CONFIGURATION URLS
const CSV_EVENTS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=0&single=true&output=csv";
const CSV_CONTENT = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv";

// STATE
let cmsData = {}; 
let allEvents = [];
let pendingEvents = [];

/**
 * PARSER CSV
 */
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

/**
 * CARICAMENTO CONTENUTI (TESTI E IMMAGINI)
 */
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
            
            // Salva per i Modali
            cmsData[id] = { text: textContent, img: imgUrl };
            
            const els = document.querySelectorAll(`[data-content-id="${id}"]`);
            els.forEach(el => {
                // Gestione Immagini
                if (imgUrl) {
                    if (el.tagName === 'IMG') {
                        el.src = imgUrl;
                        el.onload = () => el.classList.remove('opacity-0'); // Fade in
                    } else {
                        // Per i background (Hero, Bento Cards)
                        el.style.backgroundImage = `url('${imgUrl}')`;
                        el.classList.remove('opacity-0');
                    }
                }
                // Gestione Testo
                if (textContent && !imgUrl) {
                    el.innerHTML = textContent;
                }
            });
        });
    } catch (err) {
        console.error("CMS Load Error:", err);
    }
}

/**
 * CARICAMENTO EVENTI (Invariato ma ottimizzato per il nuovo design)
 */
async function initEvents() {
    try {
        const resp = await fetch(CSV_EVENTS);
        const text = await resp.text();
        const rows = parseCSV(text);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        allEvents = rows.map((row, idx) => {
            return {
                id: `evt-${idx}`,
                dateStr: row[0],
                time: row[1],
                title: row[2],
                subtitle: row[3],
                desc: row[4],
                loc: row[5],
                cat: row[6],
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
        console.error("Events Load Error:", err);
        document.getElementById('events-slider').innerHTML = '<div class="text-stone-400 py-10">Nessun evento in programma.</div>';
    }
}

function renderEvents() {
    const slider = document.getElementById('events-slider');
    slider.innerHTML = '';
    
    const featured = allEvents.slice(0, 6); // Mostra primi 6
    pendingEvents = allEvents.slice(6);
    
    if (featured.length === 0) {
        slider.innerHTML = '<div class="w-full text-center text-stone-400 py-10">Nessun evento trovato.</div>';
        return;
    }

    featured.forEach(e => {
        const d = new Date(e.dateStr);
        const day = d.getDate();
        const month = d.toLocaleString('it-IT', { month: 'short' }).toUpperCase();
        
        // Card Design "Luxury Light"
        const card = `
        <div class="snap-center shrink-0 w-[300px] h-[420px] relative bg-white rounded-[2rem] overflow-hidden group cursor-pointer shadow-card hover:shadow-soft transition-all border border-stone-100" onclick="openModal('${e.id}')">
            <div class="h-3/5 relative overflow-hidden">
                <img src="${e.img}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                <div class="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase text-stone-800 shadow-sm">
                    ${e.cat}
                </div>
            </div>
            
            <div class="p-6 relative">
                <div class="absolute -top-6 left-6 bg-bronze-500 text-white p-3 rounded-xl text-center shadow-lg w-14">
                    <span class="block text-lg font-serif font-bold leading-none">${day}</span>
                    <span class="block text-[9px] uppercase tracking-widest leading-none mt-1">${month}</span>
                </div>

                <div class="mt-4">
                    <h3 class="text-xl font-serif text-stone-900 leading-tight mb-2 line-clamp-2 group-hover:text-bronze-600 transition-colors">${e.title}</h3>
                    <p class="text-stone-500 text-xs flex items-center gap-2 line-clamp-1 mb-3">
                        <i data-lucide="map-pin" class="w-3 h-3 text-bronze-400"></i> ${e.loc}
                    </p>
                    <span class="text-[10px] font-bold uppercase tracking-widest text-bronze-600 border-b border-bronze-200 pb-0.5 group-hover:border-bronze-500 transition-all">Dettagli</span>
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
    
    // Add data to cmsData for modal usage
    allEvents.forEach(e => {
        cmsData[e.id] = { text: e.desc, img: e.img, title: e.title, subtitle: e.dateStr + ' - ' + e.loc };
    });
}

window.showAllEvents = () => {
    const grid = document.getElementById('all-events-grid');
    grid.innerHTML = '';
    
    pendingEvents.forEach(e => {
        const d = new Date(e.dateStr);
        const dateStr = d.toLocaleDateString('it-IT');
        
        const item = `
        <div class="flex gap-4 p-4 bg-white border border-stone-100 rounded-2xl hover:border-bronze-300 transition-colors cursor-pointer group items-center shadow-sm" onclick="openModal('${e.id}')">
            <div class="w-20 h-20 rounded-xl bg-stone-100 overflow-hidden shrink-0 relative">
                <img src="${e.img}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
            </div>
            <div class="flex flex-col">
                <span class="text-bronze-500 text-[10px] font-bold uppercase tracking-widest mb-1">${dateStr}</span>
                <h4 class="text-stone-800 font-serif text-lg leading-tight group-hover:text-bronze-600 transition-colors line-clamp-1">${e.title}</h4>
                <span class="text-stone-500 text-xs mt-1 flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${e.loc}</span>
            </div>
        </div>
        `;
        grid.insertAdjacentHTML('beforeend', item);
    });
    
    grid.classList.remove('hidden');
    document.getElementById('load-more-btn').style.display = 'none';
    if(window.lucide) window.lucide.createIcons();
};

/**
 * MODAL LOGIC
 */
window.openModal = (baseId) => {
    // Keys logic
    const titleKey = baseId + "_title";
    const descKey = baseId + "_desc";
    const imgKey = baseId + "_img";
    
    let title = "Dettaglio";
    let desc = "Descrizione non disponibile.";
    let img = "";
    let subtitle = "Experience"; // Default subtitle
    
    // Check direct content (for Events)
    if (cmsData[baseId] && cmsData[baseId].title) {
        title = cmsData[baseId].title;
        desc = cmsData[baseId].text;
        img = cmsData[baseId].img;
        if(cmsData[baseId].subtitle) subtitle = cmsData[baseId].subtitle;
    } 
    // Check composed content (for CMS sections)
    else {
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
        modalImg.classList.remove('hidden');
    } else {
        // Fallback or hide image
        modalImg.src = 'https://via.placeholder.com/800x600?text=Avigliano+Umbro';
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeModal = () => {
    document.getElementById('info-modal').classList.add('hidden');
    document.body.style.overflow = '';
};

// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    initCMS();
    initEvents();
    if(window.lucide) window.lucide.createIcons();
});
