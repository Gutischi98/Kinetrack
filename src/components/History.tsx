import React, { useState, useMemo } from 'react';
import { Calendar, ChevronRight, Trash2, ChevronLeft, Send, Search, ArrowDownUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Measurement, QuestionnaireResult, HistoryItem } from '../types';

interface HistoryProps {
  history: HistoryItem[];
  onDelete: (id: string) => void;
  onBack: () => void;
}

export default function History({ history, onDelete, onBack }: HistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'all' | 'scheduled'>('all');

  const prevDay = () => setScheduleDate(d => new Date(d.getTime() - 86400000));
  const nextDay = () => setScheduleDate(d => new Date(d.getTime() + 86400000));

  const uniquePatients = useMemo(() => {
    const patients = new Set<string>();
    history.forEach(item => {
      if (item.patientName) {
        patients.add(item.patientName);
      }
    });
    return Array.from(patients);
  }, [history]);

  const filteredSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return uniquePatients.filter(name => name.toLowerCase().includes(term));
  }, [searchTerm, uniquePatients]);

  const filteredAndSortedHistory = useMemo(() => {
    let result = history;

    if (viewMode === 'scheduled') {
      const timezoneOffset = scheduleDate.getTimezoneOffset() * 60000;
      const localDate = new Date(scheduleDate.getTime() - timezoneOffset);
      const fd = localDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      result = result.filter(item => item.type !== 'questionnaire' && (item as Measurement).nextSession === fd);
    }

    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(item => 
        (item.patientName && item.patientName.toLowerCase().includes(lowerTerm)) ||
        (item.date && item.date.toLowerCase().includes(lowerTerm))
      );
    }

    result = [...result].sort((a, b) => {
      const parseDate = (dString: string) => {
        if (!dString) return 0;
        if (dString.includes('/')) {
           const parts = dString.split('/');
           if(parts.length >= 3) {
             const year = parts[2].split(' ')[0];
             const time = new Date(Number(year), Number(parts[1])-1, Number(parts[0])).getTime();
             if (!isNaN(time)) return time;
           }
        }
        const time = new Date(dString).getTime();
        return isNaN(time) ? 0 : time;
      };
      
      const timeA = parseDate(a.date) || (!isNaN(Number(a.id)) ? Number(a.id) : 0);
      const timeB = parseDate(b.date) || (!isNaN(Number(b.id)) ? Number(b.id) : 0);
      
      if (viewMode === 'scheduled') {
          const timeA = (a as Measurement).nextSessionTime || "23:59";
          const timeB = (b as Measurement).nextSessionTime || "23:59";
          if (timeA === timeB) return Number(a.id) - Number(b.id);
          return timeA.localeCompare(timeB);
      }
      
      if (timeA !== 0 && timeB !== 0) {
          return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
      
      const indexA = history.findIndex(item => item.id === a.id);
      const indexB = history.findIndex(item => item.id === b.id);
      return sortOrder === 'desc' ? indexA - indexB : indexB - indexA;
    });

    return result;
  }, [history, searchTerm, sortOrder, viewMode, scheduleDate]);

  const handleShareWhatsApp = (item: HistoryItem) => {
    let text = '';
    
    if (item.type === 'questionnaire') {
      text = `*Evaluación Kinesica - Índice ${item.questionnaireName}*
*Paciente:* ${item.patientName || 'Anónimo'}

*Resultado:*
- ${item.questionnaireName === 'WORC' ? `Funcionalidad: ${item.score}%` : item.questionnaireName === 'PRWE' ? `Puntaje de Discapacidad: ${item.score}/100` : `Puntaje Global PSQI: ${item.score}`}`;
    } else {
      const m = item as Measurement;
      text = `*Evaluación Kinesica*
*Paciente:* ${m.patientName || 'Anónimo'}
${m.observations ? `\n*Observaciones:*\n${m.observations}\n` : ''}
*Dolor:*
- Actividad: ${m.painActivity}/10
- Reposo: ${m.painRest}/10

*Rango de Movimiento (ROM):*
${m.shoulderFlexion !== null ? `- Flexión Hombro: ${m.shoulderFlexion}°\n` : ''}${m.abduction !== null ? `- Abducción: ${m.abduction}°\n` : ''}${m.elbowFlexion !== null ? `- Flexión Codo: ${m.elbowFlexion}°\n` : ''}${m.wristFlexion !== null ? `- Flex. Muñeca: ${m.wristFlexion}°\n` : ''}${m.wristExtension !== null ? `- Ext. Muñeca: ${m.wristExtension}°\n` : ''}${m.pronation !== null ? `- Pronación: ${m.pronation}°\n` : ''}${m.supination !== null ? `- Supinación: ${m.supination}°\n` : ''}
*Alcance Funcional:*
- Cefálico: ${m.reachCephalic}
- Caudal: ${m.reachCaudal}

*Estado:* ${m.isDischarged ? 'Alta / Egreso' : `Próxima sesión: ${m.nextSession || 'No agendada'} ${m.nextSessionTime ? `a las ${m.nextSessionTime}` : ''}`}`;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-black text-white p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="p-2 bg-[#1e1e1e] rounded-full text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">Historial</h1>
        <div className="relative">
          <button className="p-2 bg-[#1e1e1e] rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer">
            <Calendar size={24} />
          </button>
          <input 
            type="date"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => {
              if (e.target.value) {
                const parts = e.target.value.split('-');
                setScheduleDate(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
                setViewMode('scheduled');
              }
            }}
          />
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o fecha..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full bg-[#1e1e1e] text-white rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setShowSuggestions(false);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 z-10"
              title="Borrar búsqueda"
            >
              <X size={18} />
            </button>
          )}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden z-20 shadow-2xl">
              {filteredSuggestions.slice(0, 5).map(name => (
                <button
                  key={name}
                  onClick={() => {
                    setSearchTerm(name);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-5 py-4 hover:bg-[#2a2a2a] border-b border-[#2a2a2a] last:border-0 transition-colors flex flex-col gap-1"
                >
                  <span className="font-bold text-white text-base">{name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="bg-[#1e1e1e] p-4 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0"
          title={sortOrder === 'desc' ? "Más reciente primero" : "Más antiguo primero"}
        >
          <ArrowDownUp size={20} className={sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      <div className="flex items-center justify-between bg-[#1e1e1e] rounded-2xl p-2 mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
        <button 
          onClick={prevDay} 
          disabled={viewMode === 'all'}
          className={`p-3 transition-colors active:scale-95 ${viewMode === 'all' ? 'text-[#1e1e1e] cursor-default' : 'text-gray-400 hover:text-white'}`}
        >
          <ChevronLeft />
        </button>
        <div 
          onClick={() => setViewMode(v => v === 'all' ? 'scheduled' : 'all')}
          className="relative px-4 flex flex-1 items-center justify-center cursor-pointer hover:bg-[#2a2a2a] rounded-xl py-2 transition-colors"
          title="Tocar para alternar entre historial completo y pacientes agendados"
        >
          <Calendar size={18} className="mr-2 text-gray-400" />
          <span className="font-bold text-lg text-white tracking-wide text-center">
            {viewMode === 'all' ? 'Historial Completo' : `Agendados: ${scheduleDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
          </span>
        </div>
        <button 
          onClick={nextDay} 
          disabled={viewMode === 'all'}
          className={`p-3 transition-colors active:scale-95 ${viewMode === 'all' ? 'text-[#1e1e1e] cursor-default' : 'text-gray-400 hover:text-white'}`}
        >
          <ChevronRight />
        </button>
      </div>

      {filteredAndSortedHistory.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
          <Calendar size={64} strokeWidth={1} />
          <p className="text-center px-6">
            {searchTerm 
              ? 'No se encontraron resultados.' 
              : viewMode === 'scheduled' 
                ? 'No hay horas agendadas para esta fecha.' 
                : 'No hay mediciones guardadas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedHistory.map((item) => (
            <div key={item.id} className="bg-[#1e1e1e] rounded-3xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">{item.date}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleShareWhatsApp(item)}
                    className="text-green-500/70 hover:text-green-500 transition-colors p-1"
                    title="Compartir por WhatsApp"
                  >
                    <Send size={18} />
                  </button>
                  <button 
                    onClick={() => setItemToDelete(item.id)}
                    className="text-red-500/50 hover:text-red-500 transition-colors p-1"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-white">{item.patientName || 'Paciente Anónimo'}</h3>
                {item.type !== 'questionnaire' && (item as Measurement).diagnosis && (
                  <p className="text-sm font-medium text-blue-400">{(item as Measurement).diagnosis}</p>
                )}
                {item.type !== 'questionnaire' && (item as Measurement).observations && (
                  <p className="text-xs text-gray-400 italic">{(item as Measurement).observations}</p>
                )}
                {item.type === 'questionnaire' ? (
                  <div className="flex gap-4 text-xs font-medium pt-1">
                    <span className="text-purple-400">Cuestionario: {item.questionnaireName}</span>
                  </div>
                ) : (
                  <div className="flex gap-4 text-xs font-medium pt-1">
                    <span className="text-red-400">Dolor Actividad: {(item as Measurement).painActivity}/10</span>
                    <span className="text-orange-400">Dolor Reposo: {(item as Measurement).painRest}/10</span>
                  </div>
                )}
              </div>
              
              {item.type === 'questionnaire' ? (
                <div className="pt-2">
                  <div className="bg-[#2a2a2a] rounded-2xl p-4 flex items-center justify-between">
                    <span className="text-gray-400 uppercase tracking-widest text-xs font-bold">
                      {item.questionnaireName === 'WORC' ? 'Funcionalidad' : item.questionnaireName === 'PRWE' ? 'Discapacidad' : 'Calidad de Sueño (PSQI)'}
                    </span>
                    <span className={`text-2xl font-black ${item.questionnaireName === 'WORC' ? 'text-blue-500' : item.questionnaireName === 'PRWE' ? 'text-purple-500' : 'text-emerald-500'}`}>
                      {item.score}{item.questionnaireName === 'WORC' ? '%' : ''}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {[
                      [(item as Measurement).shoulderFlexion, "Hombro"],
                      [(item as Measurement).abduction, "Abd."],
                      [(item as Measurement).elbowFlexion, "Codo"],
                      [(item as Measurement).wristFlexion, "Flx.Muñ"],
                      [(item as Measurement).wristExtension, "Ext.Muñ"],
                      [(item as Measurement).pronation, "Pron."],
                      [(item as Measurement).supination, "Sup."]
                    ].map(([val, label]) => val !== undefined && val !== null ? (
                      <div key={label as string} className="bg-[#2a2a2a] px-2 py-1.5 flex-1 min-w-[70px] text-center rounded-lg">
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest">{label}</p>
                        <p className="text-sm font-bold text-orange-500">{val}°</p>
                      </div>
                    ) : null)}
                  </div>

                  <div className="pt-3 border-t border-[#2a2a2a] space-y-1">
                    <p className="text-xs text-gray-400"><span className="font-bold text-gray-300">Cefálico:</span> {(item as Measurement).reachCephalic}</p>
                    <p className="text-xs text-gray-400"><span className="font-bold text-gray-300">Caudal:</span> {(item as Measurement).reachCaudal}</p>
                  </div>

                  <div className={`pt-3 border-t border-[#2a2a2a] flex items-center justify-center rounded-xl p-2 ${(item as Measurement).isDischarged ? 'bg-green-600/10 text-green-400' : 'bg-[#2a2a2a]/50 text-gray-300'}`}>
                    <span className="text-xs font-bold uppercase tracking-widest text-center">
                      {(item as Measurement).isDischarged ? 'Alta / Egreso' : `Próxima sesión: ${(item as Measurement).nextSession || 'No agendada'} ${(item as Measurement).nextSessionTime ? `| ${(item as Measurement).nextSessionTime}` : ''}`}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {itemToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e1e1e] rounded-3xl p-6 w-full max-w-sm space-y-6 border border-[#2a2a2a] shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white text-center">Confirmar eliminación</h2>
              <p className="text-gray-400 text-center text-sm">
                ¿Estás seguro de borrar el registro? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-3 rounded-xl bg-[#2a2a2a] text-white hover:bg-[#333] transition-colors font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onDelete(itemToDelete);
                    setItemToDelete(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-colors font-bold"
                >
                  Borrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
