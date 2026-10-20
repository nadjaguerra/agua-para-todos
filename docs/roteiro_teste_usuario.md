# Roteiro para você testar

Execute `INICIAR_SITE.bat` e mantenha o terminal aberto. Registre sistema, navegador e tamanho da tela. Os itens abaixo são um roteiro, não uma declaração de que foram executados por você.

| Teste | Resultado esperado |
|---|---|
| Abrir o site | Página inicial sem erro; seis abas visíveis no computador |
| Abrir Mapa | Contornos municipais e legenda aparecem |
| Selecionar Recife | Atendimento 78,9% e perdas 44,2% na apresentação arredondada; fonte 2024 |
| Selecionar Quipapá | Atendimento sem dados, com motivo; perdas 15,7% |
| Selecionar Gameleira | SINISA ausente, mas contexto domiciliar de 2022 disponível |
| Filtrar RMR | 14 municípios no seletor e tabela |
| Filtrar Fernando de Noronha | Distrito separado, com mapa enquadrado na ilha |
| Buscar `sao lourenco` | São Lourenço da Mata, mesmo sem acento |
| Buscar texto inexistente | Mensagem de nenhum resultado |
| Trocar para domicílios sem ligação | Ano 2022 destacado e escala roxa |
| Recife x Olinda | Diferença de atendimento: Recife 6,94 p.p. abaixo |
| Inverter os municípios | A diferença passa a Olinda 6,94 p.p. acima |
| Comparar o mesmo município | Aviso e diferenças zero nos valores disponíveis |
| Baixar CSV | Arquivo contém seleção, anos, valores e motivos de ausência |
| Atualizar a página de comparação | Os municípios escolhidos continuam no endereço |
| Abrir Análise Estatística | Dispersão, distribuições e resíduos aparecem ao selecionar suas opções |
| Ler análise | Associação fraca e limite espacial estão explícitos |
| Abrir downloads da metodologia | Relatório, fontes e dados abrem/baixam |
| Reduzir a janela para celular | Menu compacto, cartões e painéis empilhados; tabelas com rolagem |
| Usar Tab e Enter | Acesso a menu, seletores e botões; indicador de foco visível |
| Desligar internet após abrir localmente | Dados, gráficos e mapa continuam locais; fontes externas não abrem |

Se houver problema, informe a aba, a ação, o município/indicador, a mensagem exibida e, se possível, uma captura. Não classificar o teste pela autora como validação externa ou ação de extensão.
