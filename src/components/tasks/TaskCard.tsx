import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Trash2, RefreshCw, Bell, Calendar } from 'lucide-react';
import { format as formatDate, parseISO, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: any;
  onComplete: (task: any) => void;
  onMoveToToday: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (task: any) => void;
  onUpdateStage: (id: string, stage: number) => void;
  onUpdatePriority?: (id: string, priority: string) => void;
}

export const isTaskOverdue = (dueDateStr: string, dueTimeStr?: string | null) => {
  if (!dueDateStr) return false;
  
  try {
    const agora = new Date();
    
    // 1. Limpa e isola a string da data (YYYY-MM-DD ou DD/MM/YYYY)
    let dataLimpa = dueDateStr.split('T')[0].trim();
    let ano = agora.getFullYear();
    let mes = agora.getMonth(); // 0-11
    let dia = agora.getDate();

    if (dataLimpa.includes('/')) {
      const parts = dataLimpa.split('/');
      dia = parseInt(parts[0], 10);
      mes = parseInt(parts[1], 10) - 1;
      ano = parseInt(parts[2], 10);
    } else if (dataLimpa.includes('-')) {
      const parts = dataLimpa.split('-');
      // Se começar com 4 dígitos é YYYY-MM-DD, senão é DD-MM-YYYY
      if (parts[0].length === 4) {
        ano = parseInt(parts[0], 10);
        mes = parseInt(parts[1], 10) - 1;
        dia = parseInt(parts[2], 10);
      } else {
        dia = parseInt(parts[0], 10);
        mes = parseInt(parts[1], 10) - 1;
        ano = parseInt(parts[2], 10);
      }
    }

    // 2. Extrai hora e minuto. Se não houver, joga para o fim do dia (23:59)
    let hora = 23;
    let minuto = 59;
    if (dueTimeStr && dueTimeStr.trim() !== '' && dueTimeStr.includes(':')) {
      const timeParts = dueTimeStr.split(':');
      hora = parseInt(timeParts[0], 10);
      minuto = parseInt(timeParts[1], 10);
    }

    // 3. Monta o objeto de comparação no fuso horário do aparelho
    const dataTarefa = new Date(ano, mes, dia, hora, minuto, 0, 0);

    // Se o timestamp atual for maior que o da tarefa, ela está ATRASADA (true)
    return agora.getTime() > dataTarefa.getTime();
  } catch (error) {
    console.error("Erro crítico no cálculo de atraso:", error);
    return false;
  }
};


