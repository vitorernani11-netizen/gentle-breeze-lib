import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Archive, Plus, ArrowLeft, Search, Folder, Book, Lightbulb, ClipboardList } from 'lucide-react';
import { loadFromLocal } from '@/lib/storage';
import { cn } from '@/lib/utils';

const VAULT_KEY = 'hardware_humano_vault';
const PROJECTS_KEY = 'hardware_humano_projects';

export const Route = createFileRoute('/vault')({
  component: VaultPage,
});

function VaultPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchVaultData();
    const handleStorageChange = () => fetchVaultData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchVaultData = () => {
    setLoading(true);
    const vaultData = loadFromLocal(VAULT_KEY) || [];
    const projectsData = loadFromLocal(PROJECTS_KEY) || [];
    setItems(vaultData);
    setProjects(projectsData);
    setLoading(false);
  };

  const categories = [
    { id: 'notes', label: 'Notas', icon: ClipboardList, color: 'text-blue-400' },
    { id: 'lists', label: 'Listas', icon: Folder, color: 'text-yellow-400' },
    { id: 'reading', label: 'Leitura', icon: Book, color: 'text-green-400' },
    { id: 'ideas', label: 'Ideias', icon: Lightbulb, color: 'text-purple-400' },
  ];

  const filteredItems = items.filter(item => 
    item.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.conteudo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20 font-sans">
      <header className="mb-10">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate({ to: '/' })} 
            className="border border-zinc-800 rounded-xl hover:bg-zinc-900 transition-all w-10 h-10 shrink-0"
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center gap-2 text-zinc-400">
            <Archive size={18} />
            <h1 className="text-2xl font-black uppercase tracking-tight italic">Cofre de Memória</h1>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text"
            placeholder="BUSCAR NO HARDWARE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border-2 border-zinc-900 h-14 pl-12 pr-4 rounded-xl font-bold text-sm focus:outline-none focus:border-white transition-all uppercase tracking-widest"
          />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-10">
        {categories.map((cat) => (
          <Card key={cat.id} className="p-6 bg-zinc-950 border-2 border-white rounded-none hover:bg-zinc-900 transition-all cursor-pointer group active:translate-y-1">
            <cat.icon className={cn("mb-4 h-8 w-8 group-hover:scale-110 transition-transform", cat.color)} />
            <h3 className="text-sm font-black uppercase tracking-widest">{cat.label}</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">
              {items.filter(i => i.categoria === cat.id).length} itens
            </p>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4 px-2">Registros Recentes</h2>
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <Card key={item.id} className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl hover:border-zinc-700 transition-all">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-lg uppercase tracking-tight">{item.titulo}</h4>
                <span className="text-[8px] bg-zinc-900 px-2 py-0.5 rounded font-black uppercase tracking-widest text-zinc-500">
                  {item.categoria}
                </span>
              </div>
              <p className="text-sm text-zinc-400 line-clamp-2 font-medium">{item.conteudo}</p>
              {item.projeto_id && (
                <div className="mt-3 pt-3 border-t border-zinc-900 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-zinc-700" />
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    {projects.find(p => p.id === item.projeto_id)?.nome || 'Projeto Desconhecido'}
                  </span>
                </div>
              )}
            </Card>
          ))
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-zinc-900 rounded-2xl">
            <Archive size={40} className="mx-auto mb-4 text-zinc-900" />
            <p className="text-zinc-700 font-black uppercase tracking-widest text-xs">Cofre Vazio</p>
          </div>
        )}
      </div>
    </div>
  );
}