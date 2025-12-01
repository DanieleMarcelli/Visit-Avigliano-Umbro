import React from 'react';
import { Calendar, MapPin, Tag, X } from 'lucide-react';
import { EventItem } from '../types';

interface EventModalProps {
  event: EventItem | null;
  onClose: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const formattedDate = new Date(event.date).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/80 hover:bg-white text-stone-700 rounded-full p-2 shadow"
          aria-label="Chiudi"
        >
          <X size={18} />
        </button>

        <div className="relative h-64 bg-stone-100">
          <img src={event.imageUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-6 text-white">
            <h2 className="text-3xl font-serif font-bold leading-tight drop-shadow">{event.title}</h2>
            {event.subtitle && <p className="text-sm text-white/90">{event.subtitle}</p>}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-4 text-sm text-stone-600">
            <span className="inline-flex items-center gap-2 bg-stone-100 px-3 py-2 rounded-full">
              <Calendar size={16} className="text-brand-900" />
              {formattedDate} · {event.time}
            </span>
            <span className="inline-flex items-center gap-2 bg-stone-100 px-3 py-2 rounded-full">
              <MapPin size={16} className="text-brand-900" />
              {event.location}
            </span>
          </div>

          <p className="text-stone-700 leading-relaxed">{event.description}</p>

          {event.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag, index) => (
                <span key={index} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-900 bg-brand-50 px-2 py-1 rounded-full">
                  <Tag size={12} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
