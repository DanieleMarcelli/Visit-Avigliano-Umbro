import React from 'react';
import { ChevronDown, MapPinned } from 'lucide-react';
import { HeroContent } from '../types';

interface HeroProps {
  content: HeroContent;
  onPrimaryCta?: () => void;
  onSecondaryCta?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ content, onPrimaryCta, onSecondaryCta }) => {
  return (
    <div className="relative min-h-[70vh] w-full overflow-hidden flex items-center justify-center bg-stone-900 pt-20">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={content.backgroundUrl}
          alt={content.title}
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/50 to-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto text-white">
        <span className="inline-flex items-center gap-2 py-1 px-3 border border-brand-gold/50 text-brand-gold text-xs font-bold tracking-[0.2em] uppercase rounded-full mb-6 backdrop-blur-sm">
          <MapPinned size={14} />
          {content.eyebrow}
        </span>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg serif tracking-tight">
          {content.title}
        </h1>
        <p className="text-lg md:text-xl text-stone-100 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          {content.description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onPrimaryCta}
            className="bg-brand-gold hover:bg-white hover:text-brand-900 text-brand-900 font-bold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2"
          >
            {content.primaryCta}
            <ChevronDown className="transition-transform" size={20} />
          </button>

          <button
            onClick={onSecondaryCta}
            className="border border-white/70 text-white hover:bg-white hover:text-brand-900 font-bold py-4 px-8 rounded-full transition-all duration-300 shadow-lg"
          >
            {content.secondaryCta}
          </button>
        </div>
      </div>
    </div>
  );
};