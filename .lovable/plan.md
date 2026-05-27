## Problema
`parseNLP` retorna `finalTime` no formato `"15:00h"` (com o `h` no final). O `<input type="time">` exige formato estrito `HH:MM` e renderiza vazio (`--:--`) quando recebe valor inválido. Por isso o chip acende verde (lembrete é truthy) mas a hora não aparece.

## Correção
Em `src/utils/nlpParser.ts`, linha 58, remover o `h` do valor armazenado:

```ts
finalTime = `${hour}:${min}`;
```

E ajustar a linha 67 (que faz `finalTime.replace('h', '').split(':')`) — o replace vira no-op, mas pode ser simplificado para `finalTime.split(':')`.

Nenhuma outra mudança necessária — o `SmartInput` já chama `onParsed(date, time)`, e o `AddTaskOverlay` repassa direto para `setLembrete`, então com `"15:00"` válido o input passa a exibir corretamente.
