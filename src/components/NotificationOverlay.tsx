import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../hooks/useNotifications';
import { Bell, Clock } from 'lucide-react';

export default function NotificationOverlay() {
  const { activeNotification, dismissActiveNotification } = useNotifications();

  return (
    <AnimatePresence>
      {activeNotification && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.x > 100 || offset.x < -100 || velocity.x > 500 || velocity.x < -500) {
              dismissActiveNotification();
            }
          }}
          className="fixed top-8 left-4 right-4 z-[9999] bg-[#2a2a2a] border border-[#3a3a3a] rounded-2xl p-4 shadow-2xl flex items-center gap-4 cursor-grab active:cursor-grabbing"
        >
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
            <Bell size={24} className="animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg leading-tight">
              ¡Paciente en espera!
            </h3>
            <p className="text-gray-400 text-sm mt-0.5">
              {activeNotification.patientName} ha llegado.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg shrink-0">
            <Clock size={16} />
            <span className="font-semibold">{activeNotification.time}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
