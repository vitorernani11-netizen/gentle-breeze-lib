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
  const [extracted, setExtracted] = useState<{title: string, badge: string} | null>(null);

  useEffect(() => {
    const result = parseNLP(value);
    // Se o parser limpou algo, separamos o Título (cinza/branco) do Badge (neon)
    if (result.detectedData.date) {
      setExtracted({
        title: result.text,
        badge: `${result.detectedData.date.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} ${result.detectedData.time || ''}`
      });
    } else {
      setExtracted(null);
    }
  }, [value]);

  return (
    <div className="relative w-full h-12 flex items-center bg-zinc-950 rounded-lg border border-zinc-800 px-3">
      {/* Camada de Destaque (Visível se houver data) */}
      {extracted ? (
        <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
          <span className="text-white font-black uppercase tracking-tighter mr-2">{extracted.title}</span>
          <span className="bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
            {extracted.badge}
          </span>
        </div>
      ) : null}

      {/* Input Transparente para Digitação */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full bg-transparent focus:outline-none text-white z-10",
          extracted ? "text-transparent caret-white" : "text-white",
          className
        )}
      />
    </div>
  );
};