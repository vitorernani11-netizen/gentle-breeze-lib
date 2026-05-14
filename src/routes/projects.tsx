import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Layers, Folder, MoreVertical, Hash, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export const Route = createFileRoute('/projects')({
  component: Projects,
});

function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase
        .from('projetos')
        .select('*, tarefas(count)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setProjects(data);
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
    } finally {
      setLoading(false);
    }
  };

  const addProject = async () => {
    if (!newProjectName.trim()) return;
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão não encontrada');
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('projetos')
        .insert([{ 
          nome: newProjectName, 
          user_id: session.user.id,
          cor: '#' + Math.floor(Math.random()*16777215).toString(16)
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setProjects([data, ...projects]);
        setNewProjectName('');
        setShowAdd(false);
        toast.success('Projeto criado com sucesso');
        fetchProjects(); // Garantir que os contadores de tarefas estejam atualizados
      }
    } catch (error: any) {
      console.error('Erro ao criar projeto:', error);
      toast.error('Erro ao criar projeto: ' + (error.message || 'Falha na conexão'), {
        style: { background: '#7f1d1d', color: '#fff', border: 'none' }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })} className="transition-none -ml-3 text-zinc-500 hover:text-white">
              <ArrowLeft size={24} />
            </Button>
            <div className="flex items-center gap-2 text-purple-500">
              <Layers size={20} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Estrutura</span>
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Projetos</h1>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="icon" className="h-12 w-12 rounded-2xl bg-white text-black hover:bg-zinc-200 transition-none">
              <Plus size={24} />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-900 rounded-3xl p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">Novo Projeto</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <Input 
                placeholder="Nome do projeto" 
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="bg-zinc-900 border-none h-14 rounded-2xl px-6 font-bold text-lg focus-visible:ring-1 ring-zinc-700"
              />
              <Button onClick={addProject} className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-lg transition-none">
                Criar Projeto
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {projects.length > 0 ? (
          projects.map(project => (
            <Card key={project.id} className="p-6 bg-zinc-950 border-zinc-900 rounded-3xl flex items-center justify-between transition-none relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: project.cor }} />
              <div className="flex flex-col gap-1 pl-2">
                <span className="text-xl font-black tracking-tight group-hover:text-white transition-colors">{project.nome}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {project.tarefas?.[0]?.count || 0} Tarefas Ativas
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 text-zinc-700 hover:text-white hover:bg-zinc-800 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  // Ação de mais opções
                }}
              >
                <MoreVertical size={20} />
              </Button>
            </Card>
          ))
        ) : (
          <div className="text-center py-24 bg-zinc-950/50 rounded-3xl border border-dashed border-zinc-900">
            <Folder className="mx-auto mb-4 text-zinc-800" size={40} />
            <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">Organize seu mundo</p>
          </div>
        )}
      </div>
    </div>
  );
}
