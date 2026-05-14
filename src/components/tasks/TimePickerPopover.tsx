import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePickerPopoverProps {
  selectedTime: string | null;
  onSelect: (time: string | null) => void;
  children: React.ReactNode;
}

export const TimePickerPopover: React.FC<TimePickerPopoverProps> = ({ 
  selectedTime, 
  onSelect, 
  children 
}) => {
  const times = ['09:00', '12:00', '15:00', '18:00', '21:00'];

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 bg-black border-2 border-zinc-800 p-2 z-[150] shadow-[0_10px_40px_rgba(0,0,0,0.9)]"
        align="start"
      >
        <div className="grid grid-cols-1 gap-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 px-2">
            Horário de Execução
          </div>
          {times.map((time) => (
            <Button
              key={time}
              variant="ghost"
              className={cn(
                "w-full justify-start font-black text-sm h-10 rounded-none border-b border-transparent hover:border-white hover:bg-zinc-900 transition-all",
                selectedTime === time ? "text-[#00ff41] bg-zinc-900" : "text-white"
              )}
              onClick={() => onSelect(time)}
            >
              {time}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="w-full justify-start font-black text-sm h-10 rounded-none border-t border-zinc-900 mt-1 text-[#ff0000] hover:text-white hover:bg-red-950 transition-all"
            onClick={() => onSelect(null)}
          >
            LIMPAR
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
