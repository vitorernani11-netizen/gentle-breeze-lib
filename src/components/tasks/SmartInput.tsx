import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { parseNLP } from '@/utils/nlpParser';
import { cn } from '@/lib/utils';

interface SmartInputProps {
  value: string;
  onChange: (val: string) => void;
  onParsed?: (date: Date | null, time: string | null) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}

export const SmartInput = ({
  value,
  onChange,
  onParsed,
  onSubmit,
  placeholder,
  className,
}: SmartInputProps) => {
  const [tokens, setTokens] = useState<string[]>([]);
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea para acompanhar o conteúdo (igual Todoist)
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    const result = parseNLP(value);
    const allTokens = result.tokens || [];
    setTokens(allTokens);

    // Filtra tokens que o usuário cancelou. Se TODOS os tokens detectados foram cancelados,
    // não envia data/hora. Caso contrário, envia normalmente.
    const activeTokens = allTokens.filter((t) => !cancelled.has(t.toLowerCase()));

    // Limpa do set tokens que sumiram do texto (usuário apagou a palavra)
    if (cancelled.size > 0) {
      const valueLower = value.toLowerCase();
      const stale = [...cancelled].filter((t) => !valueLower.includes(t));
      if (stale.length > 0) {
        setCancelled((prev) => {
          const next = new Set(prev);
          stale.forEach((t) => next.delete(t));
          return next;
        });
      }
    }

    if (onParsed) {
      if (activeTokens.length === 0 && allTokens.length > 0) {
        onParsed(null, null);
      } else {
        onParsed(result.date, result.detectedData?.time || null);
      }
    }
  }, [value, cancelled]);

  const toggleToken = (token: string) => {
    const key = token.toLowerCase();
    setCancelled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  // Sincroniza scroll do highlight com o textarea (caso role)
  const handleScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const renderText = () => {
    if (!value) {
      return <span className="text-zinc-600 font-normal">{placeholder}</span>;
    }
    const validTokens = tokens.filter((t) => t.trim().length > 0);
    if (validTokens.length === 0) {
      return <span className="text-white">{value}</span>;
    }

    const escapedTokens = validTokens.map((t) =>
      t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
    );
    const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
    const parts = value.split(regex);

    return (
      <>
        {parts.map((part, i) => {
          const isToken = validTokens.some(
            (t) => t.toLowerCase() === part.toLowerCase()
          );
          if (isToken) {
            const isCancelled = cancelled.has(part.toLowerCase());
            return (
              <span
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggleToken(part);
                }}
                className={cn(
                  'rounded-sm transition-colors duration-200 pointer-events-auto cursor-pointer',
                  !isCancelled && 'bg-[#00ff41]/20 text-[#00ff41]'
                )}
                style={isCancelled ? { color: 'inherit' } : undefined}
              >
                {part}
              </span>
            );
          }
          return (
            <span key={i} className="text-white">
              {part}
            </span>
          );
        })}
      </>
    );
  };

  return (
    <div className="relative w-full">
      <div
        ref={highlightRef}
        aria-hidden
        className={cn(
          'absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden',
          className
        )}
        style={{ backgroundColor: 'transparent', borderColor: 'transparent' }}
      >
        {renderText()}
        {/* trailing space para o cursor encostar no fim da linha */}
        {'\u200b'}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        rows={1}
        style={{
          color: 'transparent',
          caretColor: 'white',
          resize: 'none',
          overflow: 'hidden',
        }}
        className={cn(
          'w-full bg-transparent outline-none focus:outline-none relative whitespace-pre-wrap break-words',
          'selection:bg-white/20 selection:text-transparent',
          className
        )}
        placeholder=""
      />
    </div>
  );
};
