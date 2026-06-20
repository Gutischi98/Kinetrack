import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Save, History as HistoryIcon, ChevronRight, RotateCcw, Crosshair, Settings, X, ChevronLeft, UserCheck, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Measurement, HistoryItem } from '../types';
import imgHombro from '../img/hombro.png';
import imgCodo from '../img/codo.png';
import imgMuneca from '../img/muñeca.png';
import imgPalma from '../img/palma.png';

interface EvolutionProps {
  onSave: (m: Measurement) => void;
  onViewHistory: () => void;
  onBack: () => void;
}

type MeasurementStep = 'form' | 'elbow' | 'shoulder' | 'abduction' | 'pronation' | 'supination' | 'wristFlexion' | 'wristExtension' | 'reach' | 'observations' | 'summary';

export default function Evolution({ onSave, onViewHistory, onBack }: EvolutionProps) {
  const [step, setStep] = useState<MeasurementStep>('form');
  const [angles, setAngles] = useState<Record<string, number | null>>({ elbow: 0, shoulder: 0, abduction: 0, pronation: 0, supination: 0, wristFlexion: 0, wristExtension: 0 });
  
  const [patientName, setPatientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [observations, setObservations] = useState('');
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [painActivity, setPainActivity] = useState(0);
  const [painRest, setPainRest] = useState(0);
  
  const [reachCephalic, setReachCephalic] = useState('');
  const [reachCaudal, setReachCaudal] = useState('');
  const [customCephalic, setCustomCephalic] = useState('');
  const [customCaudal, setCustomCaudal] = useState('');
  
  const [nextSession, setNextSession] = useState('');
  const [nextSessionTime, setNextSessionTime] = useState('');
  const [isDischarged, setIsDischarged] = useState(false);

  const [isCalibrated, setIsCalibrated] = useState(false);
  const [attempts, setAttempts] = useState<Record<string, number[]>>({});
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3000);
  const [showAttemptsHistory, setShowAttemptsHistory] = useState(false);
  const timerRef = useRef<number | null>(null);
  const maxAngleRef = useRef(0);
  const isMeasuringRef = useRef(false);
  
  const stepRef = useRef<MeasurementStep>('form');
  const isCalibratedRef = useRef(false);
  const isManualOverrideRef = useRef(false);
  const zeroVectorRef = useRef<number[]>([0, 0, 0]);
  const rawVectorRef = useRef<number[]>([0, 0, 0]);
  const smoothedVector = useRef<number[]>([0, 0, 0]);

  const lastAtanAngleRef = useRef<number>(0);
  const accumAngleRef = useRef<number>(0);
  const rotAxisRef = useRef<number[] | null>(null);

  const [activeAxes, setActiveAxes] = useState({ x: true, y: true, z: false });
  const [showSettings, setShowSettings] = useState(false);
  const activeAxesRef = useRef({ x: true, y: true, z: false });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDiagnosisSuggestions, setShowDiagnosisSuggestions] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('kinetrack_history');
    if (saved) {
      setHistoryItems(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (step === 'abduction' || step === 'wristFlexion' || step === 'wristExtension') {
      setActiveAxes({ x: false, y: true, z: true });
      activeAxesRef.current = { x: false, y: true, z: true };
    } else if (step === 'pronation' || step === 'supination') {
      setActiveAxes({ x: true, y: false, z: true });
      activeAxesRef.current = { x: true, y: false, z: true };
    } else {
      setActiveAxes({ x: true, y: true, z: false });
      activeAxesRef.current = { x: true, y: true, z: false };
    }
  }, [step]);

  const uniquePatients = useMemo(() => {
    const patients = new Map<string, HistoryItem>();
    const sorted = [...historyItems].sort((a,b) => Number(b.id) - Number(a.id));
    sorted.forEach(item => {
      if (item.patientName && !patients.has(item.patientName.toLowerCase())) {
        patients.set(item.patientName.toLowerCase(), item);
      }
    });
    return Array.from(patients.values());
  }, [historyItems]);

  const scheduleConflict = useMemo(() => {
    if (!nextSession || !nextSessionTime || isDischarged) return null;
    return historyItems.find(item => 
      item.type !== 'questionnaire' && 
      (item as Measurement).nextSession === nextSession && 
      (item as Measurement).nextSessionTime === nextSessionTime &&
      !(item as Measurement).isDischarged
    );
  }, [historyItems, nextSession, nextSessionTime, isDischarged]);

  const filteredPatients = useMemo(() => {
    if (!patientName.trim()) return [];
    const term = patientName.toLowerCase();
    return uniquePatients.filter(p => p.patientName.toLowerCase().includes(term));
  }, [patientName, uniquePatients]);

  const uniqueDiagnoses = useMemo(() => {
    const diagnoses = new Set<string>();
    const sorted = [...historyItems].sort((a,b) => Number(b.id) - Number(a.id));
    const result: string[] = [];
    sorted.forEach(item => {
      if (item.type !== 'questionnaire' && (item as Measurement).diagnosis) {
        const diag = (item as Measurement).diagnosis;
        if (diag && !diagnoses.has(diag.toLowerCase())) {
          diagnoses.add(diag.toLowerCase());
          result.push(diag);
        }
      }
    });
    return result;
  }, [historyItems]);

  const filteredDiagnoses = useMemo(() => {
    if (!diagnosis.trim()) return [];
    const term = diagnosis.toLowerCase();
    return uniqueDiagnoses.filter(d => d.toLowerCase().includes(term));
  }, [diagnosis, uniqueDiagnoses]);

  const playClick = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn('Audio not supported', e);
    }
  };

  useEffect(() => {
    activeAxesRef.current = activeAxes;
  }, [activeAxes]);

  const startMeasurements = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          window.addEventListener('devicemotion', handleMotion);
        }
      } catch (e) {
        console.error('Permission denied', e);
      }
    } else {
      window.addEventListener('devicemotion', handleMotion);
    }
    setStep('shoulder');
    stepRef.current = 'shoulder';
  };

  const handleMotion = (event: DeviceMotionEvent) => {
    if (isManualOverrideRef.current) return;
    if (!event.accelerationIncludingGravity) return;
    const { x, y, z } = event.accelerationIncludingGravity;
    
    if (x === null || y === null || z === null) return;

    const alpha = 0.15;
    smoothedVector.current[0] = alpha * x + (1 - alpha) * smoothedVector.current[0];
    smoothedVector.current[1] = alpha * y + (1 - alpha) * smoothedVector.current[1];
    smoothedVector.current[2] = alpha * z + (1 - alpha) * smoothedVector.current[2];

    const [sx, sy, sz] = smoothedVector.current;

    const vx = activeAxesRef.current.x ? sx : 0;
    const vy = activeAxesRef.current.y ? sy : 0;
    const vz = activeAxesRef.current.z ? sz : 0;

    const mag = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (mag === 0) return;

    const norm = [vx / mag, vy / mag, vz / mag];
    rawVectorRef.current = norm;

    if (isCalibratedRef.current) {
      const v0 = zeroVectorRef.current;
      const vt = norm;

      const dot = v0[0] * vt[0] + v0[1] * vt[1] + v0[2] * vt[2];
      const clamped = Math.max(-1, Math.min(1, dot));
      const rawDeg = Math.acos(clamped) * (180 / Math.PI);

      let deg = 0;

      if (!rotAxisRef.current) {
        deg = rawDeg;
        accumAngleRef.current = rawDeg;
        if (rawDeg > 15) {
          const cross = [
            v0[1] * vt[2] - v0[2] * vt[1],
            v0[2] * vt[0] - v0[0] * vt[2],
            v0[0] * vt[1] - v0[1] * vt[0]
          ];
          const mag = Math.sqrt(cross[0]*cross[0] + cross[1]*cross[1] + cross[2]*cross[2]);
          if (mag > 0.001) {
            rotAxisRef.current = [cross[0]/mag, cross[1]/mag, cross[2]/mag];
            const A = rotAxisRef.current;
            const yVec = [
              A[1]*v0[2] - A[2]*v0[1],
              A[2]*v0[0] - A[0]*v0[2],
              A[0]*v0[1] - A[1]*v0[0]
            ];
            const y = vt[0]*yVec[0] + vt[1]*yVec[1] + vt[2]*yVec[2];
            const x = vt[0]*v0[0] + vt[1]*v0[1] + vt[2]*v0[2];
            lastAtanAngleRef.current = Math.atan2(y, x);
          }
        }
      } else {
        const A = rotAxisRef.current;
        const yVec = [
          A[1]*v0[2] - A[2]*v0[1],
          A[2]*v0[0] - A[0]*v0[2],
          A[0]*v0[1] - A[1]*v0[0]
        ];
        const y = vt[0]*yVec[0] + vt[1]*yVec[1] + vt[2]*yVec[2];
        const x = vt[0]*v0[0] + vt[1]*v0[1] + vt[2]*v0[2];
        const currentAtan = Math.atan2(y, x);
        
        let delta = currentAtan - lastAtanAngleRef.current;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        else if (delta < -Math.PI) delta += 2 * Math.PI;
        
        accumAngleRef.current += delta * (180 / Math.PI);
        lastAtanAngleRef.current = currentAtan;
        
        deg = accumAngleRef.current;
      }

      const finalDeg = Math.round(Math.abs(deg) / 2) * 2;
      
      if (isMeasuringRef.current) {
        if (finalDeg > maxAngleRef.current) {
          maxAngleRef.current = finalDeg;
          setAngles(prev => {
            if (prev[stepRef.current] !== finalDeg) playClick();
            return { ...prev, [stepRef.current]: finalDeg };
          });
        }
      }
      // Se eliminó el bloque else if para evitar sobreescribir el ángulo con la posición de reposo.
    }
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, []);

  const getGroupName = (s: string) => {
    if (['shoulder', 'abduction'].includes(s)) return 'Hombro';
    if (['elbow'].includes(s)) return 'Codo';
    if (['wristFlexion', 'wristExtension'].includes(s)) return 'Muñeca';
    if (['pronation', 'supination'].includes(s)) return 'Mano';
    return '';
  };

  const skipGroup = () => {
    const group = getGroupName(step);
    setAngles(prev => {
      const next = { ...prev };
      if (group === 'Hombro') {
        if (step === 'shoulder') { next.shoulder = null; next.abduction = null; }
        if (step === 'abduction') { next.abduction = null; }
      }
      if (group === 'Codo') { next.elbow = null; }
      if (group === 'Muñeca') {
        if (step === 'wristFlexion') { next.wristFlexion = null; next.wristExtension = null; }
        if (step === 'wristExtension') { next.wristExtension = null; }
      }
      if (group === 'Mano') {
        if (step === 'pronation') { next.pronation = null; next.supination = null; }
        if (step === 'supination') { next.supination = null; }
      }
      return next;
    });
    setShowSkipConfirm(false);
    
    if (group === 'Hombro') jumpToStep('elbow');
    else if (group === 'Codo') jumpToStep('wristFlexion');
    else if (group === 'Muñeca') jumpToStep('pronation');
    else if (group === 'Mano') jumpToStep('reach');
  };

  const jumpToStep = (newStep: MeasurementStep) => {
    setStep(newStep);
    stepRef.current = newStep;
    setIsCalibrated(false);
    isCalibratedRef.current = false;
    isMeasuringRef.current = false;
    setIsMeasuring(false);
    if (timerRef.current) clearInterval(timerRef.current as any);
    if (newStep === 'reach') {
      window.removeEventListener('devicemotion', handleMotion);
    }
  };

  const startMeasurementTimer = () => {
    zeroVectorRef.current = [...rawVectorRef.current];
    isCalibratedRef.current = true;
    setIsCalibrated(true);
    rotAxisRef.current = null;
    lastAtanAngleRef.current = 0;
    accumAngleRef.current = 0;
    isManualOverrideRef.current = false;
    
    isMeasuringRef.current = true;
    setIsMeasuring(true);
    setTimeLeft(3000);
    maxAngleRef.current = 0;
    setAngles(prev => ({ ...prev, [stepRef.current]: 0 }));
    playClick();

    const startTime = Date.now();
    
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 3000 - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        isMeasuringRef.current = false;
        setIsMeasuring(false);
        // NO desactivamos la calibración para que la aguja se quede congelada en el ángulo máximo
        
        setAttempts(prev => {
          const currentAttempts = prev[stepRef.current] || [];
          return {
            ...prev,
            [stepRef.current]: [...currentAttempts, maxAngleRef.current]
          };
        });
        
        playClick();
        setTimeout(playClick, 150);
      }
    }, 50);
  };

  const nextStep = () => {
    if (step === 'shoulder') jumpToStep('abduction');
    else if (step === 'abduction') jumpToStep('elbow');
    else if (step === 'elbow') jumpToStep('wristFlexion');
    else if (step === 'wristFlexion') jumpToStep('wristExtension');
    else if (step === 'wristExtension') jumpToStep('pronation');
    else if (step === 'pronation') jumpToStep('supination');
    else if (step === 'supination') jumpToStep('reach');
    else if (step === 'reach') jumpToStep('observations');
    else if (step === 'observations') jumpToStep('summary');
  };

  const handleSave = () => {
    const newMeasurement: Measurement = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      patientName,
      diagnosis,
      observations,
      painActivity,
      painRest,
      elbowFlexion: angles.elbow,
      shoulderFlexion: angles.shoulder,
      abduction: angles.abduction,
      pronation: angles.pronation,
      supination: angles.supination,
      wristFlexion: angles.wristFlexion,
      wristExtension: angles.wristExtension,
      reachCephalic: reachCephalic === '+' ? customCephalic : reachCephalic,
      reachCaudal: reachCaudal === '+' ? customCaudal : reachCaudal,
      nextSession,
      nextSessionTime,
      isDischarged,
    };
    onSave(newMeasurement);
    
    // Reset state
    setStep('form');
    stepRef.current = 'form';
    setPatientName('');
    setDiagnosis('');
    setObservations('');
    setPainActivity(0);
    setPainRest(0);
    setReachCephalic('');
    setReachCaudal('');
    setCustomCephalic('');
    setCustomCaudal('');
    setNextSession('');
    setNextSessionTime('');
    setIsDischarged(false);
    setAngles({ elbow: 0, shoulder: 0, abduction: 0, pronation: 0, supination: 0, wristFlexion: 0, wristExtension: 0 });
    setIsCalibrated(false);
    isCalibratedRef.current = false;
    rotAxisRef.current = null;
    lastAtanAngleRef.current = 0;
    accumAngleRef.current = 0;
    isManualOverrideRef.current = false;
  };

  const stepInfo: Record<string, {title: string, desc: string}> = {
    elbow: { title: 'Flexión de Codo', desc: 'Posiciona el celular como indica la imagen, calibra a 0° y realiza la flexión.' },
    shoulder: { title: 'Flexión de Hombro', desc: 'Pociciona el celular como indica la imagen, calibra a 0° y eleva frontalmente.' },
    abduction: { title: 'Abducción', desc: 'Posiciona el celular como indica la imagen, calibra a 0° y eleva lateralmente.' },
    pronation: { title: 'Pronación', desc: 'Posiciona el celular como indica la imagen, calibra a 0° con la palma hacia el lado y gira hacia abajo.' },
    supination: { title: 'Supinación', desc: 'Posiciona el celular como indica la imagen, calibra a 0° con la palma hacia el lado y gira hacia arriba.' },
    wristFlexion: { title: 'Flexión de Muñeca', desc: 'Posiciona el celular como indica la imagen, calibra a 0° y flexiona hacia abajo.' },
    wristExtension: { title: 'Extensión de Muñeca', desc: 'Posiciona el celular como indica la imagen, calibra a 0° y extiende hacia arriba.' },
    reach: { title: 'Alcance Funcional', desc: 'Selecciona el nivel de alcance del paciente.' },
    observations: { title: 'Observaciones', desc: 'Agrega cualquier anotación extra antes de guardar (Opcional).' },
    summary: { title: 'Resumen', desc: 'Revisa tus mediciones antes de guardar.' },
  };

  const cephalicOptions = ['Por sobre cabeza', 'Frente', 'Oreja', 'Ojos', 'Mandíbula', 'Cuello', 'Nuca', 'No logra', '+'];
  const caudalOptions = ['Línea interglútea', 'Glúteo mayor', 'Zona sacro lumbar', 'Zona lumbar', 'Zona torácica baja', 'Zona torácica media', 'Zona torácica alta', 'No logra', '+'];

  const timeOptions = [];
  for (let h = 8; h <= 16; h++) {
    timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
    if (h !== 16) timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
  }

  const currentAngle = (step === 'summary' || step === 'form' || step === 'reach' || step === 'observations') ? 0 : angles[step];

  return (
    <div className="flex flex-col h-full bg-black text-white p-6">
      <div className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 bg-[#1e1e1e] rounded-full text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">Evolución</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 bg-[#1e1e1e] rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <Settings size={24} />
          </button>
          <button 
            onClick={onViewHistory}
            className="p-2 bg-[#1e1e1e] rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <HistoryIcon size={24} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'form' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col space-y-6 max-w-sm mx-auto w-full overflow-y-auto pb-12"
          >
            <div className="space-y-2 text-center mb-4">
              <h2 className="text-2xl font-bold text-orange-500">Datos del Paciente</h2>
              <p className="text-gray-400 text-sm">Ingresa la información para comenzar la evaluación.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2 relative">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Nombre</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="text" 
                      value={patientName}
                      onChange={(e) => {
                        setPatientName(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Buscar o ingresar nombre..."
                      className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl py-4 pl-12 pr-12 text-white focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    {patientName && (
                      <button
                        onClick={() => {
                          setPatientName('');
                          setShowSuggestions(false);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1 z-10"
                        title="Borrar nombre"
                      >
                        <X size={18} />
                      </button>
                    )}
                    {showSuggestions && filteredPatients.length > 0 && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden z-20 shadow-2xl">
                        {filteredPatients.slice(0, 5).map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setPatientName(p.patientName);
                              if (p.type !== 'questionnaire') {
                                const m = p as Measurement;
                                setPainActivity(m.painActivity || 0);
                                setPainRest(m.painRest || 0);
                                if (m.diagnosis) setDiagnosis(m.diagnosis);
                              }
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-5 py-4 hover:bg-[#2a2a2a] border-b border-[#2a2a2a] last:border-0 transition-colors flex flex-col gap-1"
                          >
                            <span className="font-bold text-white text-base">{p.patientName}</span>
                            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Última vez: {p.date}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Diagnóstico</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={diagnosis}
                      onChange={(e) => {
                        setDiagnosis(e.target.value);
                        setShowDiagnosisSuggestions(true);
                      }}
                      onFocus={() => setShowDiagnosisSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowDiagnosisSuggestions(false), 200)}
                      placeholder="Diagnóstico del paciente..."
                      className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl py-4 pl-4 pr-12 text-white focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    {diagnosis && (
                      <button
                        onClick={() => {
                          setDiagnosis('');
                          setShowDiagnosisSuggestions(false);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1 z-10"
                        title="Borrar diagnóstico"
                      >
                        <X size={18} />
                      </button>
                    )}
                    {showDiagnosisSuggestions && filteredDiagnoses.length > 0 && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden z-20 shadow-2xl">
                        {filteredDiagnoses.slice(0, 5).map((diag, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setDiagnosis(diag);
                              setShowDiagnosisSuggestions(false);
                            }}
                            className="w-full text-left px-5 py-4 hover:bg-[#2a2a2a] border-b border-[#2a2a2a] last:border-0 transition-colors flex flex-col gap-1"
                          >
                            <span className="font-bold text-white text-base">{diag}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex justify-between text-sm font-bold text-gray-400 uppercase tracking-widest">
                  <span>Dolor en Actividad</span>
                  <span className="text-orange-500">{painActivity}/10</span>
                </label>
                <div className="flex justify-between gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={`act-${num}`}
                      onClick={() => setPainActivity(num)}
                      className={`flex-1 py-2 rounded-lg font-bold transition-colors ${painActivity === num ? 'bg-orange-600 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex justify-between text-sm font-bold text-gray-400 uppercase tracking-widest">
                  <span>Dolor en Reposo</span>
                  <span className="text-orange-500">{painRest}/10</span>
                </label>
                <div className="flex justify-between gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={`rest-${num}`}
                      onClick={() => setPainRest(num)}
                      className={`flex-1 py-2 rounded-lg font-bold transition-colors ${painRest === num ? 'bg-orange-600 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-3xl p-6 space-y-4 shrink-0 mt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-400 uppercase tracking-widest text-sm">Planificación</h3>
                <button 
                  onClick={() => {
                    setIsDischarged(!isDischarged);
                    if (!isDischarged) {
                      setNextSession('');
                      setNextSessionTime('');
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isDischarged ? 'bg-green-600/20 text-green-400 border border-green-500/50' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'}`}
                >
                  <UserCheck size={14} />
                  {isDischarged ? 'De Alta' : 'Dar de Alta'}
                </button>
              </div>
              
              {!isDischarged && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">Fecha próxima sesión</label>
                    <input 
                      type="date" 
                      value={nextSession}
                      onChange={(e) => setNextSession(e.target.value)}
                      className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl p-3 text-white focus:outline-none focus:border-orange-500 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">Hora</label>
                    <select 
                      value={nextSessionTime}
                      onChange={(e) => setNextSessionTime(e.target.value)}
                      className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl p-3 text-white focus:outline-none focus:border-orange-500 text-sm"
                    >
                      <option value="">Seleccionar</option>
                      {timeOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {scheduleConflict && (
                    <div className="col-span-2 mt-1 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-red-400 text-xs font-bold leading-tight">
                        ⚠️ Ya hay un paciente asignado a esta fecha y hora ({(scheduleConflict as Measurement).patientName || 'Anónimo'}).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={startMeasurements}
              disabled={!patientName.trim()}
              className="w-full bg-orange-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              Continuar <ChevronRight size={20} />
            </button>
          </motion.div>
        ) : step === 'reach' ? (
          <motion.div
            key="reach"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col space-y-8 max-w-sm mx-auto w-full overflow-y-auto pb-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-orange-500">{stepInfo.reach.title}</h2>
              <p className="text-gray-400 text-sm">{stepInfo.reach.desc}</p>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Hacia cefálico alcanza altura de:</h3>
                <div className="flex flex-wrap gap-2">
                  {cephalicOptions.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setReachCephalic(opt)}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                        reachCephalic === opt 
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                          : 'border-[#2a2a2a] text-gray-300 hover:border-gray-500 bg-[#1e1e1e]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {reachCephalic === '+' && (
                  <input
                    type="text"
                    value={customCephalic}
                    onChange={(e) => setCustomCephalic(e.target.value)}
                    placeholder="Escriba el alcance cefálico..."
                    className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Hacia caudal alcanza altura de:</h3>
                <div className="flex flex-wrap gap-2">
                  {caudalOptions.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setReachCaudal(opt)}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                        reachCaudal === opt 
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                          : 'border-[#2a2a2a] text-gray-300 hover:border-gray-500 bg-[#1e1e1e]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {reachCaudal === '+' && (
                  <input
                    type="text"
                    value={customCaudal}
                    onChange={(e) => setCustomCaudal(e.target.value)}
                    placeholder="Escriba el alcance caudal..."
                    className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                )}
              </div>
            </div>

            <button
              onClick={nextStep}
              disabled={!reachCephalic || !reachCaudal || (reachCephalic === '+' && !customCephalic.trim()) || (reachCaudal === '+' && !customCaudal.trim())}
              className="w-full bg-green-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
            >
              Continuar <ChevronRight size={20} />
            </button>
          </motion.div>
        ) : step === 'observations' ? (
          <motion.div
            key="observations"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-center space-y-6 max-w-sm mx-auto w-full"
          >
            <div className="text-center space-y-2 mb-4">
              <h2 className="text-2xl font-bold text-orange-500">{stepInfo.observations.title}</h2>
              <p className="text-gray-400 text-sm">{stepInfo.observations.desc}</p>
            </div>
            
            <textarea 
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Escribe observaciones o notas adicionales aquí..."
              className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl py-4 px-4 text-white focus:outline-none focus:border-orange-500 transition-colors resize-none h-40"
            />
            
            <button
              onClick={nextStep}
              className="w-full bg-green-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-500 transition-all mt-auto"
            >
              Continuar <ChevronRight size={20} />
            </button>
          </motion.div>
        ) : step !== 'summary' ? (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col items-center justify-center space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-orange-500">{stepInfo[step].title}</h2>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                {stepInfo[step].desc}
              </p>
            </div>

            {/* Goniometer Visualizer */}
            {/* Goniometer OR Calibration Image */}
            <div className="relative w-64 h-64 flex items-center justify-center">
              {!isCalibrated ? (
                <div className="absolute inset-0 rounded-full border-2 border-orange-500/50 bg-[#1a1a1a] flex flex-col items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                  <img 
                    src={
                      step === 'shoulder' || step === 'abduction' ? imgHombro :
                      step === 'elbow' ? imgCodo :
                      step === 'wristFlexion' || step === 'wristExtension' ? imgMuneca :
                      imgPalma
                    }
                    alt="Posición a calibrar"
                    className="w-2/3 h-2/3 object-contain opacity-80"
                  />
                </div>
              ) : (
                <>
                  {/* Outer Ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-[#2a2a2a] bg-[#1a1a1a]">
                    {/* Degree Ticks */}
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div key={i} className="absolute w-full h-full flex items-start justify-center" style={{ transform: `rotate(${i * 10}deg)` }}>
                        <div className={`w-0.5 ${i % 9 === 0 ? 'h-4 bg-gray-500' : 'h-2 bg-[#333]'} mt-1`} />
                      </div>
                    ))}
                  </div>
                  
                  {/* Fixed Base Arm (0 degrees) */}
                  <div className="absolute w-full h-full flex items-end justify-center">
                    <div className="w-1.5 h-1/2 bg-gray-600 origin-top rounded-b-full opacity-50" />
                  </div>

                  {/* Moving Arm */}
                  <div 
                    className="absolute w-full h-full flex items-end justify-center transition-transform duration-75"
                    style={{ transform: `rotate(-${currentAngle}deg)` }}
                  >
                    <div className="w-1.5 h-1/2 bg-orange-500 origin-top rounded-b-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                  </div>

                  {/* Center Pivot */}
                  <div className="absolute w-6 h-6 bg-black rounded-full border-4 border-orange-500 z-10" />

                  {/* Angle Text */}
                  <div className="absolute bottom-8 bg-black/90 px-4 py-2 rounded-xl border border-[#2a2a2a] z-20">
                    <span className="text-3xl font-bold text-orange-500">{currentAngle}°</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-4 w-full max-w-xs relative z-30">
              {!isMeasuring && !(attempts[step]?.length > 0) ? (
                <>
                  <button
                    onClick={startMeasurementTimer}
                    className="bg-orange-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-500 transition-all"
                  >
                    <Crosshair size={20} /> Calibrar a 0° e Iniciar (3s)
                  </button>
                  <button
                    onClick={() => setShowSkipConfirm(true)}
                    className="w-full mt-2 bg-[#1e1e1e] border border-[#333] text-gray-400 py-3 rounded-2xl font-bold hover:bg-[#2a2a2a] hover:text-white transition-all text-sm"
                  >
                    Omitir grupo {getGroupName(step)}
                  </button>
                </>
              ) : isMeasuring ? (
                <div className="flex flex-col items-center justify-center py-4 space-y-2 bg-[#2a2a2a] rounded-2xl border-2 border-orange-500 animate-pulse">
                   <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Midiendo...</span>
                   <span className="text-4xl font-bold text-white">{(timeLeft / 1000).toFixed(1)}s</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <button
                      onClick={startMeasurementTimer}
                      className="flex-1 bg-[#2a2a2a] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#3a3a3a] transition-all"
                      title="Repetir intento"
                    >
                      <RotateCcw size={20} />
                    </button>
                    <button
                      onClick={() => setShowAttemptsHistory(true)}
                      className="flex-1 bg-blue-600/20 text-blue-500 border border-blue-500/30 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600/30 transition-all"
                    >
                      <HistoryIcon size={20} />
                    </button>
                    <button
                      onClick={nextStep}
                      className="flex-[2] bg-green-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-500 transition-all"
                    >
                      Siguiente <ChevronRight size={20} />
                    </button>
                  </div>
                  <button
                    onClick={() => setShowSkipConfirm(true)}
                    className="w-full bg-[#1e1e1e] border border-[#333] text-gray-400 py-3 rounded-2xl font-bold hover:bg-[#2a2a2a] hover:text-white transition-all text-sm"
                  >
                    Omitir grupo {getGroupName(step)}
                  </button>
                </div>
              )}
            </div>

            {/* Manual fallback slider for desktop/testing */}
            <div className="w-full max-w-xs space-y-2 pt-8 opacity-50 hover:opacity-100 transition-opacity">
              <p className="text-xs text-gray-500 text-center uppercase tracking-widest">Ajuste Manual</p>
              <input 
                type="range" 
                min="0" 
                max="360" 
                step="2"
                value={currentAngle}
                onChange={(e) => {
                  isManualOverrideRef.current = true;
                  const val = parseInt(e.target.value);
                  const roundedVal = Math.round(val / 2) * 2;
                  setAngles(prev => {
                    if (prev[step] !== roundedVal) playClick();
                    return { ...prev, [step]: roundedVal };
                  });
                }}
                className="w-full accent-orange-500"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="summary"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col space-y-4 overflow-y-auto pb-8"
          >
            <div className="bg-[#1e1e1e] rounded-3xl p-6 space-y-4 shrink-0">
              {diagnosis && (
                <div className="flex flex-col gap-1 border-b border-[#2a2a2a] pb-3">
                  <span className="text-gray-400 text-sm">Diagnóstico</span>
                  <span className="text-md text-white font-medium">{diagnosis}</span>
                </div>
              )}
              {observations && (
                <div className="flex flex-col gap-1 border-b border-[#2a2a2a] pb-3">
                  <span className="text-gray-400 text-sm">Observaciones</span>
                  <span className="text-md text-white font-medium whitespace-pre-wrap">{observations}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-b border-[#2a2a2a] pb-3">
                <span className="text-gray-400">Flexión de Hombro</span>
                <span className="text-xl font-bold text-orange-500">{angles.shoulder !== null ? `${angles.shoulder}°` : '-'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#2a2a2a] pb-3">
                <span className="text-gray-400">Abducción</span>
                <span className="text-xl font-bold text-orange-500">{angles.abduction !== null ? `${angles.abduction}°` : '-'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#2a2a2a] pb-3">
                <span className="text-gray-400">Flexión de Codo</span>
                <span className="text-xl font-bold text-orange-500">{angles.elbow !== null ? `${angles.elbow}°` : '-'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#2a2a2a] pb-3">
                <span className="text-gray-400">Flex. Muñeca</span>
                <span className="text-xl font-bold text-orange-500">{angles.wristFlexion !== null ? `${angles.wristFlexion}°` : '-'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#2a2a2a] pb-3">
                <span className="text-gray-400">Ext. Muñeca</span>
                <span className="text-xl font-bold text-orange-500">{angles.wristExtension !== null ? `${angles.wristExtension}°` : '-'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#2a2a2a] pb-3">
                <span className="text-gray-400">Pronación</span>
                <span className="text-xl font-bold text-orange-500">{angles.pronation !== null ? `${angles.pronation}°` : '-'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#2a2a2a] pb-3">
                <span className="text-gray-400">Supinación</span>
                <span className="text-xl font-bold text-orange-500">{angles.supination !== null ? `${angles.supination}°` : '-'}</span>
              </div>
              <div className="flex flex-col gap-1 border-b border-[#2a2a2a] pb-3">
                <span className="text-gray-400 text-sm">Alcance Cefálico</span>
                <span className="text-md font-bold text-blue-400">{reachCephalic === '+' ? customCephalic : reachCephalic}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-gray-400 text-sm">Alcance Caudal</span>
                <span className="text-md font-bold text-blue-400">{reachCaudal === '+' ? customCaudal : reachCaudal}</span>
              </div>
            </div>



            <div className="grid grid-cols-2 gap-4 shrink-0 pt-2">
              <button
                onClick={() => {
                  setStep('shoulder');
                  stepRef.current = 'shoulder';
                  setAngles({ elbow: 0, shoulder: 0, abduction: 0, pronation: 0, supination: 0, wristFlexion: 0, wristExtension: 0 });
                  setIsCalibrated(false);
                  isCalibratedRef.current = false;
                  rotAxisRef.current = null;
                  lastAtanAngleRef.current = 0;
                  accumAngleRef.current = 0;
                  isManualOverrideRef.current = false;
                  window.addEventListener('devicemotion', handleMotion);
                }}
                className="bg-[#2a2a2a] py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} /> Repetir
              </button>
              <button
                onClick={handleSave}
                className="bg-green-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                <Save size={20} /> Guardar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e1e1e] rounded-3xl p-6 w-full max-w-sm space-y-6 border border-[#2a2a2a]"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Ejes de Medición</h2>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white p-1">
                  <X size={24} />
                </button>
              </div>
              
              <p className="text-sm text-gray-400">
                Selecciona qué ejes del acelerómetro se tomarán en cuenta para calcular el ángulo.
              </p>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-xl cursor-pointer hover:bg-[#333] transition-colors">
                  <div>
                    <div className="font-bold text-orange-500">Eje X</div>
                    <div className="text-xs text-gray-400">Lateral (Izquierda/Derecha)</div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={activeAxes.x} 
                    onChange={(e) => setActiveAxes(prev => ({ ...prev, x: e.target.checked }))}
                    className="w-5 h-5 accent-orange-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-xl cursor-pointer hover:bg-[#333] transition-colors">
                  <div>
                    <div className="font-bold text-blue-500">Eje Y</div>
                    <div className="text-xs text-gray-400">Vertical (Arriba/Abajo)</div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={activeAxes.y} 
                    onChange={(e) => setActiveAxes(prev => ({ ...prev, y: e.target.checked }))}
                    className="w-5 h-5 accent-orange-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-xl cursor-pointer hover:bg-[#333] transition-colors">
                  <div>
                    <div className="font-bold text-green-500">Eje Z</div>
                    <div className="text-xs text-gray-400">Profundidad (Inclinación frontal)</div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={activeAxes.z} 
                    onChange={(e) => setActiveAxes(prev => ({ ...prev, z: e.target.checked }))}
                    className="w-5 h-5 accent-orange-500 rounded"
                  />
                </label>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-4 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold transition-colors"
              >
                Aceptar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attempts History Modal */}
      <AnimatePresence>
        {showAttemptsHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e1e1e] rounded-3xl p-6 w-full max-w-sm space-y-6 border border-[#2a2a2a] shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Historial de Intentos</h2>
                <button onClick={() => setShowAttemptsHistory(false)} className="text-gray-400 hover:text-white p-1">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-3">
                {attempts[step]?.map((angle, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#2a2a2a] p-4 rounded-xl">
                    <span className="text-gray-400 font-bold">Intento {idx + 1}</span>
                    <span className="text-2xl font-bold text-orange-500">{angle}°</span>
                  </div>
                ))}
                {(!attempts[step] || attempts[step].length === 0) && (
                  <p className="text-gray-500 text-center py-4">No hay intentos registrados aún.</p>
                )}
              </div>
              
              {attempts[step]?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#333] flex justify-between items-center">
                  <span className="text-gray-300 font-bold">Promedio:</span>
                  <span className="text-3xl font-black text-blue-400">
                    {Math.round(attempts[step].reduce((a, b) => a + b, 0) / attempts[step].length)}°
                  </span>
                </div>
              )}
              
              <button
                onClick={() => setShowAttemptsHistory(false)}
                className="w-full mt-4 py-4 rounded-xl bg-orange-600 text-white hover:bg-orange-500 transition-colors font-bold"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip Confirmation Modal */}
      <AnimatePresence>
        {showSkipConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e1e1e] rounded-3xl p-6 w-full max-w-sm space-y-6 border border-[#2a2a2a] shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white text-center">Omitir grupo</h2>
              <p className="text-gray-400 text-center text-sm">
                ¿Estás seguro de omitir este grupo de medidas? No se registrarán datos y pasaremos al siguiente grupo.
              </p>
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setShowSkipConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-[#2a2a2a] text-white hover:bg-[#333] transition-colors font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={skipGroup}
                  className="flex-1 py-3 rounded-xl bg-orange-600 text-white hover:bg-orange-500 transition-colors font-bold"
                >
                  Sí, omitir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
