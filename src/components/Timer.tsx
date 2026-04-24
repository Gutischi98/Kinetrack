import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TimerConfig, TimerPhase, TimerState } from '../types';

const INITIAL_CONFIG: TimerConfig = {
  workTime: 10,
  restTime: 6,
  cycles: 10,
  useFlash: true,
  workIncrement: 0,
};

interface TimerProps {
  onBack: () => void;
}

export default function Timer({ onBack }: TimerProps) {
  const [config, setConfig] = useState<TimerConfig>(INITIAL_CONFIG);
  const [state, setState] = useState<TimerState>('idle');
  const [phase, setPhase] = useState<TimerPhase>('work');
  const [currentCycle, setCurrentCycle] = useState(1);
  const [timeLeft, setTimeLeft] = useState(config.workTime);
  const [showConfig, setShowConfig] = useState(true);
  const [countdownValue, setCountdownValue] = useState(3);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  useEffect(() => {
    if (state === 'countdown') {
      if (countdownValue > 0) {
        const timer = setTimeout(() => setCountdownValue(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setPhase('work');
        setTimeLeft(config.workTime + (currentCycle - 1) * config.workIncrement);
        setState('running');
        playSound();
      }
    }
  }, [state, countdownValue]);

  useEffect(() => {
    if (state === 'running' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (state === 'running' && timeLeft === 0) {
      handlePhaseTransition();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, timeLeft]);

  const handlePhaseTransition = () => {
    if (phase === 'work') {
      if (currentCycle >= config.cycles) {
        setState('completed');
        playSound();
      } else {
        setPhase('rest');
        setTimeLeft(config.restTime);
        triggerFlash();
        playSound();
      }
    } else {
      const nextCycle = currentCycle + 1;
      setCurrentCycle(nextCycle);
      setPhase('work');
      setTimeLeft(config.workTime + (nextCycle - 1) * config.workIncrement);
      triggerFlash();
      playSound();
    }
  };

  const triggerFlash = () => {
    if (config.useFlash) {
      setState('flash');
      setTimeout(() => {
        setState('running');
      }, 700);
    }
  };

  const startTimer = () => {
    setShowConfig(false);
    setCurrentCycle(1);
    setCountdownValue(3);
    setState('countdown');
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const restartCurrentCycle = () => {
    setCountdownValue(3);
    setState('countdown');
  };

  const togglePause = () => {
    setState((prev) => (prev === 'running' ? 'paused' : 'running'));
  };

  const stopTimer = () => {
    setState('idle');
    setShowConfig(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const updateConfig = (key: keyof TimerConfig, delta: number) => {
    setConfig(prev => {
      const val = prev[key] as number;
      const minVal = key === 'workIncrement' ? 0 : 1;
      return { ...prev, [key]: Math.max(minVal, val + delta) };
    });
  };

  if (state === 'flash') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-white flex items-center justify-center z-50"
      >
        <h1 className="text-5xl sm:text-6xl font-black text-black tracking-tighter">CAMBIO</h1>
      </motion.div>
    );
  }

  if (state === 'countdown') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black">
        <motion.div
          key={countdownValue}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
          className="flex flex-col items-center"
        >
          <h2 className="text-8xl sm:text-9xl font-bold text-white">{countdownValue}</h2>
          <p className="text-gray-400 mt-4 uppercase tracking-widest font-bold text-sm sm:text-base">Prepárate</p>
        </motion.div>
      </div>
    );
  }

  if (state === 'completed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full px-6 space-y-8 bg-black"
      >
        <div className="text-center space-y-4">
          <h2 className="text-4xl sm:text-6xl font-black text-green-500 tracking-tighter">COMPLETADO</h2>
          <p className="text-gray-400 uppercase tracking-widest font-bold text-sm sm:text-base">{config.cycles} Ciclos Finalizados</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full max-w-sm gap-4 mt-8">
          <button
            onClick={stopTimer}
            className="flex-1 bg-[#2a2a2a] py-4 rounded-2xl font-bold hover:bg-[#3a3a3a] transition-colors flex items-center justify-center gap-2 text-white"
          >
            <ChevronLeft size={20} /> Volver
          </button>
          <button
            onClick={startTimer}
            className="flex-1 bg-green-600 py-4 rounded-2xl font-bold hover:bg-green-500 transition-colors flex items-center justify-center gap-2 text-white"
          >
            <RotateCcw size={20} /> Repetir
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white p-4 sm:p-6 overflow-y-auto">
      <AnimatePresence mode="wait">
        {showConfig ? (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 max-w-md mx-auto w-full pb-20 mt-4 sm:mt-0"
          >
            <div className="flex justify-between items-center mb-6">
              <button onClick={onBack} className="p-2 bg-[#1e1e1e] rounded-full text-gray-400 hover:text-white transition-colors flex-shrink-0">
                <ChevronLeft size={24} />
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-center">Configuración</h1>
              <div className="w-10 flex-shrink-0"></div>
            </div>

            {/* Work Time Config */}
            <div className="bg-[#1e1e1e] rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-orange-500 font-bold uppercase tracking-widest text-xs sm:text-sm">Aguante</span>
                <span className="text-2xl sm:text-3xl font-medium">{config.workTime}s</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateConfig('workTime', -5)} className="flex-1 bg-[#2a2a2a] py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm font-medium hover:bg-[#3a3a3a] transition-colors">-5</button>
                <button onClick={() => updateConfig('workTime', -1)} className="flex-1 bg-[#2a2a2a] py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm font-medium hover:bg-[#3a3a3a] transition-colors">-1</button>
                <button onClick={() => updateConfig('workTime', 1)} className="flex-1 bg-[#2a2a2a] py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm font-medium hover:bg-[#3a3a3a] transition-colors">+1</button>
                <button onClick={() => updateConfig('workTime', 5)} className="flex-1 bg-[#2a2a2a] py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm font-medium hover:bg-[#3a3a3a] transition-colors">+5</button>
              </div>
            </div>

            {/* Rest Time Config */}
            <div className="bg-[#1e1e1e] rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-green-500 font-bold uppercase tracking-widest text-xs sm:text-sm">Descanso</span>
                <span className="text-2xl sm:text-3xl font-medium">{config.restTime}s</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateConfig('restTime', -5)} className="flex-1 bg-[#2a2a2a] py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm font-medium hover:bg-[#3a3a3a] transition-colors">-5</button>
                <button onClick={() => updateConfig('restTime', -1)} className="flex-1 bg-[#2a2a2a] py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm font-medium hover:bg-[#3a3a3a] transition-colors">-1</button>
                <button onClick={() => updateConfig('restTime', 1)} className="flex-1 bg-[#2a2a2a] py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm font-medium hover:bg-[#3a3a3a] transition-colors">+1</button>
                <button onClick={() => updateConfig('restTime', 5)} className="flex-1 bg-[#2a2a2a] py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm font-medium hover:bg-[#3a3a3a] transition-colors">+5</button>
              </div>
            </div>

            {/* Cycles & Increment Config */}
            <div className="flex gap-3 sm:gap-4">
              <div className="bg-[#1e1e1e] rounded-2xl p-3 sm:p-4 flex-1 flex flex-col items-center justify-center">
                <span className="text-gray-400 uppercase text-[10px] sm:text-xs font-bold tracking-widest mb-3">Ciclos</span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button onClick={() => updateConfig('cycles', -1)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-lg sm:text-xl hover:bg-[#3a3a3a] transition-colors">-</button>
                  <span className="text-xl sm:text-2xl font-medium w-6 sm:w-8 text-center">{config.cycles}</span>
                  <button onClick={() => updateConfig('cycles', 1)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-lg sm:text-xl hover:bg-[#3a3a3a] transition-colors">+</button>
                </div>
              </div>
              <div className="bg-[#1e1e1e] rounded-2xl p-3 sm:p-4 flex-1 flex flex-col items-center justify-center">
                <span className="text-gray-400 uppercase text-[10px] sm:text-xs font-bold tracking-widest mb-3 text-center">+ Seg/Ciclo</span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button onClick={() => updateConfig('workIncrement', -1)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-lg sm:text-xl hover:bg-[#3a3a3a] transition-colors">-</button>
                  <span className="text-xl sm:text-2xl font-medium w-6 sm:w-8 text-center">+{config.workIncrement}</span>
                  <button onClick={() => updateConfig('workIncrement', 1)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-lg sm:text-xl hover:bg-[#3a3a3a] transition-colors">+</button>
                </div>
              </div>
            </div>

            {/* Flash Toggle */}
            <div className="bg-[#1e1e1e] rounded-2xl p-4 flex items-center justify-between">
              <span className="text-gray-400 uppercase text-xs sm:text-sm font-bold tracking-widest">Flash (Transición)</span>
              <button 
                onClick={() => setConfig(prev => ({ ...prev, useFlash: !prev.useFlash }))}
                className={`w-12 sm:w-14 h-7 sm:h-8 rounded-full transition-colors relative flex-shrink-0 ${config.useFlash ? 'bg-green-500' : 'bg-[#2a2a2a]'}`}
              >
                <div className={`absolute top-1 w-5 sm:w-6 h-5 sm:h-6 bg-white rounded-full transition-all ${config.useFlash ? 'left-[22px] sm:left-7' : 'left-1'}`} />
              </button>
            </div>

            <button
              onClick={startTimer}
              className="w-full bg-green-600 hover:bg-green-500 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl flex items-center justify-center gap-2 transition-all active:scale-95 mt-4"
            >
              <Play fill="currentColor" size={20} /> Empezar
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full space-y-8 sm:space-y-12"
          >
            <div className="text-gray-400 uppercase tracking-widest font-bold text-xs sm:text-sm">
              Ciclo {currentCycle} de {config.cycles}
            </div>

            <div className="flex flex-col items-center space-y-2 sm:space-y-4">
              <h2 className={`text-5xl sm:text-6xl font-bold uppercase tracking-tighter ${phase === 'work' ? 'text-orange-500' : 'text-green-500'}`}>
                {phase === 'work' ? 'Aguante' : 'Descanso'}
              </h2>
              <div 
                className={`font-medium leading-none tracking-tighter ${phase === 'work' ? 'text-orange-500' : 'text-green-500'}`}
                style={{ fontSize: 'min(70vw, 55vh)' }}
              >
                {timeLeft}
              </div>
            </div>

            <div className="flex gap-4 sm:gap-6">
              <button
                onClick={restartCurrentCycle}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#2a2a2a] flex items-center justify-center hover:bg-[#3a3a3a] transition-colors flex-shrink-0"
                title="Reiniciar ciclo actual"
              >
                <RotateCcw size={28} className="sm:w-8 sm:h-8" />
              </button>
              <button
                onClick={togglePause}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#2a2a2a] flex items-center justify-center hover:bg-[#3a3a3a] transition-colors flex-shrink-0"
              >
                {state === 'paused' ? <Play fill="white" size={28} className="sm:w-8 sm:h-8 ml-1" /> : <Pause fill="white" size={28} className="sm:w-8 sm:h-8" />}
              </button>
              <button
                onClick={stopTimer}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-900/30 flex items-center justify-center hover:bg-red-900/50 transition-colors flex-shrink-0"
              >
                <Square fill="#ef4444" className="text-red-500 sm:w-8 sm:h-8" size={28} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
