# Verificação e limites — 20/10/2026

## Executado

| Verificação | Resultado |
|---|---|
| Integridade do ZIP oficial | Arquivo válido |
| Unicidade e integração territorial | 185 localidades no cadastro e na malha; sem duplicação de códigos |
| Junção das bases municipais SINISA | 180 registros em cada base, relação um para um |
| Recálculo das fórmulas | 359 de 359 compatíveis, tolerância 0,011 ponto percentual |
| Categorias do Censo | 185 de 185 somas conferidas |
| Testes Python | 23 passaram |
| Testes JavaScript e componentes | 14 passaram |
| Build Vite de produção | Compilação concluída |

Os testes JavaScript usam o executor do Node e JSDOM. Cobrem navegação pelas seis abas, seleção, filtros, ausência versus zero, links, exportação, diferenças em pontos percentuais e Leaflet desenhando 184 polígonos, clique municipal e mudança para 14 polígonos da RMR. O teste do mapa emula dimensões de tela e suporte SVG; não é uma inspeção visual do mapa real.

Os testes Python verificam regras de integração, indicadores conhecidos, valores ausentes, consistência censitária, elegibilidade do modelo, cálculo independente de mínimos quadrados, correlação por postos, reprodutibilidade espacial e sincronização dos arquivos.

## Não executado neste ambiente

- Revisão visual em Chrome, Edge, Firefox ou Safari reais.
- Renderização interativa real do Plotly e exportação de imagens pelo navegador.
- Teste de ponta a ponta em Windows com duplo clique no BAT.
- Teste em dispositivo móvel real, leitor de tela ou auditoria formal de acessibilidade.
- Publicação do workflow no GitHub Pages.
- Avaliação com participantes, entrevistas ou oficina de extensão.

Há CSS responsivo, controles nativos, foco visível, rótulos e tabela alternativa ao mapa; isso não equivale a certificação de acessibilidade. O roteiro de teste local está em `roteiro_teste_usuario.md`.

## Dados não obtidos ou não presentes

Gameleira, Iati, Inajá, Itambé e Jaqueira: sem linha na base municipal SINISA de referência 2024 utilizada. Quipapá: atendimento não calculado na fonte. Não houve imputação. O Censo 2022 cobre essas localidades com um indicador diferente.

Dados de bairros, tubulações, vazamentos específicos, continuidade em tempo real e potabilidade não fazem parte das fontes desta versão. Não há série histórica harmonizada, dados de renda nem índice composto de vulnerabilidade. Essas funcionalidades foram excluídas do escopo técnico inicial, sem resultados simulados em seu lugar.

## Limites científicos

A checagem confirma consistência interna, não a veracidade de todas as declarações. O modelo é exploratório: a associação encontrada é fraca e existe dependência espacial residual. Valores-p e intervalos são nominais; não sustentam conclusões causais ou garantias de desempenho preditivo.
