import React from 'react';
import { Search, MapPin, Calendar, Tag } from 'lucide-react';
import { FilterState, EventCategory, EventLocation } from '../types';
import { MONTHS } from '../constants';

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters }) => {
  const handleChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="sticky top-20 z-40 bg-white border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* Search Input */}
          <div className="relative flex-grow lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="Cerca evento, artista o luogo..."
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 outline-none text-sm transition-all"
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
            />
          </div>

          {/* Filters Group */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 lg:pb-0 flex-1">
            
            {/* Month Filter */}
            <div className="relative min-w-[140px]">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
              <select
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 font-medium focus:border-brand-900 focus:ring-1 focus:ring-brand-900 outline-none appearance-none cursor-pointer hover:bg-stone-50 transition-colors"
                value={filters.month}
                onChange={(e) => handleChange('month', e.target.value)}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none border-l border-stone-200 pl-2">
                 <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            {/* Category Filter */}
            <div className="relative min-w-[160px]">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
              <select
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 font-medium focus:border-brand-900 focus:ring-1 focus:ring-brand-900 outline-none appearance-none cursor-pointer hover:bg-stone-50 transition-colors"
                value={filters.category}
                onChange={(e) => handleChange('category', e.target.value)}
              >
                {Object.values(EventCategory).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
               <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none border-l border-stone-200 pl-2">
                 <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            {/* Location Filter */}
            <div className="relative min-w-[160px]">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
              <select
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 font-medium focus:border-brand-900 focus:ring-1 focus:ring-brand-900 outline-none appearance-none cursor-pointer hover:bg-stone-50 transition-colors"
                value={filters.location}
                onChange={(e) => handleChange('location', e.target.value)}
              >
                {Object.values(EventLocation).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
               <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none border-l border-stone-200 pl-2">
                 <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};