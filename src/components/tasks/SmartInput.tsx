
import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Bell, 
  ChevronDown, 
  Clock, 
  Hash,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { parseNLP, NLPResult } from '@/utils/nlpParser';
import { format, addHours, startOfToday, addDays, startOfWeek, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface SmartInputProps {
  onAddTask: (task: {
    titulo: string;
    vencimento: string;
    recorrencia: string;
    recorrencia_semanal: string | null;
    prioridade: number;
    lembrete: string | null;
  }) => void;
}

export const SmartInput: React.FC<SmartInputProps> = ({ onAddTask }) => {
  const [inputValue, setInputValue] = useState('');
  const [nlpData, setNlpData] = useState<NLPResult | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [recorrencia, setRecorrencia] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [priority, setPriority] = useState(4);
  const [reminder, setReminder] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputValue.trim()) {
      const result = parseNLP(inputValue);
      setNlpData(result);
    } else {
      setNlpData(null);
    }
  }, [inputValue]);

  const handleAdd = () => {
    if (!inputValue.trim()) return;

    const result = nlpData || parseNLP(inputValue);
    
    const finalDueDate = selectedDate || result.dueDate || new Date();
    
    onAddTask({
      titulo: result.text,
      vencimento: format(finalDueDate, 'yyyy-MM-dd'),
      recorrencia: recorrencia !== 'none' ? recorrencia : result.recurrence,
      prioridade: priority,
      lembrete: reminder || result.reminderTime
    });

    // Reset
    setInputValue('');
    setSelectedDate(undefined);
    setRecorrencia('none');
    setPriority(4);
    setReminder(null);
  };

  const renderHighlights = () => {
    if (!nlpData || nlpData.detectedPatterns.length === 0) return null;

    return (
      <div className="absolute left-3 top-[-24px] flex gap-2 animate-in fade-in slide-in-from-bottom-2">
        {nlpData.detectedPatterns.map((pattern, idx) => (
          <span key={idx} className="bg-[#ff00ff] text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-tighter border border-white">
            {pattern}
          </span>
        ))}
      </div>
    );
  };

  const DatePickerContent = () => (
    <div className="p-3 bg-zinc-950 border border-zinc-800 font-sans space-y-3 rounded-xl shadow-2xl">
      <div className="grid grid-cols-2 gap-2">
        <Button 
          variant="outline" 
          className="justify-center rounded-lg border-zinc-800 hover:bg-zinc-900 hover:text-white font-bold uppercase text-[10px] h-9"
          onClick={() => setSelectedDate(startOfToday())}
        >
          Hoje
        </Button>
        <Button 
          variant="outline" 
          className="justify-center rounded-lg border-zinc-800 hover:bg-zinc-900 hover:text-white font-bold uppercase text-[10px] h-9"
          onClick={() => setSelectedDate(addDays(startOfToday(), 1))}
        >
          Amanhã
        </Button>
      </div>
      
      <div className="border-t border-zinc-900 pt-3">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-lg border-none"
          locale={ptBR}
        />
      </div>

      <div className="border-t border-zinc-900 pt-3 space-y-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">Recorrência</span>
        <div className="flex flex-wrap gap-1.5">
          {(['none', 'daily', 'weekly', 'monthly'] as const).map((r) => (
            <Button
              key={r}
              variant="outline"
              size="sm"
              className={cn(
                "rounded-md border-zinc-800 uppercase font-bold text-[9px] h-7 px-2",
                recorrencia === r ? "bg-zinc-100 text-black border-white" : "text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              )}
              onClick={() => setRecorrencia(r)}
            >
              {r === 'none' ? 'Não' : r === 'daily' ? 'Dia' : r === 'weekly' ? 'Sem' : 'Mês'}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative group w-full max-w-xl mx-auto mb-6">
      {renderHighlights()}
      
      <div className="bg-zinc-950 border border-zinc-800 p-1.5 flex flex-col gap-1.5 relative z-10 rounded-xl">
        <div className="flex items-center gap-1.5">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="O que precisa ser feito?"
            className="bg-transparent border-none text-base font-medium tracking-tight focus-visible:ring-0 placeholder:text-zinc-800 h-10"
          />
          <Button 
            onClick={handleAdd}
            className="bg-zinc-100 text-black hover:bg-white rounded-lg w-10 h-10 shrink-0 transition-all active:scale-95"
          >
            <Send size={18} />
          </Button>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-900/50 pt-1.5 px-1.5">
          <div className="flex items-center gap-1 sm:gap-2">
            {isMobile ? (
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900/50 rounded-lg gap-1.5 px-2">
                    <CalendarIcon size={14} />
                    <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider">
                      {selectedDate ? format(selectedDate, 'dd MMM', { locale: ptBR }) : 'Agendar'}
                    </span>
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="bg-black border-t-4 border-white p-0">
                  <DatePickerContent />
                </DrawerContent>
              </Drawer>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900/50 rounded-lg gap-1.5 px-2">
                    <CalendarIcon size={14} />
                    <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider">
                      {selectedDate ? format(selectedDate, 'dd MMM', { locale: ptBR }) : 'Agendar'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-none" align="start">
                  <DatePickerContent />
                </PopoverContent>
              </Popover>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900/50 rounded-lg gap-1.5 px-2">
                  <Bell size={14} />
                  <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider">{reminder || 'Lembrete'}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 bg-zinc-950 border border-zinc-800 p-1.5 font-sans rounded-xl shadow-2xl">
                <div className="flex flex-col gap-0.5">
                  <Button 
                    variant="ghost" 
                    className="h-8 justify-start rounded-lg hover:bg-zinc-900 hover:text-white font-bold uppercase text-[9px]"
                    onClick={() => setReminder(format(addHours(new Date(), 2), 'HH:mm'))}
                  >
                    Em 2 horas
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-8 justify-start rounded-lg hover:bg-zinc-900 hover:text-white font-bold uppercase text-[9px]"
                    onClick={() => setReminder('09:00')}
                  >
                    Manhã (09:00)
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-8 justify-start rounded-lg hover:bg-zinc-900 text-red-500/70 font-bold uppercase text-[9px]"
                    onClick={() => setReminder(null)}
                  >
                    Limpar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className={cn(
                  "h-8 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900/50 rounded-lg gap-1.5 px-2",
                  priority === 1 && "text-red-500",
                  priority === 2 && "text-orange-500",
                  priority === 3 && "text-blue-500"
                )}>
                  <Hash size={14} />
                  <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider">P{priority}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-36 bg-zinc-950 border border-zinc-800 p-1.5 font-sans rounded-xl shadow-2xl">
                <div className="flex flex-col gap-0.5">
                  {[1, 2, 3, 4].map((p) => (
                    <Button 
                      key={p}
                      variant="ghost" 
                      className={cn(
                        "h-8 justify-start rounded-lg hover:bg-zinc-900 font-bold uppercase text-[9px]",
                        p === 1 && "text-red-500",
                        p === 2 && "text-orange-500",
                        p === 3 && "text-blue-500",
                        p === 4 && "text-zinc-500"
                      )}
                      onClick={() => setPriority(p)}
                    >
                      Prioridade {p}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
             <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-800 italic">Triagem</span>
             <ChevronDown size={12} className="text-zinc-900" />
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-[#00ff41]/5 blur-2xl -z-10 group-hover:bg-[#00ff41]/10 transition-colors" />
    </div>
  );
};
