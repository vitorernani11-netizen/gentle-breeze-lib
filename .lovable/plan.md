## Objetivo
Fazer o campo de horário (circulado em vermelho no print) exibir a hora detectada pelo SmartInput (ex: `15:00`) e ficar verde neon quando ativo, igual ao chip de data "29 MAI".

## Mudança única em `src/components/tasks/AddTaskOverlay.tsx`

Substituir o bloco atual do `<input type="time">` (cerca das linhas 144–152) por um container estilizado condicionalmente:

- Quando `lembrete` tiver valor → borda e texto verde `#00ff41`, fundo `#00ff41/5`, mesma classe do botão de data ativo.
- Quando `lembrete` estiver vazio → estilo neutro atual (`border-zinc-900 bg-zinc-900/50`).
- Adicionar um ícone `Clock` (já importado) à esquerda do input, igual o `CalendarIcon` no chip de data.
- O `<input type="time">` continua controlado por `lembrete` / `setLembrete`, mas com `color` herdada (verde quando ativo) e largura ajustada para mostrar `HH:MM` sem cortes.

### Detalhe técnico

```tsx
<div className={cn(
  "flex items-center gap-2 h-12 px-4 rounded-2xl border bg-zinc-900/50 transition-all",
  lembrete
    ? "text-[#00ff41] border-[#00ff41]/30 bg-[#00ff41]/5"
    : "border-zinc-900 text-white"
)}>
  <Clock size={20} />
  <input
    type="time"
    value={lembrete || ''}
    onChange={(e) => setLembrete(e.target.value || null)}
    className="bg-transparent border-none text-xs font-bold uppercase focus:ring-0 p-0 w-16 text-current [color-scheme:dark]"
  />
</div>
```

Como o `SmartInput` já chama `setLembrete(time)` via `onParsed` quando detecta "as 15h", o chip passa a acender em verde automaticamente assim que o usuário digita o horário na frase — espelhando o comportamento do chip de data.

Nenhuma outra lógica (parser, submit, estados) é alterada.
