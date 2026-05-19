import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Flag, 
  Tag, 
  Target,
  Send,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { parseNLP, NLPResult } from '@/utils/nlpParser';
import { CalendarPopover } from './CalendarPopover';
import { ReminderManager } from './ReminderManager';

interface AddTaskOverlayProps {
  open: boolean;
  onClose: () => void;
  onAddTask: (task: {
    titulo: string;
    vencimento: string;
    recorrencia: string;
    prioridade: string;
    lembrete: string | null;
    reminders: any[];
    descricao?: string;
    hora_vencimento?: string | null;
  }) => void;
}

export const AddTaskOverlay: React.FC<AddTaskOverlayProps> = ({ open, onClose, onAddTask }) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [vencimento, setVencimento] = useState<Date>(startOfToday());
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [prioridade, setPrioridade] = useState<string>('P4');
  const [lembrete, setLembrete] = useState<string | null>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [nlpData, setNlpData] = useState<NLPResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setTitulo('');
      setDescricao('');
      setVencimento(startOfToday());
      setRecurrence('none');
      setPrioridade('P4');
      setLembrete(null);
      setReminders([]);
      setNlpData(null);
    }
  }, [open]);

  useEffect(() => {
    if (titulo.trim()) {
      const result = parseNLP(titulo);
      setNlpData(result);
      
      if (result.dueDate) {
         const newDate = new Date(result.dueDate);
         if (result.reminderTime) {
            const [h, m] = result.reminderTime.split(':').map(Number);
            newDate.setHours(h, m, 0, 0);
         }
         setVencimento(newDate);
      }
      if (result.reminderTime) setLembrete(result.reminderTime);
      if (result.recurrence) setRecurrence(result.recurrence);
    } else {
      setNlpData(null);
    }
  }, [titulo]);

  const handleSubmit = () => {
    if (!titulo.trim()) return;

    const result = nlpData || parseNLP(titulo);
    
    // Formatting for LocalStorage as requested: due_date: "2026-05-14T17:00:00.000Z"
    const horaVencISO = vencimento.toISOString();

    console.log('[Task:Create]', { title: result.text, due_date: horaVencISO, recurrence });

    onAddTask({
      titulo: result.text,
      vencimento: format(vencimento, 'yyyy-MM-dd'),
      recorrencia: recurrence,
      prioridade,
      lembrete: format(vencimento, 'HH:mm'),
      reminders: reminders,
      descricao,
      hora_vencimento: horaVencISO
    });
    
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-zinc-950 border-t-2 border-x-2 border-white rounded-t-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-full duration-300"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Nova Captura</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="relative">
          <Input
            ref={inputRef}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Nome da tarefa"
            className="bg-transparent border-none text-xl font-bold placeholder:text-zinc-800 focus-visible:ring-0 p-0 h-auto mb-2 relative z-10"
          />
          {nlpData && nlpData.detectedPatterns.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {nlpData.detectedPatterns.map((pattern, idx) => (
                <span key={idx} className="bg-[#00ff41] text-black text-[10px] font-black px-1.5 py-0.5 uppercase tracking-tighter rounded-sm">
                  {pattern}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descrição (opcional)"
          className="bg-transparent border-none text-sm placeholder:text-zinc-800 focus-visible:ring-0 p-0 min-h-[60px] resize-none mb-6"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-900 pt-4">
          <div className="flex items-center gap-2">
            <CalendarPopover 
              selectedDate={vencimento} 
              onSelect={setVencimento}
              recurrence={recurrence}
              onRecurrenceSelect={setRecurrence}
            >
              <Button variant="ghost" className={cn("h-9 px-3 rounded-xl border border-zinc-900", vencimento && "text-[#00ff41] border-[#00ff41]/20")}>
                <CalendarIcon size={18} />
                <span className="ml-2 text-[10px] font-bold uppercase whitespace-nowrap">
                  {format(vencimento, "dd MMM", { locale: ptBR })} • {format(vencimento, 'HH:mm')}
                </span>
              </Button>
            </CalendarPopover>

            <ReminderManager reminders={reminders} onUpdate={setReminders}>
              <Button 
                variant="ghost" 
                className={cn(
                  "h-9 px-3 rounded-xl border border-zinc-900 transition-all", 
                  reminders.length > 0 && "text-[#00ff41] border-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.2)]"
                )}
              >
                <Clock size={18} />
                {reminders.length > 0 && <span className="ml-2 text-[10px] font-black tracking-tighter">{reminders.length}</span>}
              </Button>
            </ReminderManager>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className={cn(
                  "h-9 w-9 rounded-xl border border-zinc-900",
                  prioridade === 'P1' && "text-red-500 border-red-500/20",
                  prioridade === 'P2' && "text-orange-500 border-orange-500/20",
                  prioridade === 'P3' && "text-blue-500 border-blue-500/20"
                )}>
                  <Flag size={18} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 bg-zinc-950 border-zinc-900 p-2 z-[110]">
                {['P1', 'P2', 'P3', 'P4'].map(p => (
                  <Button 
                    key={p} 
                    variant="ghost" 
                    className="w-full justify-start gap-2 font-bold" 
                    onClick={() => setPrioridade(p)}
                  >
                    <Flag size={14} className={cn(
                      p === 'P1' && "text-red-500",
                      p === 'P2' && "text-orange-500",
                      p === 'P3' && "text-blue-500"
                    )} />
                    {p}
                  </Button>
                ))}
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-zinc-900 text-zinc-700">
              <Tag size={18} />
            </Button>
            
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-zinc-900 text-zinc-700">
              <Target size={18} />
            </Button>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={!titulo.trim()}
            className="bg-white text-black hover:bg-zinc-200 rounded-full w-12 h-12 p-0 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-20 transition-all"
          >
            <Send size={20} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};