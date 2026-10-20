# Dicionário da base integrada

Unidade: uma localidade por linha. A base mantém 184 municípios e Fernando de Noronha. JSON: números ausentes são `null`. CSV: células numéricas ausentes ficam vazias. Nomes e códigos do cadastro oficial IBGE. Códigos são identificadores textuais de sete dígitos.

| Campo | Tipo / unidade | Definição |
|---|---|---|
| id | texto | Código IBGE |
| name | texto | Nome no cadastro IBGE |
| district | booleano | Verdadeiro somente para Fernando de Noronha |
| rmr | booleano | Classificação RM de Recife na base SINISA |
| available | booleano | Existência de registro nesta base municipal SINISA |
| year | inteiro | Referência operacional 2024 |
| atendimento | percentual 0–100 ou nulo | SINISA IAG0001: atendimento da população total pela rede |
| perdas | percentual 0–100 ou nulo | SINISA IAG2013: perdas totais na distribuição |
| urbano | percentual ou nulo | SINISA IAG0002 |
| rural | percentual ou nulo | SINISA IAG0003 |
| atendimentoStatus | texto ou nulo | Motivo da ausência; nulo quando o valor é válido |
| perdasStatus | texto ou nulo | Motivo da ausência; nulo quando o valor é válido |
| population | habitantes ou nulo | DFE0001 contido no SINISA, denominador utilizado pela fonte |
| provider | texto ou nulo | Prestador informado na base histórica, sem atribuição à gestão atual |
| censusYear | inteiro | Referência domiciliar 2022 |
| households2022 | domicílios | SIDRA 6803, variável 381, categoria 72129 |
| householdsWithoutNetwork2022 | domicílios | SIDRA 6803, variável 381, categoria 72153 |
| semRede2022 | percentual 0–100 | 100 × householdsWithoutNetwork2022 / households2022 |

## Fórmulas conferidas

IAG0001 = 100 × (GTA0001 + GTA0002) / DFE0001.

IAG2013 = 100 × (GTA1001 + GTA1009 − GTA1207 − GTA1211 − GTA1203) / (GTA1001 + GTA1009).

Campos GTA são utilizados conforme a base técnica e nota metodológica SINISA 2024. Não transportar a fórmula de um indicador histórico SNIS sem conferir sua definição. Os dados brutos e a nota metodológica estão no ZIP original.

## Censo: identidade conferida

Categoria 72129 (total) = 72144 (ligação à rede usada como forma principal) + 72145 (ligação à rede com outra forma principal) + 72153 (sem ligação). São categorias de mesmo nível, sem dupla contagem das subcategorias.

## Qualidade

Um número válido deve ser finito e estar no intervalo admissível do indicador selecionado. Valores fora desse intervalo são sinalizados, não truncados. Não houve valores numéricos fora de 0–100 nos quatro indicadores SINISA selecionados de Pernambuco. A ausência do indicador não implica valor zero ou inexistência de serviço. A classificação RMR é preservada da fonte; não foi reconstruída por coordenadas.
