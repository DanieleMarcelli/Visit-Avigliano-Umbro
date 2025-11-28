import React from 'react';
import { ChevronDown } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden flex items-center justify-center bg-stone-900 mt-20">
      {/* Background Image with Overlay - Changed to Theater Interior */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1514306191717-452245255e0c?q=80&w=1920&auto=format&fit=crop" 
          alt="Teatro Comunale Avigliano Umbro" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/40 to-black/40"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto text-white">
        <span className="inline-block py-1 px-3 border border-brand-gold/50 text-brand-gold text-xs font-bold tracking-[0.2em] uppercase rounded-full mb-6 backdrop-blur-sm">
          Cultura e Territorio
        </span>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg serif tracking-tight">
          Avigliano Umbro Eventi
        </h1>
        <p className="text-lg md:text-xl text-stone-100 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          Il calendario completo degli appuntamenti culturali, musicali e teatrali del nostro territorio. 
          Scopri la bellezza delle nostre tradizioni.
        </p>
        
        <button className="bg-brand-gold hover:bg-white hover:text-brand-900 text-brand-900 font-bold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto group">
          Vedi Programma
          <ChevronDown className="group-hover:translate-y-1 transition-transform" size={20} />
        </button>
      </div>
    </div>
  );
};