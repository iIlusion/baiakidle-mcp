# BaiakIdle MCP Bridge

Uma bridge local para inspecionar a página do [BaiakIdle](https://baiakidle.com/jogar/) usando um cliente MCP, como o Codex.

O projeto tem duas partes:

- uma extensão Chrome/Brave que observa o WebSocket do jogo dentro de `/jogar/`;
- um servidor Node.js que expõe essa sessão como ferramentas MCP via stdio.

A automação do jogo fica no projeto separado [BaiakIdle Helper](https://github.com/iIlusion/baiakidle-helper). Esta bridge cuida do transporte, da inspeção e das chamadas que você solicitar.

## Como funciona

A página não abre conexão com o localhost. O hook roda no `MAIN world`, envia apenas eventos internos para o content script e o service worker mantém a conexão local:

```text
/jogar/ (page.js, MAIN)
    ring buffer + WebSocket do jogo
              │ CustomEvent
content.js (ISOLATED)
              │ runtime port
background.js (service worker)
              │ ws://127.0.0.1:8945/browser
MCP Node.js (stdio)
```

Os pacotes são mantidos em um buffer circular na própria página. O MCP faz pull quando uma ferramenta é chamada; não há push contínuo, telemetria ou gravação de capturas em arquivo.

## Requisitos

- Node.js 20 ou mais recente;
- npm;
- Chrome ou Brave com o modo desenvolvedor habilitado;
- Codex ou outro cliente compatível com servidores MCP via stdio.

## Instalação

### 1. Baixe e compile

No PowerShell, Prompt de Comando ou terminal:

```bash
git clone https://github.com/iIlusion/baiakidle-mcp.git
cd baiakidle-mcp
npm ci
npm --prefix mcp-server ci
npm run build
```

O build gera o servidor em `mcp-server/dist/`, os bundles de userscript em `dist/` e o `page.js` usado pela extensão.

### 2. Carregue a extensão

1. Abra `chrome://extensions` (ou `brave://extensions`).
2. Ative **Modo desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta `mcp-extension` dentro do repositório.

O `page.js` dessa pasta é gerado pelo build. Não o edite manualmente; altere `src/userscript.ts` e compile de novo.

### 3. Configure o cliente MCP

Adicione o servidor ao `config.toml` do Codex. Troque o caminho pelo local absoluto do clone:

```toml
[mcp_servers.baiakidle-page-bridge]
command = "node"
args = ["C:/caminho/baiakidle-mcp/mcp-server/dist/index.js"]
startup_timeout_sec = 60
```

No Windows, use `/` no caminho ou escape as barras invertidas no TOML. Reinicie o Codex depois de salvar a configuração.

### 4. Abra o jogo

Abra ou recarregue completamente `https://baiakidle.com/jogar/`. No console da página, a bridge ativa informa a versão e `ext-transport`.

Para uma checagem rápida, abra `http://127.0.0.1:8945/status`. O campo `browserConnected` deve ficar `true` com o jogo aberto.

## Ferramentas disponíveis

| Ferramenta | O que faz |
| --- | --- |
| `bridge_status` | Mostra o estado do transporte e um snapshot leve da página. |
| `probe` | Combina HUD, pacotes recentes e uma consulta DOM opcional. |
| `packets_get` | Lê o buffer circular de pacotes. Alias: `list_events`. |
| `packets_clear` | Limpa o buffer da página. Alias: `clear_events`. |
| `list_packet_headers` | Lista o catálogo local de mensagens Colyseus. |
| `dom_query` | Consulta elementos por seletor CSS. Alias: `inspect_selector`. |
| `dom_eval` | Executa JavaScript no contexto da página. |
| `get_page_snapshot` | Retorna URL, HUD e sockets observados, sem HTML completo. |
| `reload_page` | Recarrega a página do jogo. |
| `send_packet` | Envia um pacote Base64 pelo socket de gameplay. Alias: `send_raw_packet`. |

Exemplo de filtro para `packets_get`:

```json
{ "limit": 30, "msgTypes": ["notify", "sellall", "sellcd"], "categories": ["economy"] }
```

O catálogo reconhece nomes de mensagem Colyseus depois do frame `0x0d` (`ROOM_DATA`). A bridge classifica os sockets pelos sinais observados, sem depender de um hostname fixo como `rt3` ou `rt4`.

## Atualização

Depois de atualizar o clone:

```bash
git pull
npm ci
npm --prefix mcp-server ci
npm run build
```

Na página de extensões, clique em **Recarregar** na BaiakIdle MCP Bridge e faça uma recarga completa do jogo. Se o cliente MCP ainda estiver aberto, reinicie-o quando o executável do servidor tiver mudado.

## Desenvolvimento

Comandos principais:

```bash
npm run dev          # watch do bundle DEV e servidor local na porta 8947
npm run build        # bridge + servidor MCP
npm run build:bridge # bundles da bridge e cópia para mcp-extension
npm run build:mcp    # servidor Node.js
npm run typecheck    # valida os dois projetos TypeScript
npm test             # smoke test do servidor WS/RPC
```

O modo `npm run dev` é opcional e serve o userscript DEV em `127.0.0.1:8947` para quem estiver desenvolvendo o hook com Tampermonkey. Não use o userscript de produção ou o DEV junto com a extensão: dois hooks de WebSocket geram capturas duplicadas.

## Segurança e privacidade

- O servidor escuta somente em `127.0.0.1`.
- O WebSocket aceita a extensão do navegador; o endpoint HTTP não libera CORS para sites arbitrários.
- A bridge limita o tamanho de frames, requisições RPC e tempo de espera.
- Capturas ficam em memória e podem conter dados da sessão ou da página; não publique dumps do navegador.
- `dom_eval`, `reload_page` e `send_packet` têm efeitos reais. Use-os apenas na sua própria conta e com um cliente MCP confiável.

Este é um projeto independente e não possui vínculo oficial com o BaiakIdle.

## Solução de problemas

### `browserConnected` está `false`

Confirme que o servidor MCP foi iniciado, que a extensão está habilitada e que o caminho configurado aponta para `mcp-server/dist/index.js`. Depois, recarregue a extensão e a página `/jogar/`.

### A extensão não aparece no jogo

Verifique se a pasta selecionada foi exatamente `mcp-extension`, se o modo desenvolvedor está ativo e se a URL é `https://baiakidle.com/jogar/`. Uma recarga completa da página é necessária depois de recompilar.

### Os pacotes não aparecem

Desative qualquer userscript antigo da BaiakIdle MCP Bridge. O hook precisa entrar em `document-start`; abra a página com a extensão já carregada e confira no console se aparece `ext-transport`.

### O modo DEV não carrega

Execute `npm run dev`, confirme que `127.0.0.1:8947` está acessível e instale somente `dist/baiakidle-bridge.dev.user.js` no Tampermonkey. Esse modo é exclusivo para desenvolvimento.

## Licença

[MIT](LICENSE)
