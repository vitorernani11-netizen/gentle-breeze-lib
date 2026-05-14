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
import { Calendar } from '@/components/ui/calendar';

interface AddTaskOverlayProps {
  open: boolean;
  onClose: () => void;
  onAddTask: (task: {
    titulo: string;
    vencimento: string;
    recorrencia: string;
    prioridade: number;
    lembrete: string | null;
    descricao?: string;
  }) => void;
}

export const AddTaskOverlay: React.FC<AddTaskOverlayProps> = ({ open, onClose, onAddTask }) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [vencimento, setVencimento] = useState<Date>(startOfToday());
  const [prioridade, setPrioridade] = useState(4);
  const [lembrete, setLembrete] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!titulo.trim()) return;
    onAddTask({
      titulo,
      vencimento: format(vencimento, 'yyyy-MM-dd'),
      recorrencia: 'none',
      prioridade,
      lembrete,
      descricao
    });
    setTitulo('');
    setDescricao('');
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

        <Input
          ref={inputRef}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Nome da tarefa"
          className="bg-transparent border-none text-xl font-bold placeholder:text-zinc-800 focus-visible:ring-0 p-0 h-auto mb-2"
        />
        
        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descrição (opcional)"
          className="bg-transparent border-none text-sm placeholder:text-zinc-800 focus-visible:ring-0 p-0 min-h-[60px] resize-none mb-6"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-900 pt-4">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-xl border border-zinc-900", vencimento && "text-[#00ff41] border-[#00ff41]/20")}>
                  <CalendarIcon size={18} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-900">
                <Calendar
                  mode="single"
                  selected={vencimento}
                  onSelect={(date) => date && setVencimento(date)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-xl border border-zinc-900", lembrete && "text-[#00ff41] border-[#00ff41]/20")}>
                  <Clock size={18} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 bg-zinc-950 border-zinc-900 p-2">
                 <div className="grid grid-cols-1 gap-1">
                    {['09:00', '12:00', '15:00', '18:00', '21:00'].map(t => (
                      <Button key={t} variant="ghost" className="justify-start font-bold" onClick={() => setLembrete(t)}>{t}</Button>
                    ))}
                    <Button variant="ghost" className="justify-start text-red-500" onClick={() => setLembrete(null)}>Limpar</Button>
                 </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className={cn(
                  "h-9 w-9 rounded-xl border border-zinc-900",
                  prioridade === 1 && "text-red-500 border-red-500/20",
                  prioridade === 2 && "text-orange-500 border-orange-500/20",
                  prioridade === 3 && "text-blue-500 border-blue-500/20"
                )}>
                  <Flag size={18} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 bg-zinc-950 border-zinc-900 p-2">
                {[1, 2, 3, 4].map(p => (
                  <Button 
                    key={p} 
                    variant="ghost" 
                    className="w-full justify-start gap-2 font-bold" 
                    onClick={() => setPrioridade(p)}
                  >
                    <Flag size={14} className={cn(
                      p === 1 && "text-red-500",
                      p === 2 && "text-orange-500",
                      p === 3 && "text-blue-500"
                    )} />
                    P{p}
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