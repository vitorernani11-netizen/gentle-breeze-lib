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
  const [tokens, setTokens] = useState<string[]>([]);
  const [showRaw, setShowRaw] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const result = parseNLP(value);
    setTokens(result.tokens || []);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showRaw && (e.key === ' ' || e.key === 'Enter')) {
      setShowRaw(false);
    }
    if (!showRaw && e.key === 'Backspace' && tokens.length > 0) {
      setShowRaw(true);
    }
  };

  const handleClick = () => {
    if (tokens.length > 0) setShowRaw(true);
  };

  const handleBlur = () => {
    setShowRaw(false);
  };

  // Renderizador Dinâmico: Pinta apenas as palavras reconhecidas, onde elas estiverem
  const renderText = () => {
    if (!value) return <span className="text-zinc-600 font-normal">{placeholder}</span>;
    
    const validTokens = tokens.filter(t => t.trim().length > 0);
    if (validTokens.length === 0) return <span className="text-white">{value}</span>;

    const escapedTokens = validTokens.map(t => t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
    const parts = value.split(regex);
    
    return (
      <>
        {parts.map((part, i) => {
          const isToken = validTokens.some(t => t.toLowerCase() === part.toLowerCase());
          if (isToken) {
            return (
              <span key={i} className="bg-[#00ff41]/20 text-[#00ff41] rounded-sm transition-colors duration-200">
                {part}
              </span>
            );
          }
          return <span key={i} className="text-white">{part}</span>;
        })}
      </>
    );
  };

  return (
    <div className="relative w-full flex items-center">
      {/* Camada Visual Inline */}
      {!showRaw && (
        <div 
          className={cn("absolute inset-0 flex items-center pointer-events-none whitespace-pre", className)}
          style={{ backgroundColor: 'transparent', borderColor: 'transparent' }}
        >
          {renderText()}
        </div>
      )}

      {/* Camada de Digitação Transparente */}
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
          "w-full bg-transparent outline-none focus:outline-none z-10 relative caret-white",
          !showRaw && "selection:bg-white/20 selection:text-transparent",
          showRaw && "text-white",
          className
        )}
        placeholder={showRaw ? placeholder : ""}
      />
    </div>
  );
};