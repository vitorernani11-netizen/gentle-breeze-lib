import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Trash2, RefreshCw, Bell, Calendar, Check, X } from 'lucide-react';
import { useTaskActions } from '@/hooks/useTaskActions';

import { cn } from '@/lib/utils';

const WEEKDAY_SHORT: Record<string, string> = {
  'domingo': 'DOM', 'segunda': 'SEG', 'terça': 'TER',
  'quarta': 'QUA', 'quinta': 'QUI', 'sexta': 'SEX', 'sábado': 'SÁB',
};

const recurrenceLabel = (task: any): string | null => {
  if (task.recorrencia_tipo === 'weekdays' && Array.isArray(task.recorrencia_dias)) {
    return task.recorrencia_dias.map((d: string) => WEEKDAY_SHORT[d] || d.slice(0,3).toUpperCase()).join(' ');
  }
  if (task.recorrencia_tipo === 'daily') return 'DIÁRIO';
  if (task.recorrencia_tipo === 'weekly') return 'SEMANAL';
  if (task.recorrencia_tipo === 'monthly') return 'MENSAL';
  if (task.recorrencia_semanal) return WEEKDAY_SHORT[task.recorrencia_semanal] || task.recorrencia_semanal.toUpperCase();
  if (task.repeticao === 'daily') return 'DIÁRIO';
  if (task.repeticao === 'weekly') return 'SEMANAL';
  if (task.repeticao === 'monthly') return 'MENSAL';
  return null;
};

interface TaskCardProps {
  task: any;
  onComplete: (task: any) => void;
  onMoveToToday: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (task: any) => void;
  onUpdateStage: (id: string, stage: number) => void;
  onUpdatePriority?: (id: string, priority: string) => void;
}

const normalizarParaObjetoDate = (dataStr: string, horaStr?: string | null): Date | null => {
  // Parser Universal forçado para 2026
  if (!dataStr) return null;
  try {
    const agora = new Date();
    const anoAtual = 2026; 
    let dia = agora.getDate();
    let mes = agora.getMonth(); 
    let ano = anoAtual;

    const str = dataStr.toUpperCase().trim();

    if (str !== 'HOJE' && str !== '') {
      // Remove resíduos de ISO timestamp (T00:00...)
      const apenasData = dataStr.split('T')[0].trim();

      if (apenasData.includes('/')) {
        const parts = apenasData.split('/');
        dia = parseInt(parts[0], 10);
        mes = parseInt(parts[1], 10) - 1;
        ano = parts[2] ? parseInt(parts[2], 10) : anoAtual;
      } else if (apenasData.includes('-')) {
        const parts = apenasData.split('-');
        if (parts[0].length === 4) {
          ano = parseInt(parts[0], 10);
          mes = parseInt(parts[1], 10) - 1;
          dia = parseInt(parts[2], 10);
        } else {
          dia = parseInt(parts[0], 10);
          mes = parseInt(parts[1], 10) - 1;
          ano = parts[2] ? parseInt(parts[2], 10) : anoAtual;
        }
      }
    }

    // Configuração do Horário Fixo (Se vazio, assume 23:59)
    let hora = 23;
    let minuto = 59;
    if (horaStr && horaStr.trim() !== '' && horaStr.includes(':')) {
      const timeParts = horaStr.split(':');
      const h = parseInt(timeParts[0], 10);
      const m = parseInt(timeParts[1], 10);
      if (!isNaN(h)) hora = h;
      if (!isNaN(m)) minuto = m;
    }

    return new Date(ano, mes, dia, hora, minuto, 0, 0);
  } catch (e) {
    return null;
  }
};

