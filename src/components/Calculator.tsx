import React, { useState, useEffect } from 'react';
import { create, all } from 'mathjs';
import { Delete, Eraser, RotateCcw, Calculator as CalcIcon, Gamepad2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const math = create(all);

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CalculatorProps {
  onSecretTriggered: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ onSecretTriggered }) => {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [lastInput, setLastInput] = useState('');

  const handleNumber = (num: string) => {
    if (display === '0' || display === 'Error') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
    setLastInput(prev => (prev + num).slice(-4));
  };

  const handleOperator = (op: string) => {
    setExpression(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      const result = math.evaluate(expression + display);
      const formattedResult = Number.isInteger(result) ? result.toString() : result.toFixed(8).replace(/\.?0+$/, '');
      setHistory(prev => [expression + display + ' = ' + formattedResult, ...prev].slice(0, 5));
      setDisplay(formattedResult);
      setExpression('');
    } catch (error) {
      setDisplay('Error');
    }
  };

  const clear = () => {
    if (lastInput === '6326') {
      onSecretTriggered();
      return;
    }
    setDisplay('0');
    setExpression('');
    setLastInput('');
  };

  const backspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const scientific = (func: string) => {
    try {
      const val = parseFloat(display);
      let result;
      switch (func) {
        case 'sin': result = math.sin(val); break;
        case 'cos': result = math.cos(val); break;
        case 'tan': result = math.tan(val); break;
        case 'sqrt': result = math.sqrt(val); break;
        case 'log': result = math.log10(val); break;
        case 'ln': result = math.log(val); break;
        case 'exp': result = math.exp(val); break;
        case 'pow': setExpression(display + ' ^ '); setDisplay('0'); return;
        default: return;
      }
      setDisplay(result.toFixed(8).replace(/\.?0+$/, ''));
    } catch (e) {
      setDisplay('Error');
    }
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto bg-[#1a1a1a] text-white shadow-2xl rounded-3xl overflow-hidden border border-white/10">
      {/* Display Area */}
      <div className="p-8 flex flex-col justify-end items-end h-48 bg-gradient-to-b from-[#222] to-[#1a1a1a]">
        <div className="text-white/40 text-sm font-mono mb-2 h-6 overflow-hidden text-right w-full">
          {expression}
        </div>
        <div className="text-5xl font-light tracking-tighter overflow-hidden text-right w-full">
          {display}
        </div>
      </div>

      {/* History Preview */}
      <div className="px-6 py-2 bg-black/20 border-y border-white/5 h-12 flex items-center overflow-x-auto whitespace-nowrap scrollbar-hide">
        {history.length > 0 ? (
          history.map((h, i) => (
            <span key={i} className="text-xs text-white/30 mr-4 font-mono">{h}</span>
          ))
        ) : (
          <span className="text-xs text-white/20 font-mono italic">Scientific Precision v2.5</span>
        )}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-1 p-4 bg-[#1a1a1a]">
        {/* Row 1: Scientific */}
        <CalcButton onClick={() => scientific('sin')} className="bg-white/5 text-xs">sin</CalcButton>
        <CalcButton onClick={() => scientific('cos')} className="bg-white/5 text-xs">cos</CalcButton>
        <CalcButton onClick={() => scientific('tan')} className="bg-white/5 text-xs">tan</CalcButton>
        <CalcButton onClick={() => scientific('sqrt')} className="bg-white/5 text-xs">√</CalcButton>

        {/* Row 2: Scientific 2 */}
        <CalcButton onClick={() => scientific('log')} className="bg-white/5 text-xs">log</CalcButton>
        <CalcButton onClick={() => scientific('ln')} className="bg-white/5 text-xs">ln</CalcButton>
        <CalcButton onClick={() => scientific('pow')} className="bg-white/5 text-xs">xʸ</CalcButton>
        <CalcButton onClick={clear} className="bg-red-500/20 text-red-400 hover:bg-red-500/30">AC</CalcButton>

        {/* Row 3 */}
        <CalcButton onClick={() => handleNumber('7')}>7</CalcButton>
        <CalcButton onClick={() => handleNumber('8')}>8</CalcButton>
        <CalcButton onClick={() => handleNumber('9')}>9</CalcButton>
        <CalcButton onClick={() => handleOperator('/')} className="bg-white/10 text-emerald-400">÷</CalcButton>

        {/* Row 4 */}
        <CalcButton onClick={() => handleNumber('4')}>4</CalcButton>
        <CalcButton onClick={() => handleNumber('5')}>5</CalcButton>
        <CalcButton onClick={() => handleNumber('6')}>6</CalcButton>
        <CalcButton onClick={() => handleOperator('*')} className="bg-white/10 text-emerald-400">×</CalcButton>

        {/* Row 5 */}
        <CalcButton onClick={() => handleNumber('1')}>1</CalcButton>
        <CalcButton onClick={() => handleNumber('2')}>2</CalcButton>
        <CalcButton onClick={() => handleNumber('3')}>3</CalcButton>
        <CalcButton onClick={() => handleOperator('-')} className="bg-white/10 text-emerald-400">−</CalcButton>

        {/* Row 6 */}
        <CalcButton onClick={() => handleNumber('0')}>0</CalcButton>
        <CalcButton onClick={() => handleNumber('.')}>.</CalcButton>
        <CalcButton onClick={backspace} className="bg-white/5"><Delete size={18} /></CalcButton>
        <CalcButton onClick={() => handleOperator('+')} className="bg-white/10 text-emerald-400">+</CalcButton>

        {/* Row 7: Equal */}
        <CalcButton onClick={calculate} className="col-span-4 bg-emerald-500 text-black font-bold mt-2 hover:bg-emerald-400 active:scale-[0.98] transition-all">
          =
        </CalcButton>
      </div>
    </div>
  );
};

const CalcButton: React.FC<{ 
  children: React.ReactNode; 
  onClick: () => void; 
  className?: string;
  colSpan?: number;
}> = ({ children, onClick, className }) => (
  <button
    onClick={onClick}
    className={cn(
      "h-14 flex items-center justify-center rounded-xl text-lg font-medium transition-colors active:bg-white/20",
      "hover:bg-white/10",
      className
    )}
  >
    {children}
  </button>
);
