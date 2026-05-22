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
    <div className="relative w-full h-12 flex items-center bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Camada Visual (O que você enxerga) */}
      <div className="absolute inset-0 flex items-center px-3 pointer-events-none w-full">
        <span className="text-white font-black uppercase tracking-tighter mr-2 truncate flex-shrink-0">
          {data.title || (value ? "" : placeholder)}
        </span>
        {data.badge && (
          <span className="bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0">
            {data.badge}
          </span>
        )}
      </div>

      {/* Camada de Controle (100% invisível) */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-full bg-transparent border-none outline-none focus:outline-none px-3 font-black uppercase tracking-tighter text-transparent caret-white z-10",
          className
        )}
      />
    </div>
  );
};