# Conveniência Oliveira — Aplicativo Desktop

App instalável para Windows que roda o mesmo sistema da versão web, com duas diferenças
importantes para o cliente:

1. **Atualiza sozinho pelo GitHub.** Você continua trabalhando como sempre (edita e dá
   `git push`). Ao abrir, o app compara o último commit do repositório com o que tem
   instalado e baixa só os arquivos que mudaram. Não precisa reinstalar nada.
2. **Os dados locais ficam fora do navegador.** `localStorage` e `IndexedDB` passam a
   viver em `%APPDATA%\Conveniencia Oliveira`. Limpar o cache/histórico do Chrome não
   apaga mais nada do sistema.

O Supabase continua sendo o banco de dados — nada muda ali.

## Como funciona

```
GitHub (oliveiraconv/main)  ──baixa arquivos──►  %APPDATA%\...\webapp
                                                        │
                                        servidor local http://127.0.0.1:47821
                                                        │
                                                 janela do Electron
                                                        │
                                                 Supabase (nuvem)
```

O app sobe um servidor HTTP só no `127.0.0.1` (não fica exposto na rede) para que o
sistema rode em uma origem fixa. Isso é o que garante que a sessão, o `localStorage`
e os dados offline sejam sempre os mesmos entre reinicializações.

## Desenvolvimento

```bash
cd desktop
npm install
npm start
```

Em modo desenvolvimento o app serve os arquivos **do próprio repositório** (a pasta
acima de `desktop/`), então dá para editar `js/app.js` e apertar `Ctrl+R` para ver o
resultado na hora.

## Gerar o instalador

```bash
cd desktop
npm run dist
```

O instalador sai em `desktop/dist/Conveniencia-Oliveira-Setup-1.0.0.exe`. É esse
arquivo que você manda para o cliente instalar.

> O instalador não é assinado digitalmente. Na primeira execução o Windows SmartScreen
> mostra "Windows protegeu o computador" — basta clicar em **Mais informações →
> Executar assim mesmo**. Para eliminar esse aviso é preciso comprar um certificado de
> assinatura de código.

## Configuração

Tudo em `desktop/config.json`:

| Campo | O que faz |
|---|---|
| `github.owner` / `github.repo` / `github.branch` | De onde vêm as atualizações |
| `server.port` | Porta do servidor local (padrão `47821`) |
| `update.checkOnStartup` | Verificar atualizações ao abrir |
| `update.intervalMinutes` | Verificação periódica com o app aberto (padrão 30 min) |
| `update.paths` | Quais arquivos/pastas do repositório fazem parte do app |

Só o que está em `update.paths` é baixado — backups, `.zip`, `docs/` e os arquivos
grandes do repositório ficam de fora.

## Uso no dia a dia

- **Sistema → Verificar atualizações** (`Ctrl+U`): força a busca por atualizações.
- **Sistema → Sobre**: mostra a revisão instalada, a data da última atualização e onde
  ficam os dados locais.
- `F12` abre o console, útil para diagnosticar problemas de sincronização.

Se o GitHub estiver fora do ar ou a internet cair, o app abre normalmente com a última
versão baixada — a atualização nunca bloqueia o funcionamento do caixa.
