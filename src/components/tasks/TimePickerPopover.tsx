import React, { useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TimePickerPopoverProps {
  selectedTime: string | null;
  onSelect: (time: string | null) => void;
  children: React.ReactNode;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export const TimePickerPopover: React.FC<TimePickerPopoverProps> = ({
  selectedTime,
  onSelect,
  children,
}) => {
  const [h, m] = (selectedTime || ':').split(':');
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      const hEl = hourRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
      const mEl = minRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
      hEl?.scrollIntoView({ block: 'center' });
      mEl?.scrollIntoView({ block: 'center' });
    }, 50);
  }, [selectedTime]);

  const update = (newH: string, newM: string) => {
    onSelect(`${newH}:${newM}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-64 bg-zinc-950 border-2 border-zinc-800 p-3 z-[150] shadow-[0_10px_40px_rgba(0,0,0,0.9)]"
        align="start"
      >
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 px-1">
          Selecionar Horário
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <div className="text-[9px] font-bold uppercase text-zinc-600 mb-1 text-center">Hora</div>
            <div
              ref={hourRef}
              className="h-48 overflow-y-auto rounded-lg border border-zinc-900 bg-black scrollbar-thin"
            >
              {HOURS.map((hh) => (
                <button
                  key={hh}
                  type="button"
                  data-active={h === hh}
                  onClick={() => update(hh, m || '00')}
                  className={cn(
                    'w-full py-2 text-sm font-black transition-colors',
                    h === hh ? 'bg-[#00ff41] text-black' : 'text-white hover:bg-zinc-900',
                  )}
                >
                  {hh}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-[9px] font-bold uppercase text-zinc-600 mb-1 text-center">Min</div>
            <div
              ref={minRef}
              className="h-48 overflow-y-auto rounded-lg border border-zinc-900 bg-black scrollbar-thin"
            >
              {MINUTES.map((mm) => (
                <button
                  key={mm}
                  type="button"
                  data-active={m === mm}
                  onClick={() => update(h || '09', mm)}
                  className={cn(
                    'w-full py-2 text-sm font-black transition-colors',
                    m === mm ? 'bg-[#00ff41] text-black' : 'text-white hover:bg-zinc-900',
                  )}
                >
                  {mm}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="mt-3 w-full py-2 text-xs font-black uppercase text-red-500 hover:bg-red-950/40 rounded-lg transition-colors"
        >
          Limpar
        </button>
      </PopoverContent>
    </Popover>
  );
};
