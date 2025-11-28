import React, { useState, useRef } from 'react';
import { EventItem, EventCategory, EventLocation } from '../types';
import { analyzeEventPoster } from '../services/geminiService';
import { Upload, Plus, Trash2, Save, Loader2, Image as ImageIcon, X } from 'lucide-react';

interface AdminDashboardProps {
  events: EventItem[];
  setEvents: React.Dispatch<React.SetStateAction<EventItem[]>>;
  onClose: () => void;
  onEventAdded: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ events, setEvents, onClose, onEventAdded }) => {
  const [isAnalying, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [newEvent, setNewEvent] = useState<Partial<EventItem>>({
    title: '',
    subtitle: '',
    description: '',
    location: EventLocation.TEATRO_COMUNALE,
    category: EventCategory.MUSIC,
    time: '21:00',
    tags: [],
    imageUrl: ''
  });
  const [dateInput, setDateInput] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a local URL for preview immediately
    const previewUrl = URL.createObjectURL(file);
    setNewEvent(prev => ({ ...prev, imageUrl: previewUrl }));

    // Convert to Base64 for Gemini
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      
      setIsAnalyzing(true);
      try {
        const extractedData = await analyzeEventPoster(base64String);
        
        // Merge extracted data into form
        setNewEvent(prev => ({
          ...prev,
          ...extractedData,
          imageUrl: previewUrl // Keep the preview
        }));
        
        if (extractedData.date) {
            setDateInput(extractedData.date.toISOString().split('T')[0]);
        }
      } catch (err) {
        alert("Impossibile analizzare la locandina. Riprova o inserisci i dati manualmente.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !dateInput) return;

    const eventToAdd: EventItem = {
      id: Date.now().toString(),
      title: newEvent.title!,
      subtitle: newEvent.subtitle || '',
      description: newEvent.description || '',
      date: new Date(dateInput),
      time: newEvent.time || '21:00',
      location: (newEvent.location as EventLocation) || EventLocation.TEATRO_COMUNALE,
      category: (newEvent.category as EventCategory) || EventCategory.MUSIC,
      imageUrl: newEvent.imageUrl || 'https://picsum.photos/800/600',
      tags: newEvent.tags || []
    };

    setEvents(prev => [eventToAdd, ...prev]);
    onEventAdded(); // Notify parent

    // Reset form
    setNewEvent({
        title: '',
        subtitle: '',
        description: '',
        location: EventLocation.TEATRO_COMUNALE,
        category: EventCategory.MUSIC,
        time: '21:00',
        tags: [],
        imageUrl: ''
    });
    setDateInput('');
    alert("Evento aggiunto con successo!");
  };

  const handleDelete = (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questo evento?")) {
      setEvents(prev => prev.filter(e => e.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-100 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-stone-200">
          <div>
            <h2 className="text-3xl font-serif font-bold text-stone-900">Area Amministrativa</h2>
            <p className="text-stone-500">Gestisci gli eventi del portale Visit Avigliano Umbro</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X size={24} className="text-stone-600" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Plus size={20} className="text-brand-900" />
                Nuovo Evento
              </h3>
              
              {/* AI Upload Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-6 group ${
                  isAnalying ? 'bg-brand-50 border-brand-200' : 'border-stone-300 hover:border-brand-900 hover:bg-stone-50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                
                {isAnalying ? (
                  <div className="flex flex-col items-center text-brand-900">
                    <Loader2 size={32} className="animate-spin mb-2" />
                    <span className="font-medium text-sm">Analisi locandina con AI...</span>
                  </div>
                ) : newEvent.imageUrl ? (
                  <div className="relative">
                    <div className="mx-auto rounded-lg shadow-sm overflow-hidden w-2/3 aspect-[7/10]">
                         <img src={newEvent.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <span className="text-white text-xs font-bold">Cambia Locandina</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-stone-400">
                    <Upload size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm text-stone-600">Carica Locandina (70x100)</span>
                    <span className="text-xs mt-1">L'AI compilerà i dati per te</span>
                  </div>
                )}
              </div>

              {/* Manual Fields */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Titolo</label>
                    <input 
                        type="text" 
                        required
                        value={newEvent.title}
                        onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-1 focus:ring-brand-900 outline-none"
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Data</label>
                        <input 
                            type="date" 
                            required
                            value={dateInput}
                            onChange={e => setDateInput(e.target.value)}
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-1 focus:ring-brand-900 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Ora</label>
                        <input 
                            type="time" 
                            required
                            value={newEvent.time}
                            onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-1 focus:ring-brand-900 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Categoria</label>
                    <select 
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none"
                        value={newEvent.category}
                        onChange={e => setNewEvent({...newEvent, category: e.target.value as EventCategory})}
                    >
                         {Object.values(EventCategory).filter(c => c !== "Tutte le categorie").map(c => (
                            <option key={c} value={c}>{c}</option>
                         ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Luogo</label>
                     <select 
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none"
                        value={newEvent.location}
                        onChange={e => setNewEvent({...newEvent, location: e.target.value as EventLocation})}
                    >
                         {Object.values(EventLocation).filter(l => l !== "Tutti i luoghi").map(l => (
                            <option key={l} value={l}>{l}</option>
                         ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Descrizione</label>
                    <textarea 
                        rows={3}
                        value={newEvent.description}
                        onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-1 focus:ring-brand-900 outline-none text-sm"
                    ></textarea>
                </div>

                <button 
                    type="submit" 
                    className="w-full bg-brand-900 hover:bg-brand-800 text-white font-bold py-3 rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                    <Save size={18} />
                    Pubblica Evento
                </button>
              </form>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2">
             <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="p-4 bg-stone-50 border-b border-stone-200">
                    <h3 className="font-bold text-stone-700">Eventi Attivi ({events.length})</h3>
                </div>
                <div className="divide-y divide-stone-100">
                    {events.map(event => (
                        <div key={event.id} className="p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                            <div className="w-16 h-24 overflow-hidden rounded-md shadow-sm bg-stone-200 flex-shrink-0">
                                <img src={event.imageUrl} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-stone-900">{event.title}</h4>
                                <p className="text-xs text-stone-500">{new Date(event.date).toLocaleDateString()} • {event.time}</p>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-brand-50 text-brand-900 text-[10px] font-bold rounded-full uppercase">
                                    {event.category}
                                </span>
                            </div>
                            <button 
                                onClick={() => handleDelete(event.id)}
                                className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};