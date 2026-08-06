# BaiakIdle MCP

Bridge local para analisar a página do [BaiakIdle](https://baiakidle.com/jogar/) com um cliente MCP como o Codex. O projeto reúne somente:

- uma extensão Tampermonkey que observa a página, fetch/XHR e WebSockets desde a criação;
- um servidor MCP Node.js que expõe as capturas e comandos ao cliente.

A automação de jogo fica no projeto separado [baiakidle-helper](https://github.com/iIlusion/baiakidle-helper).

## Como funciona

```text
BaiakIdle no navegador
        │
        │ userscript: DOM + fetch/XHR + WebSocket
        ▼
Bridge local 127.0.0.1:8945
        │
        │ MCP via stdio
        ▼
Codex / outro cliente MCP
```

A comunicação entre a extensão e o servidor usa exclusivamente WebSocket em `127.0.0.1:8945/browser`. Não há fallback HTTP nem exposição na rede.

## Requisitos

- Node.js 20 ou mais recente;
- npm;
- Tampermonkey com **Allow User Scripts** habilitado;
- Codex ou outro cliente compatível com MCP via stdio.

## Instalação

```bash
git clone https://github.com/iIlusion/baiakidle-mcp.git
cd baiakidle-mcp
npm install
npm --prefix mcp-server install
npm run build
```

Depois:

1. [Instale a bridge no Tampermonkey](https://raw.githubusercontent.com/iIlusion/baiakidle-mcp/main/dist/baiakidle-bridge.user.js).
2. Adicione o servidor ao arquivo `config.toml` do Codex, usando o caminho absoluto da sua cópia:

```toml
[mcp_servers.baiakidle-page-bridge]
command = "node"
args = ["C:/caminho/baiakidle-mcp/mcp-server/dist/index.js"]
startup_timeout_sec = 60
```

3. Reinicie o Codex por completo.
4. Abra ou recarregue `https://baiakidle.com/jogar/`.
5. Confirme no console do navegador: `[BaiakIdle monitor] bridge connected`.

No Windows, use barras `/` ou duplique as barras invertidas no TOML. O executável indicado em `args` é gerado por `npm run build`.

## Ferramentas MCP

| Ferramenta | Finalidade |
| --- | --- |
| `bridge_status` | Estado da bridge, porta, quantidade de eventos e fila de comandos |
| `list_events` | Eventos recentes da página, fetch/XHR, inventário e WebSockets |
| `clear_events` | Limpa as capturas mantidas em memória |
| `get_page_snapshot` | HTML, texto visível, links, formulários, scripts e viewport atuais |
| `inspect_selector` | Elementos, texto, HTML e posição encontrados por seletor CSS |
| `reload_page` | Recarrega a página monitorada |
| `send_raw_packet` | Envia bytes Base64 pelo WebSocket de gameplay identificado |

Os frames binários são registrados em Base64. A bridge classifica automaticamente sockets de chat e gameplay pelos sinais observados, então não depende de um hostname fixo como `rt3` ou `rt4`.

## Desenvolvimento

Os userscripts gerados ficam exclusivamente em `dist/`:

- `dist/baiakidle-bridge.user.js`: produção;
- `dist/baiakidle-bridge.dev.user.js`: loader de desenvolvimento.

Para editar a extensão continuamente:

1. Execute `npm run build` uma vez e instale `dist/baiakidle-bridge.dev.user.js`.
2. Desative a bridge de produção no Tampermonkey.
3. Execute:

```bash
npm run dev
```

O bundle recompila em watch mode e é servido em `http://127.0.0.1:8947`. Recarregar a página busca a versão atual sem reinstalar o userscript. A porta `8947` foi separada da porta `8946` usada pelo modo de desenvolvimento do Helper.

Comandos:

```bash
npm run dev             # bridge em watch mode + servidor local 8947
npm run build           # compila bridge e servidor MCP
npm run build:bridge    # compila apenas os userscripts
npm run build:mcp       # compila apenas o servidor Node.js
npm run typecheck       # valida os dois projetos TypeScript
```

## Eventos e configuração

As últimas 2.000 capturas ficam somente em memória e são descartadas quando o servidor MCP encerra. Nenhum pacote é gravado em arquivo.

A porta pode ser alterada com `BAIAKIDLE_BRIDGE_PORT`; mantenha o mesmo valor no userscript. Para diagnosticar apenas o transporte local, abra `http://127.0.0.1:8945/status` enquanto o servidor estiver ativo.

## Solução de problemas

### A extensão mostra falha em `ws://127.0.0.1:8945/browser`

- confirme que o Codex iniciou o MCP e que o caminho no `config.toml` existe;
- execute `npm run build` novamente;
- verifique se outro processo já está usando a porta `8945`;
- reinicie o Codex e depois recarregue a página.

### O userscript DEV não carrega

Execute `npm run dev` neste repositório e confirme que a porta é `8947`. O loader DEV não usa a porta `8945` para servir JavaScript.

### Os WebSockets não aparecem

A bridge precisa executar em `document-start`. Confirme que o script está ativado, que **Allow User Scripts** está habilitado e faça uma recarga completa da página.

## Segurança e privacidade

As capturas em memória podem conter identificadores de sessão, conteúdo da página e dados enviados pelo jogo. Não publique logs ou dumps do navegador e revise sempre `git status` antes de fazer commit.

`send_raw_packet` modifica a sessão atual. Use apenas na sua própria conta, com pacotes que você compreende, e respeite as regras do jogo. Este é um projeto independente, sem vínculo oficial com BaiakIdle.

## Licença

[MIT](LICENSE)