// CONFIGURATION URLS
const CSV_EVENTS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=0&single=true&output=csv";
const CSV_CONTENT = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIXJyYXgON5vC3u4ri0duZ3MMue3ZeqfvU_j52iVmJMpWfzuzedidIob5KyTw71baMKZXNgTCiaYce/pub?gid=643581002&single=true&output=csv";

// STATE
let cmsData = {}; // Stores content by ID
let allEvents = [];
let pendingEvents = [];

/**
 * ROBUST CSV PARSER
 * Iterates character by character to correctly handle empty fields like "id,,url"
 */
function parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const result = [];
    
    // Skip header (i=1)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const row = [];
        let currentCell = '';
        let insideQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                row.push(currentCell.trim());
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
        row.push(currentCell.trim()); // Push last cell
        
        // Clean quotes from cells
        const cleanedRow = row.map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"'));
        result.push(cleanedRow);
    }
    return result;
}

/**
 * Format Google Drive URLs to be usable as images
 */
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
 * LOAD CONTENT (CMS)
 * Maps CSV rows to HTML elements by data-content-id
 */
async function initCMS() {
    try {
        const resp = await fetch(CSV_CONTENT);
        const text = await resp.text();
        const rows = parseCSV(text);

        // CSV Structure: ID (0), TEXT (1), IMAGE (2)
        rows.forEach(row => {
            const id = row[0];
            const textContent = row[1];
            const imgUrl = formatUrl(row[2]);
            
            if (!id) return;
            
            // Store for Modals
            cmsData[id] = { text: textContent, img: imgUrl };
            
            // Update HTML Elements
            const els = document.querySelectorAll(`[data-content-id="${id}"]`);
            els.forEach(el => {
                // Image handling
                if (imgUrl) {
                    if (el.tagName === 'IMG') {
                        el.src = imgUrl;
                        el.onload = () => el.classList.remove('opacity-0');
                    } else {
                        el.style.backgroundImage = `url('${imgUrl}')`;
                        el.classList.remove('opacity-0');
                    }
                }
                
                // Text handling
                if (textContent && !imgUrl) {
                    el.innerHTML = textContent;
                    el.classList.remove('opacity-0'); // In case it was hidden
                }
            });
        });
    } catch (err) {
        console.error("CMS Load Error:", err);
    }
}

/**
 * LOAD EVENTS
 */
async function initEvents() {
    try {
        const resp = await fetch(CSV_EVENTS);
        const text = await resp.text();
        const rows = parseCSV(text);
        
        // CSV Structure: Date(0), Time(1), Title(2), Subtitle(3), Desc(4), Loc(5), Cat(6), Img(7)
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
            // Filter valid dates and future events
            const d = new Date(e.dateStr);
            return !isNaN(d) && d >= today;
        })
        .sort((a,b) => new Date(a.dateStr) - new Date(b.dateStr));
        
        renderEvents();
        
    } catch (err) {
        console.error("Events Load Error:", err);
        document.getElementById('events-slider').innerHTML = '<div class="text-white px-6">Errore caricamento eventi.</div>';
    }
}

