import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Trash2, RefreshCw } from 'lucide-react';
import { format as formatDate, parseISO } from 'date-fns';
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

  const now = new Date();
  
  // 1. Pega a data de hoje no formato YYYY-MM-DD (Garante 2 dígitos para mês e dia)
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // 2. Transforma a data da tarefa para o mesmo formato YYYY-MM-DD
  let taskDateStr = dueDateStr.split('T')[0]; // Remove horas se houver
  if (taskDateStr.includes('/')) {
    const parts = taskDateStr.split('/');
    // Se for DD/MM/YYYY converte para YYYY-MM-DD, senão mantém
    taskDateStr = parts[2].length === 4 
      ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      : `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  // 3. Comparação de Dias (String literal)
  if (taskDateStr < todayStr) return true; // Passado
  if (taskDateStr > todayStr) return false; // Futuro

  // 4. Se for HOJE, compara a hora
  if (dueTimeStr) {
    const [hours, minutes] = dueTimeStr.split(':').map(Number);
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    if (currentHours > hours) return true; // Hora já passou
    if (currentHours === hours && currentMinutes > minutes) return true; // Mesmo minuto já passou
  }

  return false;
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

  const displayTime = task.lembrete || (task.hora_vencimento ? formatDate(parseISO(task.hora_vencimento), 'HH:mm') : null);

  return (
    <Card className={cn(
      "bg-black border-0 border-b border-white/20 p-2 rounded-none flex flex-col group transition-all gap-2 relative",
      isOverdue ? "border-l-2 border-l-red-500" : ""
    )}>
      <div className="flex items-start justify-between gap-2">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onClick(task)}
          onKeyDown={(e) => { if (e.key === 'Enter') onClick(task); }}
          className="flex flex-col gap-1 flex-1 min-w-0 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
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
              className={cn("text-[8px] font-black uppercase px-1 py-0.5 border rounded-none transition-colors", 
                (task.prioridade === 'P1' || task.prioridade === 1) ? "text-red-500 border-red-500/40 bg-red-500/10" :
                (task.prioridade === 'P2' || task.prioridade === 2) ? "text-orange-500 border-orange-500/40 bg-orange-500/10" :
                (task.prioridade === 'P3' || task.prioridade === 3) ? "text-blue-500 border-blue-500/40 bg-blue-500/10" :
                "text-zinc-600 border-zinc-800"
              )}
            >
              {typeof task.prioridade === 'number' ? `P${task.prioridade}` : (task.prioridade || 'P4')}
            </button>
            
            <div className="flex items-center gap-0.5 border border-zinc-800 bg-zinc-950 p-0.5">
              {[1, 2, 3, 4].map((stage) => (
                <button
                  key={stage}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStage(task.id, stage);
                  }}
                  className={cn(
                    "w-4 h-4 text-[8px] font-black transition-colors",
                    (task.fase_pipeline || 1) === stage 
                      ? "bg-white text-black" 
                      : "bg-black text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {stage}
                </button>
              ))}
            </div>
            
            <h3 className="font-bold text-sm uppercase tracking-tight truncate leading-none flex items-center gap-1">
              {task.titulo}
              {(task.recorrencia_semanal || (task.repeticao && task.repeticao !== 'none')) && (
                <RefreshCw className="w-3 h-3 text-[#00ff41] animate-none" />
              )}
            </h3>

            {isOverdue && (
              <span className="text-[7px] font-black uppercase text-red-500 px-1 border border-red-500/30 bg-red-500/5">
                Atrasada
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {displayTime && (
              <span className="text-[9px] font-black text-[#00ff41] flex items-center gap-1">
                <Clock size={8} /> {displayTime}
              </span>
            )}
            {task.descricao && (
              <p className="text-zinc-500 text-[8px] font-medium uppercase truncate opacity-50">
                {task.descricao}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          <Button 
            aria-label="Concluir"
            size="sm"
            className="bg-white text-black hover:bg-zinc-200 font-black uppercase text-[9px] rounded-none h-7 px-3 transition-all active:scale-95"
            onClick={() => onComplete(task)}
          >
            Concluir
          </Button>
          <Button 
            aria-label="Hoje"
            size="sm"
            className="bg-zinc-950 text-[#00ff41] hover:bg-[#00ff41] hover:text-black text-[9px] font-black uppercase rounded-none border border-[#00ff41] h-7 px-2 transition-all"
            onClick={() => onMoveToToday(task.id)}
          >
            Hoje
          </Button>
          <Button 
            aria-label="Deletar"
            size="icon"
            variant="ghost"
            className="text-zinc-700 hover:text-red-500 h-7 w-7 border border-zinc-900 rounded-none"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>
    </Card>
  );
};