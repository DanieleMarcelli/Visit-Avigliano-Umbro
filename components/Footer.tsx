import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-white py-12 border-t border-stone-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          
          {/* Column 1 */}
          <div>
            <h4 className="text-xl font-serif font-bold mb-4 text-brand-gold">Visit Avigliano Umbro</h4>
            <p className="text-stone-400 text-sm leading-relaxed mb-4">
              La guida ufficiale agli eventi, alla cultura e alle tradizioni del cuore verde dell'Umbria.
            </p>
            <div className="text-xs text-stone-500">
              © 2024 Visit Avigliano Umbro. All rights reserved.
            </div>
          </div>

          {/* Column 2 */}
          <div>
            <h4 className="text-lg font-bold mb-4">Contatti Rapidi</h4>
             <ul className="space-y-2 text-sm text-stone-400">
              <li className="flex items-start gap-2">
                <span>Piazza del Municipio, 1<br/>05020 Avigliano Umbro (TR)</span>
              </li>
              <li>Tel: +39 0744 933521</li>
              <li>Email: info@visitavigliano.it</li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h4 className="text-lg font-bold mb-4">Link Utili</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-stone-400 hover:text-brand-gold transition-colors">Area Media</a></li>
              <li><a href="#" className="text-stone-400 hover:text-brand-gold transition-colors">Per gli Organizzatori</a></li>
              <li><a href="#" className="text-stone-400 hover:text-brand-gold transition-colors">Come Arrivare</a></li>
              <li><a href="#" className="text-stone-400 hover:text-brand-gold transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};