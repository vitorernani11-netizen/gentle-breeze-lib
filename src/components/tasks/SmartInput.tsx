import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { parseNLP, NLPResult } from '@/utils/nlpParser';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SmartInputProps {
  value: string;
  onChange: (val: string) => void;
  onAddTask?: (task: any) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SmartInput: React.FC<SmartInputProps> = ({ 
  value, 
  onChange, 
  onAddTask,
  placeholder,
  className,
  autoFocus = true
}) => {
  const [nlpData, setNlpData] = useState<NLPResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.trim()) {
      const result = parseNLP(value);
      setNlpData(result);
    } else {
      setNlpData(null);
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  const renderHighlights = () => {
    if (!nlpData || (!nlpData.detectedData.date && !nlpData.detectedData.time)) return null;

    const displayTag = nlpData.detectedData.date 
      ? format(nlpData.detectedData.date, "dd 'de' MMM", { locale: ptBR })
      : nlpData.detectedData.time;

    return (
      <div className="absolute left-0 top-[-20px] flex gap-2 animate-in fade-in slide-in-from-bottom-2 z-20">
        <span className="bg-[#00ff41] text-black text-[10px] font-black px-1.5 py-0.5 uppercase tracking-tighter rounded-sm shadow-[0_0_10px_rgba(0,255,65,0.5)]">
          {displayTag}
        </span>
      </div>
    );
  };

  return (
    <div className="relative w-full">
      {renderHighlights()}
      <div className="relative">
        {/* Overlay for neon effect on detected terms */}
        <div className="absolute inset-0 pointer-events-none flex items-center overflow-hidden whitespace-pre">
          {nlpData && (nlpData.detectedData.date || nlpData.detectedData.time) && (
            <span className="text-transparent font-black uppercase tracking-tighter">
              {/* This is a simplified version of highlighting - 
                  in a real scenario we'd need to match the exact detected parts in the string */}
              {value}
            </span>
          )}
        </div>
        
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0",
            "transition-all duration-300",
            className
          )}
        />
        
        {/* Neon underline effect when data is detected */}
        {nlpData && (nlpData.detectedData.date || nlpData.detectedData.time) && (
          <div className="absolute bottom-[-4px] left-0 right-0 h-[2px] bg-[#00ff41] shadow-[0_0_10px_#00ff41] animate-pulse" />
        )}
      </div>
    </div>
  );
};
