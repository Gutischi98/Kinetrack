import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppNotification, HistoryItem, Measurement } from '../types';

interface NotificationsContextType {
  notifications: AppNotification[];
  activeNotification: AppNotification | null;
  dismissActiveNotification: () => void;
  markAsRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const NOTIFICATIONS_STORAGE_KEY = 'kinetrack_notifications';
const NOTIFIED_IDS_STORAGE_KEY = 'kinetrack_notified_ids';

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [notifiedIds, setNotifiedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(NOTIFIED_IDS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [activeNotification, setActiveNotification] = useState<AppNotification | null>(null);

  // Play a short and clear "ding" using Web Audio API
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);

      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio context error:", e);
    }
  };

  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(NOTIFIED_IDS_STORAGE_KEY, JSON.stringify(notifiedIds));
  }, [notifiedIds]);

  useEffect(() => {
    const checkAppointments = () => {
      const savedHistory = localStorage.getItem('kinetrack_history');
      if (!savedHistory) return;

      try {
        const history: HistoryItem[] = JSON.parse(savedHistory);
        const measurements = history.filter((item): item is Measurement => 
          item.type !== 'questionnaire' && 'nextSession' in item && 'nextSessionTime' in item
        );

        const now = new Date();
        const currentDateStr = now.toISOString().split('T')[0];
        
        // Format current time as HH:mm for easy string comparison
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTimeStr = `${currentHour}:${currentMinute}`;

        measurements.forEach(m => {
          if (m.nextSession === currentDateStr && m.nextSessionTime && m.nextSessionTime <= currentTimeStr) {
            // Check if we already notified for this specific measurement session
            const notificationId = `notif_${m.id}_${m.nextSession}_${m.nextSessionTime}`;
            const alreadyNotified = notifiedIds.includes(notificationId);

            if (!alreadyNotified) {
              const newNotif: AppNotification = {
                id: notificationId,
                patientName: m.patientName,
                date: m.nextSession,
                time: m.nextSessionTime,
                read: false,
                timestamp: Date.now()
              };

              setNotifiedIds(prev => [...prev, notificationId]);
              setNotifications(prev => [newNotif, ...prev]);
              setActiveNotification(newNotif);
              playNotificationSound();

              // Auto-dismiss after 8 seconds
              setTimeout(() => {
                setActiveNotification(current => 
                  current?.id === notificationId ? null : current
                );
              }, 8000);
            }
          }
        });

      } catch (e) {
        console.error("Failed to parse history for notifications", e);
      }
    };

    // Check immediately and then every 10 seconds
    checkAppointments();
    const interval = setInterval(checkAppointments, 10000);

    return () => clearInterval(interval);
  }, [notifiedIds]); // Re-run when notifiedIds change to keep up-to-date with what we've already fired

  const dismissActiveNotification = () => {
    setActiveNotification(null);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationsContext.Provider value={{
      notifications,
      activeNotification,
      dismissActiveNotification,
      markAsRead,
      deleteNotification,
      clearAll
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