function renderEvents() {
    const slider = document.getElementById('events-slider');
    slider.innerHTML = '';
    
    // Take first 5 events for slider
    const featured = allEvents.slice(0, 5);
    pendingEvents = allEvents.slice(5);
    
    if (featured.length === 0) {
        slider.innerHTML = '<div class="text-slate-500 italic">Nessun evento in programma.</div>';
        return;
    }

    featured.forEach(e => {
        const d = new Date(e.dateStr);
        const day = d.getDate();
        const month = d.toLocaleString('it-IT', { month: 'short' }).toUpperCase();
        
        const card = `
        <div class="snap-center shrink-0 w-[280px] h-[400px] relative bg-deep-800 rounded-2xl overflow-hidden group cursor-pointer border border-white/5 hover:border-gold-500/50 transition-all shadow-xl">
            <img src="${e.img}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100" loading="lazy">
            <div class="absolute inset-0 bg-gradient-to-t from-deep-950 via-deep-950/40 to-transparent"></div>
            
            <div class="absolute top-4 right-4 bg-deep-950/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase text-white border border-white/10">
                ${e.cat}
            </div>
            
            <div class="absolute bottom-0 left-0 p-6 w-full z-10">
                <div class="flex items-end gap-3 mb-2">
                    <span class="text-gold-400 font-serif text-4xl leading-none font-bold">${day}</span>
                    <span class="text-slate-300 font-bold text-xs uppercase tracking-widest mb-1 border-l border-white/20 pl-2">${month}</span>
                </div>
                <h3 class="text-xl font-serif text-white leading-tight mb-2 group-hover:text-gold-400 transition-colors line-clamp-2">${e.title}</h3>
                <p class="text-slate-400 text-xs flex items-center gap-2 line-clamp-1">
                    <i data-lucide="map-pin" class="w-3 h-3 text-gold-500"></i> ${e.loc}
                </p>
            </div>
        </div>
        `;
        slider.insertAdjacentHTML('beforeend', card);
    });

    if (pendingEvents.length > 0) {
        document.getElementById('load-more-btn').classList.remove('hidden');
    }
    
    if(window.lucide) window.lucide.createIcons();
}

/**
 * MODAL LOGIC
 */
window.openModal = (baseId) => {
    // Construct keys: prefix_title, prefix_desc, prefix_img
    const titleKey = baseId + "_title";
    const descKey = baseId + "_desc";
    const imgKey = baseId + "_img";
    
    // Default Fallbacks
    let title = "Dettaglio";
    let desc = "Descrizione non disponibile.";
    let img = "";
    
    // Try to find in CMS Data
    if (cmsData[titleKey]?.text) title = cmsData[titleKey].text;
    if (cmsData[descKey]?.text) desc = cmsData[descKey].text;
    if (cmsData[imgKey]?.img) img = cmsData[imgKey].img;
    
    // Fallback: Check if baseId itself has data
    if (title === "Dettaglio" && cmsData[baseId]?.text) title = cmsData[baseId].text;

    const modal = document.getElementById('info-modal');
    document.getElementById('modal-title').innerHTML = title;
    document.getElementById('modal-desc').innerHTML = desc;
    document.getElementById('modal-img').src = img || 'https://via.placeholder.com/800x600?text=No+Image';
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeModal = () => {
    document.getElementById('info-modal').classList.add('hidden');
    document.body.style.overflow = '';
};

window.showAllEvents = () => {
    const grid = document.getElementById('all-events-grid');
    grid.innerHTML = '';
    
    pendingEvents.forEach(e => {
        const d = new Date(e.dateStr);
        const dateStr = d.toLocaleDateString('it-IT');
        
        const item = `
        <div class="flex gap-4 p-4 bg-deep-800 border border-white/5 rounded-xl hover:border-gold-500/30 transition-colors cursor-pointer group items-center">
            <div class="w-20 h-20 rounded-lg bg-deep-950 overflow-hidden shrink-0 relative">
                <img src="${e.img}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
            </div>
            <div class="flex flex-col">
                <span class="text-gold-400 text-[10px] font-bold uppercase tracking-widest mb-1">${dateStr}</span>
                <h4 class="text-white font-serif text-lg leading-tight group-hover:text-gold-400 transition-colors line-clamp-1">${e.title}</h4>
                <span class="text-slate-500 text-xs mt-1 flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${e.loc}</span>
            </div>
        </div>
        `;
        grid.insertAdjacentHTML('beforeend', item);
    });
    
    grid.classList.remove('hidden');
    document.getElementById('load-more-btn').style.display = 'none';
    if(window.lucide) window.lucide.createIcons();
};

// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    initCMS();
    initEvents();
    if(window.lucide) window.lucide.createIcons();
});