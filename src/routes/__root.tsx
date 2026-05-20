import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
  useNavigate
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalAddTask } from "@/components/tasks/GlobalAddTask";
import { useTaskActions } from "@/hooks/useTaskActions";
import { persistToHardware, hasUnsavedChanges } from "@/lib/storage";
import { Save } from "lucide-react";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "Focus" },
      { name: "theme-color", content: "#000000" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/pwa-192x192.png" },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [hasSession, setHasSession] = useState(true);
  const { checkAndRouteRecurringTasks } = useTaskActions();
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Forçamos a sessão como true para o único usuário do app
      setHasSession(true);
      setIsAuthChecking(false);
      checkAndRouteRecurringTasks();
    };

    checkAuth();

    const handleStorageUpdate = () => {
      setIsDirty(hasUnsavedChanges());
    };

    window.addEventListener('storage_update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    
    return () => {
      window.removeEventListener('storage_update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  if (isAuthChecking) return null;

  return (
    <QueryClientProvider client={queryClient}>
      {hasSession && <AppSidebar />}
      <div className="flex flex-col min-h-screen">
        <Outlet />
      </div>
      <GlobalAddTask />
      
      {isDirty && (
        <button
          onClick={() => {
            persistToHardware();
            setIsDirty(false);
          }}
          className="fixed bottom-6 right-6 z-[100] bg-[#00ff41] text-black font-black px-6 py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 uppercase tracking-tighter text-sm italic animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <Save size={18} strokeWidth={3} />
          Salvar Alterações
        </button>
      )}

      <Toaster position="top-center" theme="dark" />
    </QueryClientProvider>
  );
}
