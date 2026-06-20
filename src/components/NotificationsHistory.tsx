import React, { useEffect } from 'react';
import { ArrowLeft, Trash2, BellOff, Calendar } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

interface Props {
  onBack: () => void;
}

export default function NotificationsHistory({ onBack }: Props) {
  const { notifications, clearAll, markAsRead } = useNotifications();

  // Marcar todas como leídas al entrar a esta vista
  useEffect(() => {
    notifications.forEach(n => {
      if (!n.read) markAsRead(n.id);
    });
  }, [notifications, markAsRead]);

  return (
    <div className="flex flex-col h-full bg-black p-6">
      <div className="flex items-center justify-between mb-8 mt-4">
        <button
          onClick={onBack}
          className="p-3 bg-[#1e1e1e] rounded-2xl text-white active:scale-95 transition-transform"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-white">Notificaciones</h2>
        <button
          onClick={clearAll}
          className="p-3 bg-red-500/20 text-red-500 rounded-2xl active:scale-95 transition-transform"
          title="Limpiar historial"
        >
          <Trash2 size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-20">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <BellOff size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No hay notificaciones</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              className={`bg-[#1e1e1e] rounded-2xl p-5 border transition-colors ${
                notif.read ? 'border-transparent' : 'border-blue-500'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  {!notif.read && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                  {notif.patientName}
                </h3>
                <span className="text-blue-400 font-bold bg-blue-500/10 px-3 py-1 rounded-lg text-sm">
                  {notif.time}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar size={14} />
                <span>Agendado para: {notif.date}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
