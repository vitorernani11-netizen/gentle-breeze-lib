import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Trash2 } from 'lucide-react';
import { format as formatDate, parseISO, isBefore, startOfToday, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: any;
  onComplete: (task: any) => void;
  onMoveToToday: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (task: any) => void;
  onUpdateStage: (id: string, stage: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onComplete,
  onMoveToToday,
  onDelete,
  onClick,
  onUpdateStage
}) => {
  const taskDate = parseISO(task.data_execucao);
  const isOverdue = !task.status_concluido && (
    isBefore(taskDate, startOfToday()) || 
    (task.hora_vencimento ? isBefore(parseISO(task.hora_vencimento), new Date()) : 
     (isToday(taskDate) && task.lembrete && (() => {
        const [hours, minutes] = task.lembrete.split(':').map(Number);
        const taskTime = new Date();
        taskTime.setHours(hours, minutes, 0, 0);
        return isBefore(taskTime, new Date());
      })())
    )
  );

  const displayTime = task.lembrete || (task.hora_vencimento ? formatDate(parseISO(task.hora_vencimento), 'HH:mm') : null);

  return (
    <Card className={cn(
      "bg-black border-0 border-b border-white/10 p-3 rounded-none flex flex-col group transition-all gap-3 relative",
      isOverdue ? "bg-red-500/5" : "hover:bg-zinc-900/30"
    )}>
      <div className="absolute top-3 right-3 flex gap-2 z-10">
        <Button 
          aria-label="Concluir tarefa"
          size="sm"
          className="bg-white text-black hover:bg-zinc-200 font-black uppercase text-[10px] rounded-sm h-8 px-3 transition-all active:scale-95"
          onClick={() => onComplete(task)}
        >
          Concluir
        </Button>
        <Button 
          aria-label="Mover para Hoje"
          size="sm"
          className="bg-zinc-950 text-[#00ff41] hover:bg-[#00ff41] hover:text-black text-[10px] font-black uppercase rounded-sm border border-[#00ff41]/30 h-8 px-3 transition-all"
          onClick={() => onMoveToToday(task.id)}
        >
          Hoje
        </Button>
        <Button 
          aria-label="Deletar registro"
          size="icon"
          variant="ghost"
          className="text-zinc-800 hover:text-red-500 hover:bg-red-500/10 h-8 w-8 border border-zinc-900 rounded-sm"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 size={14} />
        </Button>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick(task)}
        onKeyDown={(e) => { if (e.key === 'Enter') onClick(task); }}
        className="flex flex-col gap-1.5 flex-1 min-w-0 text-left cursor-pointer pr-2"
      >
        <div className="flex items-center gap-2">
          <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 border rounded-sm", 
            task.prioridade === 1 ? "text-red-500 border-red-500/20 bg-red-500/5" :
            task.prioridade === 2 ? "text-orange-500 border-orange-500/20 bg-orange-500/5" :
            task.prioridade === 3 ? "text-blue-500 border-blue-500/20 bg-blue-500/5" :
            "text-zinc-600 border-zinc-900"
          )}>
            P{task.prioridade || 4}
          </span>
          
          <div className="flex border border-zinc-900/50 bg-black/40 p-0.5 rounded-sm">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                aria-label={`Mover para estágio ${s}`}
                onClick={(e) => { e.stopPropagation(); onUpdateStage(task.id, s); }}
                className={cn(
                  "w-4 h-4 text-[8px] font-black flex items-center justify-center rounded-sm transition-all",
                  (task.triagem_stage || 1) === s 
                    ? "bg-zinc-100 text-black" 
                    : "text-zinc-700 hover:text-zinc-400"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {isOverdue && (
            <span className="text-[8px] font-black uppercase text-red-500 animate-pulse flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 border border-red-500/20">
              Atrasada
            </span>
          )}
        </div>
        
        <div>
          <h3 className="font-bold text-lg uppercase tracking-tight truncate leading-none mb-1">
            {task.titulo}
          </h3>
          
          {task.descricao && (
            <p className="text-zinc-600 text-[9px] font-medium uppercase leading-tight line-clamp-1 italic opacity-60">
              {task.descricao}
            </p>
          )}
        </div>
        
        <div className="flex items-center justify-start gap-2 pt-1">
          <span className={cn(
            "text-[9px] font-black uppercase flex items-center gap-1.5 px-2 py-1 rounded-sm border",
            isOverdue ? "text-red-500 border-red-500/20 bg-red-500/5" : "text-zinc-300 border-zinc-800 bg-zinc-900/50"
          )}>
            <Calendar size={10} /> 
            {formatDate(taskDate, "d MMM", { locale: ptBR }).toUpperCase()}
            {displayTime && (
              <span className="ml-1.5 text-[#00ff41] font-black">
                {displayTime}
              </span>
            )}
          </span>

          {task.repeticao && task.repeticao !== 'none' && (
            <span className="text-[8px] font-black uppercase text-zinc-500 flex items-center gap-1 border border-zinc-900/50 px-1.5 py-1 rounded-sm">
              <Clock size={10} /> {task.repeticao === 'daily' ? 'DIÁRIO' : task.repeticao === 'weekly' ? 'SEMANAL' : 'MENSAL'}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
