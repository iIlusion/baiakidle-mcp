# Extensão BaiakIdle MCP Bridge

Esta é a extensão MV3 que conecta a página do BaiakIdle ao servidor MCP local. O fluxo acontece em três camadas:

1. `page.js` roda no `MAIN world`, observa os WebSockets do jogo e mantém o buffer circular.
2. `content.js` relaya os eventos internos para a extensão.
3. `background.js` mantém `ws://127.0.0.1:8945/browser` fora da página.

O arquivo `page.js` é gerado por `npm run build:bridge`. Para alterar o hook, edite `src/userscript.ts` na raiz e compile novamente.

## Instalação

1. Na raiz do repositório, execute `npm run build`.
2. Abra `chrome://extensions` ou `brave://extensions`.
3. Ative o **Modo desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione esta pasta.
5. Inicie o servidor MCP conforme o [README principal](../README.md).
6. Recarregue `https://baiakidle.com/jogar/`.

Não use o userscript de produção ou o modo DEV do Tampermonkey junto com esta extensão. Dois hooks de WebSocket podem duplicar as capturas.
