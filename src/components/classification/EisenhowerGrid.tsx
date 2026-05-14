import { useTaskActions } from "@/hooks/useTaskActions";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlaneTakeoff } from "lucide-react";

interface EisenhowerGridProps {
  tasks: any[];
  onTaskClick: (task: any) => void;
}

export const EisenhowerGrid = ({ tasks, onTaskClick }: EisenhowerGridProps) => {
  const { updateTask } = useTaskActions();

  // Filter tasks that are in "Entrada" status (Classification/Triagem phase)
  const classificationTasks = tasks.filter(t => t.status === 'Entrada' && !t.status_concluido);

  const quadrants = [
    {
      id: 1,
      title: "URGENTE + IMPORTANTE",
      label: "Fazer Agora",
      priority: 1,
      color: "border-red-500",
      bg: "bg-red-500/10",
      text: "text-red-500",
    },
    {
      id: 2,
      title: "NÃO URGENTE + IMPORTANTE",
      label: "Agendar",
      priority: 2,
      color: "border-emerald-500",
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
    },
    {
      id: 3,
      title: "URGENTE + NÃO IMPORTANTE",
      label: "Delegar",
      priority: 3,
      color: "border-yellow-500",
      bg: "bg-yellow-500/10",
      text: "text-yellow-500",
    },
    {
      id: 4,
      title: "NÃO URGENTE + NÃO IMPORTANTE",
      label: "Eliminar",
      priority: 4,
      color: "border-zinc-500",
      bg: "bg-zinc-500/10",
      text: "text-zinc-500",
    },
  ];

  const handleMoveToFraction = (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    updateTask(task.id, { status: 'Fracionar' });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-4 border-white bg-white overflow-hidden rounded-sm">
      {quadrants.map((q) => (
        <div 
          key={q.id} 
          className={cn(
            "min-h-[250px] p-4 flex flex-col border-white",
            q.id === 1 && "md:border-r-4 md:border-b-4 border-b-4",
            q.id === 2 && "md:border-b-4 border-b-4",
            q.id === 3 && "md:border-r-4 border-b-4 md:border-b-0",
            "bg-black"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className={cn("text-[10px] font-black uppercase tracking-tighter", q.text)}>
                {q.title}
              </span>
              <span className="text-[14px] font-black text-white uppercase italic">
                {q.label}
              </span>
            </div>
            <div className={cn("w-3 h-3 rounded-full animate-pulse", q.bg.replace('/10', ''))} />
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {classificationTasks
              .filter((t) => (t.prioridade || 4) === q.priority)
              .map((task) => (
                <Card
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className={cn(
                    "p-3 cursor-pointer transition-all hover:translate-x-1 active:translate-y-0.5",
                    "bg-zinc-900 border-l-4 border-t-0 border-r-0 border-b-0 rounded-none",
                    q.color
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-zinc-100 leading-tight uppercase tracking-tight">
                      {task.titulo}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-white/10 shrink-0"
                      onClick={(e) => handleMoveToFraction(e, task)}
                      title="Mover para Fracionar"
                    >
                      <PlaneTakeoff size={14} />
                    </Button>
                  </div>
                </Card>
              ))}
            
            {classificationTasks.filter((t) => (t.prioridade || 4) === q.priority).length === 0 && (
              <div className="h-full flex items-center justify-center opacity-10">
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white rotate-[-5deg]">
                  Vazio
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
