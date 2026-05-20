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

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onComplete,
  onMoveToToday,
  onDelete,
  onClick,
  onUpdateStage,
  onUpdatePriority
}) => {
  const checkIsOverdue = (dueDateStr: string, dueTimeStr?: string | null) => {
    if (!dueDateStr) return false;

    // 1. Pega a hora LOCAL real do aparelho do usuário
    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth() + 1;
    const diaAtual = agora.getDate();

    // 2. Trata a string da data da tarefa de forma limpa, sem conversão de UTC
    const parts = dueDateStr.split(/[-/T]/);
    if (parts.length < 3) return false;
    const anoTarefa = Number(parts[0]);
    const mesTarefa = Number(parts[1]);
    const diaTarefa = Number(parts[2]);

    // 3. Transforma as datas em números inteiros puros (Ex: 20260519)
    const hojeNum = anoAtual * 10000 + mesAtual * 100 + diaAtual;
    const tarefaNum = anoTarefa * 10000 + mesTarefa * 100 + diaTarefa;

    // Comparações de Dias
    if (tarefaNum < hojeNum) return true;  // Dia no passado = Atrasada
    if (tarefaNum > hojeNum) return false; // Dia no futuro = No prazo

    // 4. Se for EXATAMENTE o mesmo dia de hoje, compara o horário local do aparelho
    if (dueTimeStr) {
      // Garantir que estamos pegando apenas o horário HH:mm se vier uma string ISO
      const timeToParse = dueTimeStr.includes('T') 
        ? dueTimeStr.split('T')[1].substring(0, 5) 
        : dueTimeStr;
        
      const [horaTarefa, minTarefa] = timeToParse.split(':').map(Number);
      const horaAtual = agora.getHours();
      const minAtual = agora.getMinutes();

      // Transforma os horários em números inteiros (Ex: 2224 vs 2300)
      const tempoAtualNum = horaAtual * 100 + minAtual;
      const tempoTarefaNum = horaTarefa * 100 + minTarefa;

      return tempoAtualNum > tempoTarefaNum; // Se a hora atual passou da hora da tarefa = Atrasada
    }

    return false;
  };

  const isOverdue = !task.status_concluido && checkIsOverdue(
    task.data_execucao, 
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