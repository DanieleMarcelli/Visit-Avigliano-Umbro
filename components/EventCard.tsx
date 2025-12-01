import React from 'react';
import { EventItem } from '../types';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';

interface EventCardProps {
  event: EventItem;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const dateStr = new Date(event.date).toLocaleDateString('it-IT', dateOptions).toUpperCase();
  const [day, month] = dateStr.split(' ');

  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden border border-stone-100 flex flex-col h-full relative">
      {/* Image Container - Adjusted to Vertical Poster Aspect Ratio (70x100 approx) */}
      <div className="relative aspect-[7/10] overflow-hidden bg-stone-100">
        <img 
          src={event.imageUrl} 
          alt={event.title} 
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
        
        {/* Category Badge */}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-brand-900 shadow-sm">
          {event.category}
        </div>

        {/* Date Overlay (Visible on image now for better layout) */}
        <div className="absolute bottom-4 left-4 flex flex-col items-center justify-center w-12 h-14 bg-white/95 backdrop-blur-sm rounded-lg text-brand-900 shadow-lg">
           <span className="text-xl font-bold leading-none">{day}</span>
           <span className="text-[10px] uppercase font-bold tracking-wider">{month}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Title & Subtitle */}
        <div className="mb-3">
          <h3 className="text-xl font-bold text-stone-900 leading-tight group-hover:text-brand-800 transition-colors font-serif">
            {event.title}
          </h3>
          {event.subtitle && (
            <p className="text-sm text-brand-800 font-medium mt-1">{event.subtitle}</p>
          )}
        </div>

        {/* Location & Time */}
        <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-stone-500 mb-4 items-center">
            <div className="flex items-center gap-1">
                <MapPin size={14} className="text-brand-900/70" />
                <span className="truncate max-w-[150px]">{event.location}</span>
            </div>
            <div className="flex items-center gap-1">
                <Calendar size={14} className="text-brand-900/70" />
                <span>{event.time}</span>
            </div>
        </div>

        {/* Description Snippet */}
        <p className="text-stone-600 text-sm line-clamp-3 mb-6 flex-1">
          {event.description}
        </p>

        {/* Footer Actions */}
        <div className="mt-auto pt-4 border-t border-stone-100 flex justify-between items-center">
            <div className="flex gap-2">
                {event.tags && event.tags.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="text-[10px] uppercase tracking-wide text-stone-400 bg-stone-50 px-2 py-1 rounded-md">
                        {tag}
                    </span>
                ))}
            </div>
            <button className="text-brand-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:gap-2 transition-all">
                Dettagli
                <ArrowRight size={14} />
            </button>
        </div>
      </div>
    </div>
  );
};