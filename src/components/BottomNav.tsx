import { Link } from "@tanstack/react-router";
import { CheckSquare, DollarSign, Calendar, User } from "lucide-react";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-md pb-safe">
      <div className="flex justify-around items-center h-16">
        <Link 
          to="/" 
          className="flex flex-col items-center justify-center space-y-1 text-muted-foreground [&.active]:text-foreground transition-none"
        >
          <Calendar size={20} />
          <span className="text-[10px] font-medium">Check-in</span>
        </Link>
        <Link 
          to="/tasks" 
          className="flex flex-col items-center justify-center space-y-1 text-muted-foreground [&.active]:text-foreground transition-none"
        >
          <CheckSquare size={20} />
          <span className="text-[10px] font-medium">Tarefas</span>
        </Link>
        <Link 
          to="/finance" 
          className="flex flex-col items-center justify-center space-y-1 text-muted-foreground [&.active]:text-foreground transition-none"
        >
          <DollarSign size={20} />
          <span className="text-[10px] font-medium">Financeiro</span>
        </Link>
        <Link 
          to="/profile" 
          className="flex flex-col items-center justify-center space-y-1 text-muted-foreground [&.active]:text-foreground transition-none"
        >
          <User size={20} />
          <span className="text-[10px] font-medium">Perfil</span>
        </Link>
      </div>
    </nav>
  );
}