export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onComplete,
  onMoveToToday,
  onDelete,
  onClick,
  onUpdateStage,
  onUpdatePriority
}) => {
  const isOverdue = !task.status_concluido && isTaskOverdue(
    task.data_execucao || task.data_vencimento, 
    task.hora_vencimento || task.lembrete
  );

  const displayTime = task.lembrete || (task.hora_vencimento ? task.hora_vencimento : null);
  const dataVenc = task.data_execucao || task.data_vencimento;
  const isScheduledToday = dataVenc ? isToday(parseISO(dataVenc)) : false;
  const displayDate = dataVenc && !isScheduledToday ? formatDate(parseISO(dataVenc), 'dd/MM') : null;

  return (
    <Card className={cn(
      "bg-black border-0 border-b border-white/10 p-4 rounded-none flex flex-col group transition-all gap-4 relative active:bg-zinc-900/50",
      isOverdue ? "border-l-4 border-l-red-500" : ""
    )}>
      <div className="flex items-start justify-between gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onClick(task)}
          onKeyDown={(e) => { if (e.key === 'Enter') onClick(task); }}
          className="flex flex-col gap-2 flex-1 min-w-0 text-left cursor-pointer"
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const priorities = ['P4', 'P1', 'P2', 'P3'];
                const currentP = typeof task.prioridade === 'number' ? `P${task.prioridade}` : (task.prioridade || 'P4');
                const currentIndex = priorities.indexOf(currentP);
                const nextPriority = priorities[(currentIndex + 1) % priorities.length];
                if (onUpdatePriority) {
                  onUpdatePriority(task.id, nextPriority);
                }
              }}
              className={cn("text-[10px] font-black uppercase px-2 py-1 border rounded-md transition-colors", 
                (task.prioridade === 'P1' || task.prioridade === 1) ? "text-red-500 border-red-500/40 bg-red-500/10" :
                (task.prioridade === 'P2' || task.prioridade === 2) ? "text-orange-500 border-orange-500/40 bg-orange-500/10" :
                (task.prioridade === 'P3' || task.prioridade === 3) ? "text-blue-500 border-blue-500/40 bg-blue-500/10" :
                "text-zinc-500 border-zinc-800 bg-zinc-900/50"
              )}
            >
              {typeof task.prioridade === 'number' ? `P${task.prioridade}` : (task.prioridade || 'P4')}
            </button>
            
            <div className="flex items-center gap-1 border border-zinc-800 bg-zinc-950 p-1 rounded-md">
              {[1, 2, 3, 4].map((stage) => (
                <button
                  key={stage}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStage(task.id, stage);
                  }}
                  className={cn(
                    "w-6 h-6 flex items-center justify-center text-[10px] font-black transition-all rounded-sm",
                    (task.fase_pipeline || 1) === stage 
                      ? "bg-white text-black scale-110 shadow-lg" 
                      : "bg-black text-zinc-600 hover:text-zinc-400"
                  )}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-1">
            <h3 className="font-black text-base uppercase tracking-tight leading-tight flex items-center flex-wrap gap-2">
              {task.titulo}
              {(task.recorrencia_semanal || (task.repeticao && task.repeticao !== 'none')) && (
                <RefreshCw className="w-4 h-4 text-[#00ff41] animate-none" />
              )}
              {isOverdue && (
                <span className="bg-red-900/80 text-red-200 text-[9px] px-2 py-0.5 rounded font-black border border-red-600 animate-pulse uppercase">
                  ATRASADA
                </span>
              )}
            </h3>
            
            <div className="flex items-center flex-wrap gap-2">
              {displayDate && (
                <span className="text-[11px] font-black text-white/70 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                  <Calendar size={10} /> {displayDate}
                </span>
              )}
              {displayTime && (
                <span className="text-[11px] font-black text-[#00ff41] flex items-center gap-1 bg-[#00ff41]/5 px-2 py-0.5 rounded-md border border-[#00ff41]/20">
                  <Clock size={10} /> {displayTime}
                </span>
              )}
              {task.lembretes && task.lembretes.length > 0 && (
                <span className="text-[11px] font-black text-[#ff00ff] flex items-center gap-1 bg-[#ff00ff]/5 px-2 py-0.5 rounded-md">
                  <Bell size={10} /> {task.lembretes.length}
                </span>
              )}
              {task.descricao && (
                <p className="text-zinc-500 text-[11px] font-medium uppercase truncate opacity-70">
                  {task.descricao}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <Button 
            aria-label="Concluir"
            size="lg"
            className="bg-white text-black hover:bg-zinc-200 font-black uppercase text-[11px] rounded-xl h-12 px-5 transition-all active:scale-95 shadow-xl"
            onClick={() => onComplete(task)}
          >
            Concluir
          </Button>
          <div className="flex gap-2">
            <Button 
              aria-label="Hoje"
              size="sm"
              className="flex-1 bg-zinc-950 text-[#00ff41] hover:bg-[#00ff41] hover:text-black text-[10px] font-black uppercase rounded-lg border border-[#00ff41]/30 h-10 px-3 transition-all active:scale-95"
              onClick={() => onMoveToToday(task.id)}
            >
              Hoje
            </Button>
            <Button 
              aria-label="Deletar"
              size="icon"
              variant="ghost"
              className="text-zinc-800 hover:text-red-500 h-10 w-10 border border-zinc-900 rounded-lg transition-all active:scale-95"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};