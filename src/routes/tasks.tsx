import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Hash, 
  WifiOff, 
  Clock, 
  Calendar, 
  AlertCircle,
  ChevronDown,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useTaskActions } from '@/hooks/useTaskActions';
import { saveToLocal, loadFromLocal } from '@/lib/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const TASKS_KEY = 'hardware_humano_data';

export const Route = createFileRoute('/tasks')({
  component: TasksPage,
});

function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  
  const [newTask, setNewTask] = useState({
    titulo: '',
    descricao: '',
    recorrencia: 'none',
    vencimento: '',
    prioridade: '4'
  });

  const { moveTask } = useTaskActions(() => {
    fetchTasks();
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = () => {
    try {
      setLoading(true);
      const allTasks = loadFromLocal(TASKS_KEY);
      
      if (!Array.isArray(allTasks)) {
        throw new Error('Formato de dados inválido no hardware.');
      }

      const filteredTasks = allTasks.filter((t: any) => 
        t && t.status === 'Entrada' && !t.status_concluido
      ).sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      setTasks(filteredTasks);
      setErrorState(null);
    } catch (error: any) {
      console.error('Erro ao carregar tarefas:', error);
      setErrorState('Falha ao acessar banco de dados local.');
      toast.error('O hardware falhou ao carregar a Entrada.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação Básica
    if (!newTask.titulo.trim()) {
      toast.error('Título é obrigatório para captura.');
      return;
    }

    if (newTask.titulo.length > 100) {
      toast.error('Título muito longo (máx 100 caracteres).');
      return;
    }

    try {
      const task = {
        id: crypto.randomUUID(),
        titulo: newTask.titulo.trim(),
        descricao: newTask.descricao.trim(),
        repeticao: newTask.recorrencia,
        data_execucao: newTask.vencimento || new Date().toISOString().split('T')[0],
        prioridade: parseInt(newTask.prioridade) || 4,
        user_id: 'local-user',
        status: 'Entrada',
        status_concluido: false,
        created_at: new Date().toISOString(),
        tags: []
      };

      const allTasks = loadFromLocal(TASKS_KEY) || [];
      saveToLocal(TASKS_KEY, [task, ...allTasks]);
      
      setTasks(prev => [task, ...prev]);
      setNewTask({
        titulo: '',
        descricao: '',
        recorrencia: 'none',
        vencimento: '',
        prioridade: '4'
      });
      setShowAddModal(false);
      toast.success('Tarefa capturada com sucesso');
    } catch (error: any) {
      console.error('Erro ao adicionar tarefa:', error);
      toast.error('O hardware rejeitou o novo registro.');
    }
  };

  const deleteTask = (id: string) => {
    if (!id) return;
    
    try {
      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const updatedTasks = allTasks.filter((t: any) => t.id !== id);
      saveToLocal(TASKS_KEY, updatedTasks);
      setTasks(tasks.filter(t => t.id !== id));
      toast.success('Registro deletado');
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      toast.error('Falha ao remover do hardware.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-mono">
        <span className="text-zinc-500 animate-pulse font-black uppercase tracking-[0.3em]">Carregando Pipeline...</span>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center font-mono p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-black uppercase mb-2">Erro de Hardware</h2>
        <p className="text-zinc-500 text-xs mb-8 uppercase tracking-widest">{errorState}</p>
        <Button onClick={() => window.location.reload()} className="bg-white text-black rounded-none h-12 px-8 font-black uppercase">Reiniciar Sistema</Button>
      </div>
    );
  }

  const triagemItems = [
    { num: '1', label: 'Classificação', desc: 'Onde/Quando/Entrega', color: 'border-white' },
    { num: '2', label: 'Fracionar', desc: 'Quebrar em partes', color: 'border-white' },
    { num: '3', label: 'Planejamento', desc: 'Agendar execução', color: 'border-white' },
    { num: '4', label: 'Execução', desc: 'Foco atual', color: 'border-[#00ff41] text-[#00ff41]' },
  ];

  const getPriorityColor = (p: number) => {
    switch (p) {
      case 1: return 'text-[#ff0055] border-[#ff0055]';
      case 2: return 'text-[#ffaa00] border-[#ffaa00]';
      case 3: return 'text-[#00ccff] border-[#00ccff]';
      default: return 'text-zinc-400 border-zinc-800';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 pt-24 pb-20 font-mono">
      <div className="fixed top-6 right-6 flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800 z-50">
        <WifiOff size={14} className="text-zinc-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Hardware Local</span>
      </div>

      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })} className="border-2 border-white rounded-none hover:bg-white hover:text-black transition-none">
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Entrada</h1>
        </div>
        
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-white text-black hover:bg-[#00ff41] hover:text-black font-black uppercase rounded-none border-b-4 border-r-4 border-zinc-400 active:border-0 active:translate-y-1 active:translate-x-1 transition-none h-12 px-6">
              <Plus className="mr-2" /> Capturar
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0a0a0a] border-4 border-white rounded-none p-8 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter mb-4">Novo Input de Hardware</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTask} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Título do Registro *</Label>
                <Input 
                  value={newTask.titulo}
                  onChange={e => setNewTask({...newTask, titulo: e.target.value})}
                  maxLength={100}
                  required
                  className="bg-zinc-900 border-2 border-white rounded-none h-12 font-bold focus-visible:ring-0 focus:border-[#00ff41]"
                  placeholder="EX: FINALIZAR REFATORAÇÃO"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Recorrência</Label>
                  <Select value={newTask.recorrencia} onValueChange={v => setNewTask({...newTask, recorrencia: v})}>
                    <SelectTrigger className="bg-zinc-900 border-2 border-white rounded-none h-12 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-2 border-white text-white rounded-none">
                      <SelectItem value="none">Nenhuma</SelectItem>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Prioridade</Label>
                  <Select value={newTask.prioridade} onValueChange={v => setNewTask({...newTask, prioridade: v})}>
                    <SelectTrigger className={cn("bg-zinc-900 border-2 rounded-none h-12 font-bold", getPriorityColor(parseInt(newTask.prioridade)))}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-2 border-white text-white rounded-none">
                      <SelectItem value="1" className="text-[#ff0055] font-black">P1 - CRÍTICO</SelectItem>
                      <SelectItem value="2" className="text-[#ffaa00] font-black">P2 - ALTO</SelectItem>
                      <SelectItem value="3" className="text-[#00ccff] font-black">P3 - MÉDIO</SelectItem>
                      <SelectItem value="4" className="text-white font-black">P4 - BAIXO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Vencimento / Lembrete</Label>
                <Input 
                  type="date"
                  value={newTask.vencimento}
                  onChange={e => setNewTask({...newTask, vencimento: e.target.value})}
                  className="bg-zinc-900 border-2 border-white rounded-none h-12 font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Notas Adicionais</Label>
                <Textarea 
                  value={newTask.descricao}
                  onChange={e => setNewTask({...newTask, descricao: e.target.value})}
                  className="bg-zinc-900 border-2 border-white rounded-none min-h-[100px] font-bold focus:border-[#ff00ff]"
                  placeholder="..."
                />
              </div>

              <Button type="submit" className="w-full h-16 bg-[#00ff41] text-black font-black uppercase tracking-widest text-xl rounded-none border-b-8 border-r-8 border-green-900 active:border-0 transition-none">
                Salvar no Pipeline
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Triagem Section */}
      <section className="mb-12">
        <div className="border-4 border-white p-6 bg-zinc-950">
          <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-white mb-6 flex items-center gap-2">
            <AlertCircle size={14} className="text-[#ff00ff]" />
            REGISTRAR: Triagem de Atividades
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {triagemItems.map((item) => (
              <div key={item.num} className={cn("border-2 p-4 flex flex-col gap-1 transition-none", item.color)}>
                <span className="text-2xl font-black italic opacity-50">#{item.num}</span>
                <span className="font-black uppercase tracking-tighter text-sm">{item.label}</span>
                <span className="text-[9px] uppercase font-bold text-zinc-500">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-6">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <Card key={task.id} className="bg-zinc-950 border-2 border-white p-6 rounded-none flex items-center justify-between group hover:border-[#00ff41] transition-none relative overflow-hidden">
              {task.prioridade === 1 && (
                <div className="absolute top-0 left-0 w-1 h-full bg-[#ff0055]" />
              )}
              <div className="flex flex-col gap-2 flex-1 pr-4">
                <div className="flex items-center gap-3">
                  <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 border", getPriorityColor(task.prioridade))}>
                    P{task.prioridade || 4}
                  </span>
                  {task.repeticao !== 'none' && (
                    <span className="text-[9px] font-black uppercase bg-zinc-900 text-zinc-400 px-2 py-0.5 border border-zinc-800 flex items-center gap-1">
                      <Clock size={10} /> {task.repeticao === 'daily' ? 'DIÁRIO' : 'SEMANAL'}
                    </span>
                  )}
                  <h3 className="font-black text-xl uppercase italic tracking-tighter truncate">{task.titulo}</h3>
                </div>
                {task.descricao && (
                  <p className="text-zinc-500 text-[10px] font-bold uppercase leading-tight line-clamp-2">
                    {task.descricao}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[9px] font-black text-zinc-600 uppercase flex items-center gap-1">
                    <Calendar size={10} /> {task.data_execucao}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="bg-white text-black hover:bg-[#00ff41] text-[10px] font-black uppercase rounded-none border-b-2 border-r-2 border-zinc-300 h-10 px-4 transition-none"
                  onClick={() => moveTask(task.id, 'Hoje')}
                >
                  Hoje
                </Button>
                <Button 
                  size="sm" 
                  className="bg-zinc-900 text-zinc-500 hover:bg-white hover:text-black text-[10px] font-black uppercase rounded-none border-2 border-zinc-800 h-10 px-4 transition-none"
                  onClick={() => deleteTask(task.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="border-2 border-dashed border-zinc-800 p-20 text-center">
            <p className="text-zinc-700 font-black uppercase tracking-[0.5em] text-xs">Pipeline Vazio</p>
          </div>
        )}
      </div>
    </div>
  );
}
