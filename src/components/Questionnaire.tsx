import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QuestionnaireResult } from '../types';

const WORC_QUESTIONS = [
  { section: 'SECCIÓN A: SÍNTOMAS FÍSICOS', text: '¿Cuánto dolor agudo ha sentido en su hombro?' },
  { section: 'SECCIÓN A: SÍNTOMAS FÍSICOS', text: '¿Cuánto dolor persistente y molesto ha sentido en su hombro?' },
  { section: 'SECCIÓN A: SÍNTOMAS FÍSICOS', text: '¿Cuánta debilidad siente en su hombro?' },
  { section: 'SECCIÓN A: SÍNTOMAS FÍSICOS', text: '¿Cuánta rigidez o falta de rango de movimiento siente en su hombro?' },
  { section: 'SECCIÓN A: SÍNTOMAS FÍSICOS', text: '¿Cuánto le molesta el chasquido, traquido o crujido de su hombro?' },
  { section: 'SECCIÓN A: SÍNTOMAS FÍSICOS', text: '¿Cuánta molestia siente en los músculos del cuello debido a su hombro?' },
  { section: 'SECCIÓN B: DEPORTES Y RECREACIÓN', text: '¿Cuánto se ha visto afectado su estado físico por su hombro?' },
  { section: 'SECCIÓN B: DEPORTES Y RECREACIÓN', text: '¿Qué tan afectada está su habilidad para lanzar un objeto con fuerza o a distancia?' },
  { section: 'SECCIÓN B: DEPORTES Y RECREACIÓN', text: '¿Cuánto temor experimenta si alguien o alguna cosa entra en contacto con su hombro afectado?' },
  { section: 'SECCIÓN B: DEPORTES Y RECREACIÓN', text: '¿Qué tan difícil le resulta realizar flexiones de pecho u otros ejercicios vigorosos con su hombro?' },
  { section: 'SECCIÓN C: TRABAJO', text: '¿Cuánta dificultad experimenta en sus actividades diarias en el hogar o en el jardín?' },
  { section: 'SECCIÓN C: TRABAJO', text: '¿Cuánta dificultad experimenta trabajando por encima de sus hombros?' },
  { section: 'SECCIÓN C: TRABAJO', text: '¿Qué tanto tiene que utilizar su brazo sano para compensar al lesionado?' },
  { section: 'SECCIÓN C: TRABAJO', text: '¿Cuánta dificultad experimenta levantando objetos pesados por debajo o hasta el nivel de su hombro?' },
  { section: 'SECCIÓN D: ESTILO DE VIDA', text: '¿Cuánta dificultad ha presentado para dormir debido a su hombro?' },
  { section: 'SECCIÓN D: ESTILO DE VIDA', text: '¿Cuánta dificultad experimenta arreglando su cabello debido a su hombro?' },
  { section: 'SECCIÓN D: ESTILO DE VIDA', text: '¿Cuánta dificultad experimenta para los "juegos bruscos" con familiares o amigos?' },
  { section: 'SECCIÓN D: ESTILO DE VIDA', text: '¿Qué tanta dificultad tiene para vestirse o desvestirse?' },
  { section: 'SECCIÓN E: EMOCIONES', text: '¿Cuánta frustración siente debido a su hombro?' },
  { section: 'SECCIÓN E: EMOCIONES', text: '¿Cuánto se ha "bajado su ánimo" o se ha sentido deprimido por el problema de su hombro?' },
  { section: 'SECCIÓN E: EMOCIONES', text: '¿Qué tan preocupado o intranquilo se siente respecto al efecto que produce el problema de su hombro en sus quehaceres?' },
];

const PRWE_QUESTIONS = [
  { section: '1. DOLOR', text: 'Cuando tiene la mano en reposo.' },
  { section: '1. DOLOR', text: 'Al realizar una tarea que implica un movimiento repetitivo de muñeca.' },
  { section: '1. DOLOR', text: 'Al levantar un objeto pesado.' },
  { section: '1. DOLOR', text: 'Cuando el dolor está en su peor momento.' },
  { section: '1. DOLOR', text: '¿Qué tan seguido experimenta dolor?' },
  { section: '2. FUNCIÓN - A. Específicas', text: 'Al dar vuelta la manija de la puerta.' },
  { section: '2. FUNCIÓN - A. Específicas', text: 'Al cortar carne con un cuchillo con la mano afectada.' },
  { section: '2. FUNCIÓN - A. Específicas', text: 'Al abrocharse una camisa.' },
  { section: '2. FUNCIÓN - A. Específicas', text: 'Al levantarse de una silla con la mano afectada.' },
  { section: '2. FUNCIÓN - A. Específicas', text: 'Al cargar 5 kg con la mano afectada.' },
  { section: '2. FUNCIÓN - A. Específicas', text: 'Al usar papel higiénico con la mano afectada.' },
  { section: '2. FUNCIÓN - B. Cotidianas', text: 'Actividades de cuidado personal (vestirse, lavarse).' },
  { section: '2. FUNCIÓN - B. Cotidianas', text: 'Tareas del hogar (tareas de limpieza).' },
  { section: '2. FUNCIÓN - B. Cotidianas', text: 'Trabajo (su trabajo habitual).' },
  { section: '2. FUNCIÓN - B. Cotidianas', text: 'Actividades de tiempo libre.' },
];

