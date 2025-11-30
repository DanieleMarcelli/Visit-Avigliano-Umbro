
// Configuration placeholders - Replace with your actual Google Sheet CSV URLs
const CONTENT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR.../pub?output=csv"; 

// Global State
window.cmsData = {};

// --- Helper Functions ---

function formatImageUrl(url) {
    if (!url) return '';
    // Fix Google Drive links
    if (url.includes('drive.google.com')) {
        const idMatch = url.match(/[-\w]{25,}/);
        return idMatch ? `https://drive.google.com/thumbnail?id=${idMatch[0]}&sz=w1000` : url;
    }
    return url;
}

function parseCSVLine(text) {
    const result = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cell);
            cell = '';
        } else {
            cell += char;
        }
    }
    result.push(cell);
    return result;
}

// --- Navigation Functions (Exposed to Window) ---

window.scrollToEvents = function() {
    // Try to find the events section
    const eventsSection = document.getElementById('eventi-section');
    if (eventsSection) {
        eventsSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        // If not found (e.g., we are on a subpage like cammino.html), redirect to home anchor
        window.location.href = 'index.html#eventi-section';
    }
};

window.toggleMobileMenu = function() {
    const overlay = document.getElementById('mobile-menu-overlay');
    if (overlay) {
        const isHidden = overlay.classList.toggle('hidden');
        // Toggle scroll lock on body
        if (isHidden) {
            document.body.classList.remove('overflow-hidden');
        } else {
            document.body.classList.add('overflow-hidden');
        }
    }
};

// Placeholder for Cammino Timeline update to prevent errors on that page
window.updateCamminoTimeline = function() {
    const timeline = document.getElementById('cammino-timeline');
    if (!timeline) return;
    
    // Logic would go here to update timeline based on selected inputs
    // For now, we ensure it doesn't crash
    console.log("Updating timeline...");
};

// --- CMS Logic ---

async function loadContentCMS() {
    if (!CONTENT_CSV_URL || CONTENT_CSV_URL.includes("...")) return; // Skip if URL is not set
    try {
        const response = await fetch(CONTENT_CSV_URL);
        const text = await response.text();
        const rows = text.split('\n').filter(r => r.trim() !== '');
        
        // Pass 1: Populate Data
        rows.slice(1).forEach(row => {
            const cols = parseCSVLine(row);
            const id = cols[0];       
            const contentText = cols[1]; 
            const imageUrl = cols[2];    

            if (id) {
                if (contentText) window.cmsData[id] = contentText;
                if (imageUrl) window.cmsData[`${id}-img`] = formatImageUrl(imageUrl);

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

        // Pass 2: Reveal Elements (remove flash)
        requestAnimationFrame(() => {
            document.querySelectorAll('[data-content-id]').forEach(element => {
                element.classList.remove('opacity-0');
            });
        });

    } catch (e) { 
        console.error("CMS Error:", e);
        // Fallback: reveal elements even if error
        document.querySelectorAll('[data-content-id]').forEach(element => {
            element.classList.remove('opacity-0');
        });
    }
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    loadContentCMS();
    
    // Check for FormSubmit success parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === '1') {
        const msgBox = document.getElementById('success-message');
        if (msgBox) msgBox.classList.remove('hidden');
        // Clean URL to remove query param
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
    
    // Dynamically set the redirect URL for the contact form
    const contactForm = document.querySelector('form[action^="https://formsubmit.co"]');
    if (contactForm) {
        const nextInput = contactForm.querySelector('input[name="_next"]');
        if (nextInput) {
            // Set redirect to current page + success param + contact anchor
            nextInput.value = window.location.origin + window.location.pathname + "?success=1#contatti";
        }
    }
});
