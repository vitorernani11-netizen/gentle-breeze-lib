import React, { useEffect, useState } from 'react';
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

  return (
    <div className="relative w-full flex items-center">
      {/* Camada Visual (Copia o estilo exato do input, mas renderiza o badge) */}
      <div 
        className={cn("absolute inset-0 flex items-center pointer-events-none overflow-hidden", className)}
        style={{ backgroundColor: 'transparent', borderColor: 'transparent' }}
      >
        <span className={cn("truncate flex-shrink-0 mr-2", !data.title && !value ? "text-zinc-600 font-normal" : "text-white")}>
          {data.title || (value ? "" : placeholder)}
        </span>
        {data.badge && (
          <span className="bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/30 text-xs font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 tracking-widest shadow-lg">
            {data.badge}
          </span>
        )}
      </div>

      {/* Camada de Controle (Recebe digitação, mas é forçadamente invisível via CSS Inline) */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ color: 'transparent', caretColor: 'white', textShadow: 'none' }}
        className={cn(
          "w-full bg-transparent outline-none focus:outline-none z-10 relative",
          className
        )}
        placeholder=""
      />
    </div>
  );
};