// Nova função unificada de atraso baseada no normalizador acima
export const isTaskOverdue = (dueDateStr: string, dueTimeStr?: string | null): boolean => {
  const dataTarefa = normalizarParaObjetoDate(dueDateStr, dueTimeStr);
  if (!dataTarefa) return false;
  return new Date().getTime() > dataTarefa.getTime();
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
  const { updateTask } = useTaskActions();
  const isOverdue = !task.status_concluido && isTaskOverdue(
    task.data_execucao || task.data_vencimento, 
    task.hora_vencimento || task.lembrete
  );

  const formatarHoraLimpa = (horaStr?: string | null) => {
    if (!horaStr) return null;
    let clean = horaStr;
    if (horaStr.includes('T')) {
      clean = horaStr.split('T')[1];
    }
    clean = clean.substring(0, 5);
    return clean.replace(':', 'h'); // Converte 17:30 para 17h30
  };

  const horaExibicao = formatarHoraLimpa(task.hora_vencimento || task.lembrete);
  const dataVenc = task.data_execucao || task.data_vencimento;
  
  const objData = dataVenc ? normalizarParaObjetoDate(dataVenc, task.hora_vencimento || task.lembrete) : null;
  const agora = new Date();
  const isScheduledToday = objData && 
                           objData.getDate() === agora.getDate() && 
                           objData.getMonth() === agora.getMonth() && 
                           objData.getFullYear() === agora.getFullYear();
                           
  const displayDate = dataVenc ? (
    isScheduledToday || dataVenc.toUpperCase().trim() === 'HOJE' 
      ? "HOJE" 
      : (objData 
          ? `${String(objData.getDate()).padStart(2, '0')}/${String(objData.getMonth() + 1).padStart(2, '0')}` 
          : dataVenc)
  ) : null;

  return (
    <Card className={cn(
      "bg-black border-0 border-b border-white/10 p-4 rounded-none flex flex-col group transition-all gap-2 relative active:bg-zinc-900/50",
      isOverdue ? "border-l-4 border-l-red-500" : ""
    )}>
      <div className="flex flex-col gap-3">
        {/* Top Unified Line (Ultra-Slim UX) */}
        <div className="flex flex-row items-center gap-2 w-full mb-2">
          {/* 1. Prioridade */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const priorities = ['P4', 'P1', 'P2', 'P3'];
              const currentP = task.prioridade || 'P4';
              const currentIndex = priorities.indexOf(currentP);
              const nextPriority = priorities[(currentIndex + 1) % priorities.length];
              if (onUpdatePriority) {
                onUpdatePriority(task.id, nextPriority);
              }
            }}
            className={cn(
              "text-[10px] font-black uppercase px-2 py-0.5 border rounded-md transition-all active:scale-95",
              (task.prioridade === 'P1' || task.prioridade === 1) ? "text-red-500 border-red-500/40 bg-red-500/10" :
              (task.prioridade === 'P2' || task.prioridade === 2) ? "text-orange-500 border-orange-500/40 bg-orange-500/10" :
              (task.prioridade === 'P3' || task.prioridade === 3) ? "text-blue-500 border-blue-500/40 bg-blue-500/10" :
              "text-zinc-500 border-zinc-800 bg-zinc-900/50"
            )}
          >
            {task.prioridade || 'P4'}
          </button>
          
          {/* 2. Horário Fixo Limpo (Sem classe hidden!) */}
          {horaExibicao && (
            <div className="flex items-center gap-1 text-[10px] font-black text-[#00ff41] bg-[#00ff41]/5 px-2 py-0.5 rounded-md border border-[#00ff41]/20">
              <Clock size={10} strokeWidth={3} />
              <span>{horaExibicao}</span>
            </div>
          )}

          {/* 3. Data */}
          {displayDate && (
            <div className="flex items-center gap-1 text-[10px] font-black text-zinc-500 bg-zinc-900/50 px-2 py-0.5 rounded-md border border-zinc-800">
              <Calendar size={10} />
              <span>{displayDate}</span>
            </div>
          )}

          {isOverdue && (
            <span className="bg-red-900/80 text-red-200 text-[9px] px-2 py-0.5 rounded font-black border border-red-600 animate-pulse uppercase">
              ATRASADA
            </span>
          )}

          {/* 4. Pipeline Restaurada (Alinhada à direita com ml-auto) */}
          <div className="ml-auto flex items-center gap-1 text-[10px] font-bold text-zinc-700">
            {[1, 2, 3, 4].map((stage, idx) => (
              <React.Fragment key={stage}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStage(task.id, stage);
                  }}
                  className={cn(
                    "transition-all px-0.5",
                    (task.fase_pipeline || 1) === stage 
                      ? "text-[#00ff41] font-black" 
                      : "hover:text-zinc-400"
                  )}
                >
                  {stage}
                </button>
                {idx < 3 && <span className="text-zinc-900/50 font-light mx-px">|</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onClick(task)}
            onKeyDown={(e) => { if (e.key === 'Enter') onClick(task); }}
            className="flex flex-col flex-grow items-start justify-start w-full min-w-0 text-left cursor-pointer"
          >
            <div className="w-full min-w-0 flex items-start gap-2">
              <h3 className="flex-1 min-w-0 font-black text-base md:text-xl uppercase tracking-tight leading-tight text-white [overflow-wrap:anywhere] break-all line-clamp-3 overflow-hidden">
                {task.titulo}
              </h3>
              {(() => {
                const recLabel = recurrenceLabel(task);
                if (!recLabel) return null;
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTask(task.id, {
                        recorrencia_tipo: null,
                        recorrencia_dias: null,
                        recorrencia_semanal: null,
                        repeticao: 'none',
                      });
                    }}
                    aria-label="Remover rotina"
                    title="Remover rotina (manter como tarefa comum)"
                    className="group/rec shrink-0 mt-0.5 flex flex-col items-center gap-0.5 px-1.5 py-0.5 rounded-md hover:bg-orange-500/10 transition-colors"
                  >
                    <div className="relative">
                      <RefreshCw className="w-4 h-4 text-[#00ff41] group-hover/rec:opacity-0 transition-opacity" />
                      <X className="w-4 h-4 text-orange-400 absolute inset-0 opacity-0 group-hover/rec:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-[8px] font-black tracking-wider text-orange-400 leading-none">
                      {recLabel}
                    </span>
                  </button>
                );
              })()}
            </div>

            {task.descricao && (
              <p className="w-full min-w-0 text-left [overflow-wrap:anywhere] break-all whitespace-pre-wrap text-zinc-400 text-xs font-medium uppercase opacity-80 leading-relaxed mt-1 line-clamp-2 overflow-hidden text-ellipsis">
                {task.descricao}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <button 
              aria-label="Concluir"
              className="w-8 h-8 rounded-full border-2 border-zinc-700 hover:border-[#00ff41] hover:bg-[#00ff41]/20 flex items-center justify-center transition-all self-end"
              onClick={() => onComplete(task)}
            >
              <Check size={14} className="text-[#00ff41] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <div className="flex justify-end">
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
      </div>
    </Card>
  );
};