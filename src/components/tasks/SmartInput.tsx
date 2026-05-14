
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
    
    onAddTask({
      titulo: result.text,
      vencimento: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : (result.dueDate || format(new Date(), 'yyyy-MM-dd')),
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
    <div className="p-4 bg-black border-4 border-white font-mono space-y-4">
      <div className="grid grid-cols-1 gap-2">
        <Button 
          variant="outline" 
          className="justify-start rounded-none border-2 border-white hover:bg-white hover:text-black font-black uppercase"
          onClick={() => setSelectedDate(startOfToday())}
        >
          Amanhã
        </Button>
        <Button 
          variant="outline" 
          className="justify-start rounded-none border-2 border-white hover:bg-white hover:text-black font-black uppercase"
          onClick={() => setSelectedDate(addWeeks(startOfWeek(new Date()), 1))}
        >
          Próxima Semana
        </Button>
        <Button 
          variant="outline" 
          className="justify-start rounded-none border-2 border-white hover:bg-white hover:text-black font-black uppercase"
          onClick={() => setSelectedDate(undefined)}
        >
          Sem Vencimento
        </Button>
      </div>
      
      <div className="border-t-2 border-white pt-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-none border-2 border-white"
          locale={ptBR}
        />
      </div>

      <div className="border-t-2 border-white pt-4 space-y-2">
        <span className="text-[10px] font-black uppercase text-zinc-500">Recorrência</span>
        <div className="flex flex-wrap gap-2">
          {(['none', 'daily', 'weekly', 'monthly'] as const).map((r) => (
            <Button
              key={r}
              variant="outline"
              size="sm"
              className={cn(
                "rounded-none border-2 uppercase font-black text-[10px]",
                recorrencia === r ? "bg-white text-black border-white" : "border-zinc-800 text-zinc-500 hover:border-white hover:text-white"
              )}
              onClick={() => setRecorrencia(r)}
            >
              {r === 'none' ? 'Nenhuma' : r === 'daily' ? 'Diário' : r === 'weekly' ? 'Semanal' : 'Mensal'}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative group w-full max-w-2xl mx-auto mb-12">
      {renderHighlights()}
      
      <div className="bg-zinc-950 border-4 border-white p-2 flex flex-col gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="O QUE PRECISA SER FEITO?"
            className="bg-transparent border-none text-xl sm:text-2xl font-black uppercase italic tracking-tighter focus-visible:ring-0 placeholder:text-zinc-800 h-14"
          />
          <Button 
            onClick={handleAdd}
            className="bg-[#00ff41] text-black hover:bg-green-400 rounded-none border-b-4 border-r-4 border-green-900 w-14 h-14 shrink-0 transition-none active:translate-y-1 active:translate-x-1 active:border-0"
          >
            <Send size={24} />
          </Button>
        </div>

        <div className="flex items-center justify-between border-t-2 border-zinc-900 pt-2 px-2">
          <div className="flex items-center gap-1 sm:gap-4">
            {isMobile ? (
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-none gap-2 px-2">
                    <CalendarIcon size={16} />
                    <span className="hidden sm:inline text-[10px] font-black uppercase">
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
                  <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-none gap-2 px-2">
                    <CalendarIcon size={16} />
                    <span className="hidden sm:inline text-[10px] font-black uppercase">
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
                <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-none gap-2 px-2">
                  <Bell size={16} />
                  <span className="hidden sm:inline text-[10px] font-black uppercase">{reminder || 'Lembrete'}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 bg-black border-4 border-white p-2 font-mono">
                <div className="flex flex-col gap-1">
                  <Button 
                    variant="ghost" 
                    className="justify-start rounded-none hover:bg-white hover:text-black font-black uppercase text-[10px]"
                    onClick={() => setReminder(format(addHours(new Date(), 2), 'HH:mm'))}
                  >
                    Em 2 horas
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="justify-start rounded-none hover:bg-white hover:text-black font-black uppercase text-[10px]"
                    onClick={() => setReminder('09:00')}
                  >
                    Amanhã de manhã
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="justify-start rounded-none hover:bg-white hover:text-black font-black uppercase text-[10px]"
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
                  "text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-none gap-2 px-2",
                  priority === 1 && "text-[#ff0055]",
                  priority === 2 && "text-[#ffaa00]",
                  priority === 3 && "text-[#00ccff]"
                )}>
                  <Hash size={16} />
                  <span className="hidden sm:inline text-[10px] font-black uppercase">P{priority}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 bg-black border-4 border-white p-2 font-mono">
                <div className="flex flex-col gap-1">
                  {[1, 2, 3, 4].map((p) => (
                    <Button 
                      key={p}
                      variant="ghost" 
                      className={cn(
                        "justify-start rounded-none hover:bg-white hover:text-black font-black uppercase text-[10px]",
                        p === 1 && "text-[#ff0055]",
                        p === 2 && "text-[#ffaa00]",
                        p === 3 && "text-[#00ccff]"
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
             <span className="text-[10px] font-black uppercase text-zinc-700 italic">Entrada / Triagem</span>
             <ChevronDown size={14} className="text-zinc-800" />
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-[#00ff41]/5 blur-2xl -z-10 group-hover:bg-[#00ff41]/10 transition-colors" />
    </div>
  );
};
