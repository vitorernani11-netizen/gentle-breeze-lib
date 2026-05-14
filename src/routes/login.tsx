import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export const Route = createFileRoute('/login')({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: '/' });
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    console.log(`Iniciando ${isSignUp ? 'cadastro' : 'login'} para:`, email);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        
        if (error) throw error;
        
        if (data.user && data.session) {
          toast.success('Conta criada e logada!');
          navigate({ to: '/' });
        } else {
          toast.success('Cadastro realizado! Verifique seu e-mail (se necessário).');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) {
          toast.success('Bem-vindo de volta!');
          navigate({ to: '/' });
        }
      }
    } catch (error: any) {
      console.error('Erro de autenticação:', error);
      toast.error(error.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-zinc-950 border-zinc-900 rounded-[2.5rem] text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
            App Disponível
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-2">
            Login removido conforme solicitado.
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
