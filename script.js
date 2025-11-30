async function loadContentCMS() {
    if (!CONTENT_CSV_URL) return;
    try {
        const response = await fetch(CONTENT_CSV_URL);
        const text = await response.text();
        const rows = text.split('\n').filter(r => r.trim() !== '');
        
        // Prima passata: Popola i dati
        rows.slice(1).forEach(row => {
            const cols = parseCSVLine(row);
            const id = cols[0];       
            const contentText = cols[1]; 
            const imageUrl = cols[2];    

            if (id) {
                if (contentText) cmsData[id] = contentText;
                if (imageUrl) cmsData[`${id}-img`] = formatImageUrl(imageUrl);

                const elements = document.querySelectorAll(`[data-content-id="${id}"]`);
                elements.forEach(element => {
                    if (contentText) {
                        element.tagName === 'INPUT' ? element.placeholder = contentText : element.innerHTML = contentText;
                    }
                    if (imageUrl) {
                        const formattedUrl = formatImageUrl(imageUrl);
                        element.tagName === 'IMG' ? element.src = formattedUrl : element.style.backgroundImage = `url('${formattedUrl}')`;
                    }
                });
            }
        });

        // Seconda passata: Rivela gli elementi (rimuove il flash)
        // Aspetta un frame per assicurarsi che il DOM sia aggiornato
        requestAnimationFrame(() => {
            document.querySelectorAll('[data-content-id]').forEach(element => {
                element.classList.remove('opacity-0');
            });
        });

    } catch (e) { 
        console.error("CMS Error:", e);
        // Fallback in caso di errore: mostra comunque gli elementi vuoti per non rompere il layout
        document.querySelectorAll('[data-content-id]').forEach(element => {
            element.classList.remove('opacity-0');
        });
    }
}