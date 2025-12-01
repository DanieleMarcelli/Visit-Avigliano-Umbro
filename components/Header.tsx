import React from 'react';
import { Menu, Search, Share2, Globe, Calendar, Lock } from 'lucide-react';

interface HeaderProps {
  onAdminClick?: () => void;
  isAdminMode?: boolean;
  notificationCount?: number;
  onEventsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onAdminClick, isAdminMode, notificationCount = 0, onEventsClick }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-stone-200 text-stone-800 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Section */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href='/'}>
            <div className="w-10 h-10 bg-brand-900 rounded-full flex items-center justify-center text-white overflow-hidden shadow-md">
                <img src="https://picsum.photos/50/50" alt="Logo" className="w-full h-full object-cover opacity-90" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-brand-900 font-bold">Portale Turistico</span>
              <span className="text-xl font-bold font-serif leading-none text-stone-900">Visit Avigliano Umbro</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-stone-600 hover:text-brand-900 font-medium text-sm transition-colors">Territorio</a>
            <a href="#" className="text-stone-600 hover:text-brand-900 font-medium text-sm transition-colors">Storia</a>
            
            <button 
                onClick={onEventsClick}
                className="relative text-brand-900 font-semibold text-sm flex items-center gap-2 bg-brand-100 px-4 py-2 rounded-full hover:bg-brand-200 transition-all group"
            >
              <Calendar size={16} />
              Eventi
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white font-bold ring-2 ring-white animate-pulse shadow-sm">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            <a href="#" className="text-stone-600 hover:text-brand-900 font-medium text-sm transition-colors">Contatti</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
             <button className="p-2 text-stone-500 hover:text-brand-900 transition-colors md:hidden">
              <Search size={20} />
            </button>
            <button className="hidden sm:flex items-center gap-2 text-stone-600 hover:text-brand-900 px-3 py-1.5 border border-stone-300 rounded-full text-sm font-medium transition-colors">
              <Share2 size={16} />
              <span className="hidden lg:inline">Condividi</span>
            </button>
            
            {/* Admin Toggle */}
            <button 
              onClick={onAdminClick}
              className={`p-2 rounded-full transition-colors ${isAdminMode ? 'bg-brand-900 text-white' : 'text-stone-400 hover:text-brand-900'}`}
              title="Area Riservata"
            >
              <Lock size={18} />
            </button>

            <button className="p-2 text-stone-800 md:hidden">
              <Menu size={24} />
            </button>
            <div className="hidden md:flex items-center justify-center w-10 h-10 bg-brand-900 text-white rounded-full cursor-pointer hover:bg-brand-800 transition-colors shadow-md">
                <Globe size={18} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};