import React, { useEffect, useState, useRef } from 'react';
import { parseNLP } from '@/utils/nlpParser';
import { cn } from '@/lib/utils';

interface SmartInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SmartInput = ({ value, onChange, placeholder, className }: SmartInputProps) => {
  const [data, setData] = useState({ title: value, badge: '' });
  const [showRaw, setShowRaw] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const result = parseNLP(value);
    if (result.detectedData.date) {
      setData({
        title: result.text,
        badge: `${result.detectedData.date.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} ${result.detectedData.time || ''}`
      });
    } else {
      setData({ title: value, badge: '' });
    }
  }, [value]);

  // Teclado: Volta para o texto puro se for apagar algo, ou forma o chip ao dar espaço
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showRaw && (e.key === ' ' || e.key === 'Enter')) {
      setShowRaw(false);
    }
    if (!showRaw && e.key === 'Backspace' && data.badge) {
      setShowRaw(true);
    }
  };

  // Clique: Se clicar para editar, revela o texto original (Modo Raw)
  const handleClick = () => {
    if (data.badge) {
      setShowRaw(true);
    }
  };

  // Blur: Ao sair do input, volta a mostrar o Chip bonito
  const handleBlur = () => {
    setShowRaw(false);
  };

  return (
    <div className="relative w-full flex items-center">
      {/* Camada Visual (O que você enxerga no Modo Chip) */}
      {!showRaw && (
        <div 
          className={cn("absolute inset-0 flex items-center pointer-events-none overflow-hidden", className)}
          style={{ backgroundColor: 'transparent', borderColor: 'transparent' }}
        >
          <span className={cn("truncate flex-shrink-0 mr-2", !data.title && !value ? "text-zinc-600 font-normal" : "text-white")}>
            {data.title || (value ? "" : placeholder)}
          </span>
          {data.badge && (
            <span className="bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 tracking-widest shadow-lg">
              {data.badge}
            </span>
          )}
        </div>
      )}

      {/* Camada de Controle (Onde você digita) */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        // Se ShowRaw for true, remove a invisibilidade do texto
        style={showRaw ? {} : { color: 'transparent', textShadow: 'none' }}
        className={cn(
          "w-full bg-transparent outline-none focus:outline-none z-10 relative caret-white",
          // Previne o borrão de seleção de texto quando no modo Chip
          !showRaw && "selection:bg-white/20 selection:text-transparent",
          showRaw && "text-white",
          className
        )}
        placeholder={showRaw ? placeholder : ""}
      />
    </div>
  );
};