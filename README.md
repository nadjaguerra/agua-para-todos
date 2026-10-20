# Água para Todos

Projeto técnico de Ciência de Dados para explorar atendimento pela rede de abastecimento e perdas de água em Pernambuco, com dados oficiais, interface web, modelagem e testes.

## Comece aqui: testar o site pronto

1. Extraia **todo o ZIP** para uma pasta no seu computador. Não execute de dentro do ZIP.
2. No Windows, dê dois cliques em **INICIAR_SITE.bat**. Requer Python 3 instalado, como no ambiente do JurisIA.
3. O navegador abre a versão pronta. Mantenha o terminal aberto enquanto utiliza o site.
4. Se a janela não abrir, use o endereço que aparece no terminal, normalmente `http://127.0.0.1:8765/`.
5. Para encerrar, pressione **Ctrl+C** no terminal.

Alternativa no terminal PowerShell do VS Code, aberto na pasta extraída:

```powershell
py -3 iniciar_site.py
```

Não abra `web/dist/index.html` por duplo clique: o navegador precisa carregar os arquivos JSON pelo servidor local. Não é necessário instalar Node.js ou bibliotecas científicas para testar a versão pronta. Mapa, dados, fontes de sistema e gráficos estão incluídos; os links para fontes oficiais exigem internet.

## O que está implementado

- Seis abas: Início, Mapa do Abastecimento, Comparar Municípios, Análise Estatística, Água e Cidadania, Metodologia e Dados.
- Mapa Leaflet com polígonos do IBGE, seleção municipal, três indicadores, recorte metropolitano e consulta separada de Fernando de Noronha.
- Tabela acessível, pesquisa sem acento, ordenação, exportação CSV e dados ausentes explícitos.
- Comparação entre duas localidades, diferenças em pontos percentuais, inversão e endereço compartilhável. Um endereço localhost só funciona em outro computador se a pessoa também executar uma cópia; publicação é necessária para um link público.
- Distribuições, regressão linear, análise fracional de sensibilidade, correlação de Spearman e diagnóstico espacial.
- Fontes, hashes, testes, relatório técnico e materiais de extensão planejada.

## Dados e limites

SINISA 2025, referência 2024: 179 dos 184 municípios presentes. Há 178 pares de atendimento e perdas. Gameleira, Iati, Inajá, Itambé e Jaqueira não constam da base; Quipapá tem atendimento não calculado. Essas lacunas permanecem explícitas. Fernando de Noronha está separado e tem registro.

Censo 2022, tabela SIDRA 6803: dados domiciliares para todas as 185 localidades. Os dados de 2022 não substituem os de 2024 e não integram o modelo operacional. Malha oficial simplificada para 185 localidades. Não há dados inventados, monitoramento ao vivo, previsão de falta de água, bairros, tubulações ou diagnósticos de potabilidade.

Testes automatizados e build estão documentados em `docs/verificacao.md`. A revisão visual em navegador real não foi executada neste ambiente. O roteiro `docs/roteiro_teste_usuario.md` orienta o teste no seu computador. Não se afirma ausência absoluta de erros.

## Reproduzir o tratamento e os modelos

Requer Python 3.11 ou mais recente. No PowerShell, dentro da pasta do projeto:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\python.exe -m agua.pipeline
.\.venv\Scripts\python.exe -m pytest -q
```

Os arquivos originais já estão incluídos. `python coletar_fontes.py` verifica sua presença e baixa fontes faltantes; não sobrescreve arquivos existentes. Os hashes da coleta original estão em `data/processed/sources.json`. Guarde-os ao fazer uma nova coleta: o fornecedor pode retificar os arquivos. Para atualizar o ano, ajuste e valide o pipeline; não basta trocar a data no site.

O comando `python -m agua.pipeline` escreve os resultados em `data/processed` e sincroniza `web/public/data`. Para regenerar o relatório e as figuras, execute `python scripts/gerar_relatorio.py` com o mesmo ambiente virtual. Após alterações de dados, revise o texto interpretativo e gere novamente o site com `npm run build`. O relatório é um documento da versão entregue: revise também as datas e conclusões após mudanças na análise.

## Desenvolver o front-end

Requer Node.js 20.19+ ou uma versão LTS compatível mais recente, com npm. No PowerShell:

```powershell
cd web
npm ci
npm test
npm run dev
```

Abra o endereço mostrado no terminal. Para gerar novamente a versão pronta:

```powershell
npm run build
cd ..
py -3 iniciar_site.py
```

Preact + Vite + Leaflet + Plotly.js. Dependências e versões exatas estão em `web/package-lock.json`. O projeto usa caminhos relativos e navegação por hash, compatíveis com subpastas no GitHub Pages. O pacote dos gráficos é carregado sob demanda.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `data/raw/` | Fontes oficiais preservadas |
| `data/processed/` | Base integrada, resultados, verificações e proveniência |
| `src/agua/pipeline.py` | Pipeline reproduzível, análise e modelo |
| `tests/` | Testes Python |
| `web/src/` | Código da interface |
| `web/tests/` | Testes de lógica e componentes no DOM simulado |
| `web/public/` | Dados e documentos distribuídos no site |
| `web/dist/` | Site compilado, pronto para o teste local |
| `docs/` | Descoberta, escopo, metodologia, resultados, testes e extensão |


