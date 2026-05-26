import React, { useEffect, useState, useRef } from 'react';
import { parseNLP, NLPResult } from '@/utils/nlpParser';
import { cn } from '@/lib/utils';

interface SmartInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SmartInput = ({ value, onChange, placeholder, className }: SmartInputProps) => {
  const [nlpResult, setNlpResult] = useState<NLPResult | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const result = parseNLP(value);
    setNlpResult(result);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showRaw && (e.key === ' ' || e.key === 'Enter')) {
      setShowRaw(false);
    }
    if (!showRaw && e.key === 'Backspace' && nlpResult?.tokens.length) {
      setShowRaw(true);
    }
  };

  const handleClick = () => {
    if (nlpResult?.tokens.length) {
      setShowRaw(true);
    }
  };

  const handleBlur = () => {
    setShowRaw(false);
  };

  const renderVisualLayer = () => {
    if (!value) {
      return <span className="text-zinc-600 font-normal">{placeholder}</span>;
    }

    if (!nlpResult || nlpResult.tokens.length === 0) {
      return <span className="text-white">{value}</span>;
    }

    // Ordenar tokens por tamanho (maiores primeiro) para evitar que partes de tokens menores sejam capturadas antes
    const sortedTokens = [...nlpResult.tokens].sort((a, b) => b.length - a.length);
    // Escapar tokens para uso em Regex e criar padrão de captura
    const pattern = sortedTokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    
    const parts = value.split(regex);
    
    return (
      <div className="flex items-center flex-wrap">
        {parts.map((part, i) => {
          const isToken = nlpResult.tokens.some(t => t.toLowerCase() === part.toLowerCase());
          if (isToken) {
            return (
              <span 
                key={i} 
                className="bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/30 text-[11px] font-bold uppercase px-1.5 py-0.5 rounded mx-0.5 tracking-tight"
              >
                {part}
              </span>
            );
          }
          return <span key={i} className="text-white whitespace-pre">{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="relative w-full flex items-center min-h-[40px] px-3">
      {/* Camada Visual (Inline Highlights) */}
      {!showRaw && (
        <div 
          className={cn("absolute inset-0 flex items-center pointer-events-none overflow-hidden px-3", className)}
          style={{ backgroundColor: 'transparent', borderColor: 'transparent' }}
        >
          {renderVisualLayer()}
        </div>
      )}

      {/* Camada de Controle */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        style={showRaw ? {} : { color: 'transparent', textShadow: 'none' }}
        className={cn(
          "w-full h-full bg-transparent outline-none focus:outline-none z-10 relative caret-white font-medium",
          !showRaw && "selection:bg-white/20 selection:text-transparent",
          showRaw && "text-white",
          className
        )}
        placeholder={showRaw ? placeholder : ""}
      />
    </div>
  );
};