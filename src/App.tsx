import React, { useState, useEffect } from "react";
import {
  Timer as TimerIcon,
  Activity,
  History as HistoryIcon,
  ClipboardList,
  X,
} from "lucide-react";
import Timer from "./components/Timer";
import Evolution from "./components/Evolution";
import { StatusBar } from "@capacitor/status-bar";
import { App as CapacitorApp } from "@capacitor/app";
import History from "./components/History";
import Questionnaire from "./components/Questionnaire";
import { motion, AnimatePresence } from "motion/react";
import { Measurement, QuestionnaireResult, HistoryItem } from "./types";

type View = "menu" | "timer" | "evolution" | "history" | "questionnaire";

export default function App() {
  const [currentView, setCurrentView] = useState<View>("menu");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showAbout, setShowAbout] = useState(false);

  const configureScreen = async () => {
    try {
      await StatusBar.show(); // Ensure the time is visible
      if ((window as any).AndroidFullScreen) {
        // HIDE_NAVIGATION(2) | IMMERSIVE_STICKY(4096) | LAYOUT_HIDE_NAVIGATION(512) | LAYOUT_STABLE(256)
        (window as any).AndroidFullScreen.setSystemUiVisibility(
          4866,
          () => {},
          () => {},
        );
      }
    } catch (e) {
      console.error("Failed to configure screen:", e);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("kinetrack_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }

    configureScreen();

    const listener = CapacitorApp.addListener("backButton", () => {
      setCurrentView((prev) => {
        if (prev !== "menu") {
          return "menu";
        } else {
          CapacitorApp.exitApp();
          return prev;
        }
      });
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  const saveMeasurement = (m: Measurement) => {
    const newHistory = [m, ...history];
    setHistory(newHistory);
    localStorage.setItem("kinetrack_history", JSON.stringify(newHistory));
    setCurrentView("history");
  };

  const saveQuestionnaire = (q: QuestionnaireResult) => {
    const newHistory = [q, ...history];
    setHistory(newHistory);
    localStorage.setItem("kinetrack_history", JSON.stringify(newHistory));
    setCurrentView("history");
  };

  const deleteMeasurement = (id: string) => {
    const newHistory = history.filter((m) => m.id !== id);
    setHistory(newHistory);
    localStorage.setItem("kinetrack_history", JSON.stringify(newHistory));
  };

  return (
    <div className="fixed inset-0 bg-black font-sans select-none overflow-hidden">
      <AnimatePresence mode="wait">
        {currentView === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full p-8 justify-center space-y-8"
          >
            <div className="text-center mb-8">
              <h1
                onClick={() => setShowAbout(true)}
                className="text-5xl font-black text-white tracking-tighter cursor-pointer hover:text-gray-300 transition-colors inline-block active:scale-95"
              >
                KINETRACK
              </h1>
            </div>

            <button
              onClick={() => setCurrentView("timer")}
              className="group relative bg-[#1e1e1e] p-8 rounded-[2.5rem] flex items-center gap-6 transition-all hover:bg-[#252525] active:scale-95 overflow-hidden"
            >
              <div className="w-16 h-16 bg-green-600/20 rounded-2xl flex items-center justify-center text-green-500">
                <TimerIcon size={32} />
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-bold text-white">Contador</h2>
                <p className="text-gray-500 text-sm">
                  Ciclos de aguante y descanso
                </p>
              </div>
              <div className="absolute right-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <TimerIcon size={80} />
              </div>
            </button>

            <button
              onClick={() => setCurrentView("evolution")}
              className="group relative bg-[#1e1e1e] p-8 rounded-[2.5rem] flex items-center gap-6 transition-all hover:bg-[#252525] active:scale-95 overflow-hidden"
            >
              <div className="w-16 h-16 bg-orange-600/20 rounded-2xl flex items-center justify-center text-orange-500">
                <Activity size={32} />
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-bold text-white">Evolucionar</h2>
                <p className="text-gray-500 text-sm">
                  Medir grados de movimiento
                </p>
              </div>
              <div className="absolute right-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity size={80} />
              </div>
            </button>

            <button
              onClick={() => setCurrentView("questionnaire")}
              className="group relative bg-[#1e1e1e] p-8 rounded-[2.5rem] flex items-center gap-6 transition-all hover:bg-[#252525] active:scale-95 overflow-hidden"
            >
              <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500">
                <ClipboardList size={32} />
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-bold text-white">Cuestionario</h2>
                <p className="text-gray-500 text-sm">Índice WORC | Índice PWRE</p>
              </div>
              <div className="absolute right-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <ClipboardList size={80} />
              </div>
            </button>

            <button
              onClick={() => setCurrentView("history")}
              className="group relative bg-[#1e1e1e] p-8 rounded-[2.5rem] flex items-center gap-6 transition-all hover:bg-[#252525] active:scale-95 overflow-hidden"
            >
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500">
                <HistoryIcon size={32} />
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-bold text-white">Historial</h2>
                <p className="text-gray-500 text-sm">
                  Ver mediciones anteriores
                </p>
              </div>
              <div className="absolute right-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <HistoryIcon size={80} />
              </div>
            </button>
          </motion.div>
        )}

        {currentView === "timer" && (
          <motion.div
            key="timer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full relative"
          >
            <Timer onBack={() => setCurrentView("menu")} />
          </motion.div>
        )}

        {currentView === "evolution" && (
          <motion.div
            key="evolution"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Evolution
              onSave={saveMeasurement}
              onViewHistory={() => setCurrentView("history")}
              onBack={() => setCurrentView("menu")}
            />
          </motion.div>
        )}

        {currentView === "questionnaire" && (
          <motion.div
            key="questionnaire"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Questionnaire
              onSave={saveQuestionnaire}
              onBack={() => setCurrentView("menu")}
            />
          </motion.div>
        )}

        {currentView === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <History
              history={history}
              onDelete={deleteMeasurement}
              onBack={() => setCurrentView("menu")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAbout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e1e1e] rounded-3xl p-8 w-full max-w-sm border border-[#2a2a2a] relative text-center"
            >
              <button
                onClick={() => setShowAbout(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                title="Cerrar"
              >
                <X size={24} />
              </button>

              <h2 className="text-2xl font-black text-orange-500 tracking-tighter mb-8">
                KINETRACK
              </h2>

              <div className="space-y-2 text-gray-300 font-medium">
                <p>Designed by Aleeh</p>
                <p>Coded by Aleeh & Güti</p>
                <p>Built by Güti</p>
              </div>

              <div className="mt-8 space-y-1 text-sm text-gray-500">
                <p className="font-bold">Version 2.1.5</p>
                <p>Abril 2026</p>
                <p>Gran Concepción, Chile.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
