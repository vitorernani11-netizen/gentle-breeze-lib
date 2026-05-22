import React, { useState, useEffect } from 'react';
import { parseNLP } from '@/utils/nlpParser';
import { cn } from '@/lib/utils';

interface SmartInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SmartInput = ({ value, onChange, placeholder, className }: SmartInputProps) => {
  const [extractedData, setExtractedData] = useState<string | null>(null);

  useEffect(() => {
    // A cada tecla digitada, checamos se existe data/hora no texto
    const result = parseNLP(value);
    
    // Se encontrou algo e o texto resultante é menor que o original, temos uma extração
    if (result.detectedData.date && value.length > result.text.length) {
      setExtractedData(`${result.detectedData.date.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} ${result.detectedData.time || ''}`);
    } else {
      setExtractedData(null);
    }
  }, [value]);

  return (
    <div className="relative flex items-center w-full min-h-[40px] bg-zinc-950/50 rounded-lg border border-zinc-800 px-3 overflow-hidden">
      {/* Input de Texto */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("bg-transparent w-full focus:outline-none text-white", className)}
      />

      {/* Badge Verde Neon (Ghost Text) */}
      {extractedData && (
        <div className="absolute right-2 bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-in slide-in-from-right-2 fade-in">
          {extractedData}
        </div>
      )}
    </div>
  );
};