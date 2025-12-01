import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { FilterBar } from './components/FilterBar';
import { EventCard } from './components/EventCard';
import { EventModal } from './components/EventModal';
import { Footer } from './components/Footer';
import { AIChatAssistant } from './components/AIChatAssistant';
import { AdminDashboard } from './components/AdminDashboard';
import { EVENTS, MONTHS } from './constants';
import { FilterState, EventCategory, EventLocation, EventItem, HeaderContent, HeroContent } from './types';
import { CalendarOff } from 'lucide-react';
import { updateGeminiContext } from './services/geminiService';
import { DEFAULT_HEADER_CONTENT, fetchHeaderContent } from './services/headerContentService';
import { DEFAULT_HERO_CONTENT, fetchHeroContent } from './services/heroContentService';

const App: React.FC = () => {
  // State for events (initialized with constants, but mutable)
  const [events, setEvents] = useState<EventItem[]>(EVENTS);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [headerContent, setHeaderContent] = useState<HeaderContent>(DEFAULT_HEADER_CONTENT);
  const [heroContent, setHeroContent] = useState<HeroContent>(DEFAULT_HERO_CONTENT);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Notification State
  const [newEventsCount, setNewEventsCount] = useState(0);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    month: MONTHS[0],
    category: EventCategory.ALL,
    location: EventLocation.ALL
  });

  // Update Gemini Context whenever events change
  useEffect(() => {
    updateGeminiContext(events);
  }, [events]);

  useEffect(() => {
    fetchHeaderContent().then(setHeaderContent);
  }, []);

  useEffect(() => {
    fetchHeroContent().then(setHeroContent);
  }, []);

  const handleEventAdded = () => {
    setNewEventsCount(prev => prev + 1);
  };

  const clearNotifications = () => {
    setNewEventsCount(0);
    // Optional: Scroll to events section if needed
    const eventsSection = document.getElementById('eventi-section');
    if (eventsSection) {
      eventsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter Logic
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Search
      const searchMatch = 
        event.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        event.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        (event.subtitle && event.subtitle.toLowerCase().includes(filters.search.toLowerCase()));
      
      if (!searchMatch) return false;

      // Month
      if (filters.month !== MONTHS[0]) {
        const eventMonth = new Date(event.date).toLocaleString('it-IT', { month: 'long' });
        // Capitalize first letter to match constant
        const capMonth = eventMonth.charAt(0).toUpperCase() + eventMonth.slice(1);
        if (capMonth.toLowerCase() !== filters.month.toLowerCase()) return false;
      }

      // Category
      if (filters.category !== EventCategory.ALL && event.category !== filters.category) {
        return false;
      }

      // Location
      if (filters.location !== EventLocation.ALL && event.location !== filters.location) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filters, events]);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      <Header
        onAdminClick={() => setIsAdminOpen(!isAdminOpen)}
        isAdminMode={isAdminOpen}
        notificationCount={newEventsCount}
        onEventsClick={clearNotifications}
        content={headerContent}
      />

      {isAdminOpen ? (
        <AdminDashboard
            events={events}
            setEvents={setEvents}
            onClose={() => setIsAdminOpen(false)}
            onEventAdded={handleEventAdded}
        />
      ) : (
        <main className="flex-grow">
          <Hero
            content={heroContent}
            onPrimaryCta={clearNotifications}
            onSecondaryCta={() => window.location.href = '/cammino.html'}
          />

          <section className="pt-16" id="eventi-section">
            <FilterBar filters={filters} setFilters={setFilters} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-stone-900">Eventi in Programma</h2>
                  <p className="text-stone-500 mt-2">
                    {filteredEvents.length} {filteredEvents.length === 1 ? 'evento trovato' : 'eventi trovati'}
                  </p>
                </div>
              </div>

              {filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {filteredEvents.map(event => (
                    <div key={event.id} className="h-full">
                      <EventCard event={event} onSelect={setSelectedEvent} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-stone-400 bg-white rounded-xl border border-dashed border-stone-300">
                  <CalendarOff size={48} className="mb-4 text-stone-300" />
                  <p className="text-lg font-medium">Nessun evento trovato</p>
                  <p className="text-sm">Prova a modificare i filtri di ricerca</p>
                  <button
                    onClick={() => setFilters({ search: '', month: MONTHS[0], category: EventCategory.ALL, location: EventLocation.ALL })}
                    className="mt-4 text-brand-900 font-bold hover:underline"
                  >
                    Resetta filtri
                  </button>
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      {!isAdminOpen && <Footer />}
      {!isAdminOpen && <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      <AIChatAssistant />
    </div>
  );
};

export default App;