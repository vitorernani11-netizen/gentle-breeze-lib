Vou corrigir especificamente o modal **ENTRADA / DETALHES** para impedir que Data, Hora e Prioridade fiquem por cima do texto da descrição.

Plano de correção:

1. Transformar a área de descrição em um bloco fixo de altura controlada, como na segunda imagem.
2. Remover o auto-redimensionamento da descrição, porque ele ainda está empurrando/atravessando o layout visual.
3. Colocar Data, Hora e Prioridade dentro do fluxo normal abaixo da descrição, sem sobreposição visual.
4. Garantir que a descrição tenha rolagem interna própria quando o texto for grande.
5. Ajustar o layout mobile para que o bloco fique acima de **SUB-TAREFAS** e não invada os cards.

Detalhe técnico:
- A mudança será em `src/components/tasks/TaskDetailModal.tsx`.
- A descrição deixará de usar altura dinâmica e passará a usar um container fixo com `overflow-y-auto`.
- Os metadados ficarão fora da área rolável interna da descrição, separados por espaçamento real no layout.