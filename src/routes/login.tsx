import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/login')({
  component: Login,
});

function Login() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-zinc-950 border-zinc-900 rounded-[2.5rem] text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
            App Disponível
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-2">
            Modo Local Ativado. Sincronização offline completa.
          </p>
        </div>
        
        <Link to="/">
          <Button className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-lg hover:bg-zinc-200 transition-all">
            Acessar Painel
          </Button>
        </Link>
      </Card>
    </div>
  );
}
