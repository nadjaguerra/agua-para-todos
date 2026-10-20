# Arquitetura técnica

## Fluxo

Fontes oficiais → arquivos brutos preservados → validação e integração Python → análise/modelagem → JSON e CSV → interface estática Preact → testes.

O site não executa Python. Dados, geometrias e resultados são calculados previamente e incluídos no build. Não há banco de dados, API privada, chave, conta de usuário ou telemetria adicionada pelo projeto.

## Camada científica

`src/agua/pipeline.py`: leitura de planilhas com openpyxl, integração por código, checagens, NumPy/SciPy para estatística, Statsmodels para OLS/HC3 e GLM fracional. O mapa é GeoJSON oficial; não foi necessária dependência GeoPandas para operações de sobreposição ou reprojeção.

`scripts/gerar_relatorio.py`: gera relatório e figuras a partir dos resultados. Dados ausentes permanecem ausentes. As sementes de permutação são fixadas em 20261019.

## Front-end

Preact organiza componentes e estados. Vite compila. Leaflet desenha polígonos sem servidor de tiles, de modo que o mapa funcione com os arquivos locais. Plotly.js fornece gráficos carregados sob demanda. A URL usa hash para abas e seleções, sem exigir reescrita de rotas no servidor.

O CSV de seleção usa separador ponto e vírgula, aspas e BOM UTF-8; os números usam ponto decimal para interoperabilidade. Ao importar no Excel em português, selecione a localidade adequada ou defina o separador decimal. A base geral CSV usa vírgula como separador.

## Atualizações

Preservar o snapshot original e seus hashes. Uma nova coleta deve registrar novas datas, verificar mudanças metodológicas e gerar uma nova versão dos resultados. Depois do pipeline, regenerar o relatório, rodar testes e reconstruir a interface. A data de coleta original não deve ser reescrita automaticamente ao apenas reprocessar arquivos antigos.

## Distribuição

A entrega contém código, fontes, resultados e `web/dist`, sem ambientes virtuais ou node_modules. O iniciador Python serve apenas a pasta dist em 127.0.0.1. O workflow de publicação está preparado para acionamento manual e não foi executado.