interface QuestionnaireProps {
  onSave: (result: QuestionnaireResult) => void;
  onBack: () => void;
}

export default function Questionnaire({ onSave, onBack }: QuestionnaireProps) {
  const [selectedQuiz, setSelectedQuiz] = useState<'none' | 'WORC' | 'PRWE'>('none');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [patientName, setPatientName] = useState('');
  const [showResult, setShowResult] = useState(false);

  const activeQuestions = selectedQuiz === 'WORC' ? WORC_QUESTIONS : PRWE_QUESTIONS;

  const startQuiz = (quiz: 'WORC' | 'PRWE') => {
    setSelectedQuiz(quiz);
    setAnswers(Array(quiz === 'WORC' ? WORC_QUESTIONS.length : PRWE_QUESTIONS.length).fill(0));
    setCurrentQuestion(0);
    setShowResult(false);
  };

  const handleNext = () => {
    if (currentQuestion < activeQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = parseInt(e.target.value, 10);
    setAnswers(newAnswers);
  };

  const handleSave = () => {
    if (!patientName.trim()) {
      alert('Por favor, ingresa el nombre del paciente.');
      return;
    }

    let finalScore = 0;

    if (selectedQuiz === 'WORC') {
      const sum = answers.reduce((a, b) => a + (b * 10), 0);
      finalScore = 100 - ((sum / 2100) * 100);
    } else if (selectedQuiz === 'PRWE') {
      const painSum = answers.slice(0, 5).reduce((a, b) => a + b, 0);
      const functionSum = answers.slice(5, 15).reduce((a, b) => a + b, 0);
      finalScore = painSum + (functionSum / 2);
    }

    const result: QuestionnaireResult = {
      id: Date.now().toString(),
      type: 'questionnaire',
      questionnaireName: selectedQuiz as 'WORC' | 'PRWE',
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      patientName,
      score: parseFloat(finalScore.toFixed(2)),
    };

    onSave(result);
  };

  if (selectedQuiz === 'none') {
    return (
      <div className="flex flex-col h-full bg-black text-white p-6 pt-12 pb-8 overflow-y-auto w-full">
        <div className="flex items-center mb-12 flex-shrink-0">
          <button onClick={onBack} className="p-2 bg-[#1e1e1e] rounded-full text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center w-full pr-10">
            <h1 className="text-2xl font-bold">Cuestionarios</h1>
            <p className="text-gray-500 text-sm">Elige una evaluación</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 w-full max-w-sm mx-auto flex-1">
          <button 
            onClick={() => startQuiz('WORC')}
            className="bg-[#1e1e1e] p-8 rounded-3xl border border-[#2a2a2a] hover:bg-[#252525] transition-all text-left group flex flex-col justify-center min-h-[160px] active:scale-95"
          >
            <h2 className="text-3xl font-black text-blue-500 mb-2 group-hover:text-blue-400 tracking-tighter">Índice WORC</h2>
            <p className="text-gray-400 text-sm leading-relaxed">Cuestionario de calidad de vida del manguito rotador. Consta de 21 preguntas divididas en 5 dominios.</p>
          </button>

          <button 
            onClick={() => startQuiz('PRWE')}
            className="bg-[#1e1e1e] p-8 rounded-3xl border border-[#2a2a2a] hover:bg-[#252525] transition-all text-left group flex flex-col justify-center min-h-[160px] active:scale-95"
          >
            <h2 className="text-3xl font-black text-purple-500 mb-2 group-hover:text-purple-400 tracking-tighter">Índice PRWE</h2>
            <p className="text-gray-400 text-sm leading-relaxed">Patient-Rated Wrist Evaluation. Evalúa dolor y función de muñeca en la última semana a través de 15 preguntas.</p>
          </button>
        </div>
      </div>
    );
  }

  if (showResult) {
    let scoreDisplay = 0;
    
    if (selectedQuiz === 'WORC') {
      const sum = answers.reduce((a, b) => a + (b * 10), 0);
      scoreDisplay = parseFloat((100 - ((sum / 2100) * 100)).toFixed(2));
    } else if (selectedQuiz === 'PRWE') {
      const painSum = answers.slice(0, 5).reduce((a, b) => a + b, 0);
      const functionSum = answers.slice(5, 15).reduce((a, b) => a + b, 0);
      scoreDisplay = parseFloat((painSum + (functionSum / 2)).toFixed(2));
    }

    return (
      <div className="flex flex-col h-full bg-black text-white p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setShowResult(false)} className="p-2 bg-[#1e1e1e] rounded-full text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold ml-4">Resultados {selectedQuiz}</h1>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-gray-400 uppercase tracking-widest font-bold">
              {selectedQuiz === 'WORC' ? 'Porcentaje de Funcionalidad' : 'Puntaje de Discapacidad'}
            </h2>
            <div className={`text-7xl font-black ${selectedQuiz === 'WORC' ? 'text-blue-500' : 'text-purple-500'}`}>
              {scoreDisplay}{selectedQuiz === 'WORC' ? '%' : ''}
            </div>
            {selectedQuiz === 'PRWE' && (
              <p className="text-gray-500 text-sm max-w-[200px] leading-tight mx-auto">
                0 equivale a estado óptimo, 100 equivale al peor estado funcional.
              </p>
            )}
          </div>

          <div className="w-full max-w-md space-y-4 bg-[#1e1e1e] p-6 rounded-3xl">
            <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">
              Nombre del Paciente
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full bg-[#2a2a2a] text-white text-lg rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Ingresar nombre"
            />
          </div>

          <button
            onClick={handleSave}
            className={`w-full max-w-md ${selectedQuiz === 'WORC' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-purple-600 hover:bg-purple-500'} text-white py-4 rounded-2xl font-bold text-xl flex items-center justify-center gap-2 transition-all active:scale-95`}
          >
            <Save size={24} /> Guardar Resultado
          </button>
        </div>
      </div>
    );
  }

  const question = activeQuestions[currentQuestion];
  const accentColor = selectedQuiz === 'WORC' ? 'blue-500' : 'purple-500';
  const bgAccentColor = selectedQuiz === 'WORC' ? 'bg-blue-500' : 'bg-purple-500';

  return (
    <div className="flex flex-col h-full bg-black text-white p-4 sm:p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <button onClick={() => setSelectedQuiz('none')} className="p-2 bg-[#1e1e1e] rounded-full text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold">Índice {selectedQuiz}</h1>
          <p className="text-xs text-gray-500 font-medium">Pregunta {currentQuestion + 1} de {activeQuestions.length}</p>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="w-full bg-[#1e1e1e] h-2 rounded-full mb-6 sm:mb-8 overflow-hidden flex-shrink-0">
        <div 
          className={`${bgAccentColor} h-full transition-all duration-300 ease-out`}
          style={{ width: `${((currentQuestion + 1) / activeQuestions.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col justify-center space-y-8 sm:space-y-12 min-h-min py-4"
        >
          <div className="space-y-3 sm:space-y-4 text-center">
            <span className={`text-${accentColor} font-bold uppercase tracking-widest text-xs sm:text-sm`}>{question.section}</span>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight">{question.text}</h2>
            <p className="text-gray-500 text-xs sm:text-sm">
              Escala de 0 ({selectedQuiz === 'WORC' ? 'Ninguno/Nada' : (question.section.includes('DOLOR') ? 'Sin dolor' : 'Sin dificultad')}) 
              a 10 ({selectedQuiz === 'WORC' ? 'Extremo/Mucho' : (question.section.includes('DOLOR') ? 'Máximo dolor' : 'Imposible de realizar')})
            </p>
          </div>

          <div className="space-y-6">
            <div className="text-center text-5xl sm:text-6xl font-black text-white">
              {answers[currentQuestion]}
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={answers[currentQuestion]}
              onChange={handleSliderChange}
              className={`w-full h-4 bg-[#2a2a2a] rounded-lg appearance-none cursor-pointer accent-${selectedQuiz === 'WORC' ? 'blue' : 'purple'}-500`}
            />
            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
              <span>0</span>
              <span>10</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-4 mt-auto pt-6 flex-shrink-0">
        <button
          onClick={handlePrev}
          disabled={currentQuestion === 0}
          className="flex-1 bg-[#1e1e1e] disabled:opacity-50 disabled:cursor-not-allowed py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#252525] transition-colors text-sm sm:text-base"
        >
          <ChevronLeft size={20} /> Anterior
        </button>
        <button
          onClick={handleNext}
          className={`flex-1 ${selectedQuiz === 'WORC' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-purple-600 hover:bg-purple-500'} py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors text-sm sm:text-base`}
        >
          {currentQuestion === activeQuestions.length - 1 ? 'Finalizar' : 'Siguiente'} <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
