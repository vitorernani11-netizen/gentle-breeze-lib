/**
 * usePWARegister
 *
 * Registra manualmente o Service Worker (/sw.js).
 * O vite-plugin-pwa injeta o script em index.html, mas TanStack Start
 * usa SSR e não tem index.html estático — então a auto-injeção não funciona.
 * Este hook garante que o SW seja registrado em qualquer ambiente.
 */
import { useEffect } from 'react';

export function usePWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        // Verifica se já existe um SW registrado
        const existing = await navigator.serviceWorker.getRegistration('/');
        if (existing) {
          console.log('[PWA] SW já ativo:', existing.scope);
          // Envia schedules de notificação ao SW existente
          existing.active?.postMessage({ type: 'CHECK_NOW' });
          return;
        }

        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none', // Sempre verifica por atualizações
        });

        console.log('[PWA] Service Worker registrado com sucesso:', reg.scope);

        // Quando encontra novo SW, ativa imediatamente (sem esperar fechar todas as abas)
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] Nova versão disponível — ativando...');
              newSW.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      } catch (err) {
        console.error('[PWA] Falha ao registrar SW:', err);
      }
    };

    // Garante que o SW só é registrado após o carregamento completo da página
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);
}
