# Publicação no GitHub Pages — opcional, não executada

A entrega atual é local. O site é estático, usa caminhos relativos e navegação por hash. O GitHub Pages não executa o pipeline Python: os resultados são processados antes do build.

1. Crie um repositório próprio e envie o código, os dados e o lockfile, preservando o `.gitignore`. Não envie `.venv` ou `node_modules`.
2. Nas configurações do repositório, escolha GitHub Actions como fonte do Pages.
3. Execute manualmente o workflow `Publicar Água para Todos` na aba Actions.
4. Verifique o resultado e o endereço emitido pelo GitHub.

O workflow só usa os arquivos já processados de `web/public`. Se você mudar os dados, execute o pipeline local, revise os resultados e a documentação, teste e envie os arquivos antes de publicar.

Guia oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

Não inclua respostas identificáveis, credenciais ou registros privados em um repositório público.
