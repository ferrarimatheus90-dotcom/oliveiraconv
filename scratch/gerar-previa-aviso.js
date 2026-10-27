// Gera uma prévia do aviso de pendência financeira usando a FUNÇÃO REAL do
// sistema (js/app.js), para que o que aparece na prévia seja exatamente o que
// o cliente verá. Nada aqui altera o sistema nem publica o aviso.
//
// Uso:  node scratch/gerar-previa-aviso.js
// Saída: scratch/previa-aviso.html

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');

const start = src.indexOf('const BILLING_NOTICE = {');
const end = src.indexOf('function navigate(page){');
if (start < 0 || end < 0) throw new Error('Bloco do aviso não encontrado em js/app.js');

// Configuração usada só na prévia. O arquivo js/app.js continua com ativo:false.
const CONFIG_PREVIA = {
  ativo: true,
  mensagem: 'Você tem pendências financeiras com a plataforma.',
  prazo: '2026-10-31',
  valor: 'R$ 1.200,00',
  referencia: 'Saldo do contrato de implantação',
  pagamento: 'PIX 000.000.000-00 (Matheus Ferrari)',
  contato: '(00) 00000-0000',
  piscar: true,
  mostrarPara: ['admin']
};

function renderComDataFalsa(dataSimulada) {
  const DataReal = Date;
  class DataFake extends DataReal {
    constructor(...args) {
      if (args.length === 0) super(dataSimulada);
      else super(...args);
    }
    static now() { return new DataReal(dataSimulada).getTime(); }
  }

  const ctx = {
    currentUser: { role: 'admin' },
    sessionStorage: { getItem: () => null, setItem() {} },
    document: { getElementById: () => null, querySelectorAll: () => [] },
    window: {},
    console: { log() {}, warn() {}, error() {} },
    Date: DataFake,
    isNaN, Math, JSON
  };

  vm.createContext(ctx);
  vm.runInContext(src.slice(start, end) + '\n;globalThis.BILLING_NOTICE = BILLING_NOTICE;', ctx);
  Object.assign(ctx.BILLING_NOTICE, CONFIG_PREVIA);
  return ctx.renderBillingNotice();
}

const CENARIOS = [
  { titulo: 'Quinta-feira 29/10 — quando ele voltar a trabalhar', data: '2026-10-29T10:00:00' },
  { titulo: 'Sábado 31/10 — último dia do prazo',                 data: '2026-10-31T10:00:00' },
  { titulo: 'Domingo 01/11 — prazo encerrado',                    data: '2026-11-01T10:00:00' }
];

const blocos = CENARIOS.map(c => `
    <section class="cenario">
      <h2>${c.titulo}</h2>
      <div class="palco">${renderComDataFalsa(c.data)}</div>
    </section>`).join('\n');

// Reaproveita o CSS real do sistema para as variáveis de cor e os dois temas.
const estilosApp = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Prévia do Aviso de Pendência</title>
<style>
${estilosApp}
</style>
<style>
  body { padding: 0; margin: 0; background: var(--bg); color: var(--text);
         font-family: Inter, "Segoe UI", system-ui, sans-serif; }
  .wrap { max-width: 920px; margin: 0 auto; padding: 28px 20px 60px; }
  .aviso-previa { border:1px solid var(--border); border-radius:10px; padding:12px 14px;
                  margin-bottom:26px; font-size:13px; color:var(--text2); background:rgba(127,127,127,.06); }
  h1 { font-size: 20px; margin: 0 0 6px; }
  .sub { font-size: 13px; color: var(--text2); margin-bottom: 24px; }
  .cenario { margin-bottom: 30px; }
  .cenario h2 { font-size: 13px; font-weight: 600; color: var(--text2); margin: 0 0 10px;
                text-transform: uppercase; letter-spacing: .04em; }
  .palco { border:1px dashed var(--border); border-radius:10px; padding:18px; background:var(--card, transparent); }
  .barra { display:flex; gap:10px; align-items:center; margin-bottom:22px; }
  button.tema { font: inherit; font-size:13px; padding:8px 14px; border-radius:8px; cursor:pointer;
                border:1px solid var(--border); background:transparent; color:var(--text); }
  @keyframes billingPulse {
    0%, 100% { border-color: rgba(229,57,53,.95); box-shadow: 0 0 16px rgba(229,57,53,.40); }
    50%      { border-color: rgba(229,57,53,.35); box-shadow: 0 0 0 rgba(229,57,53,0); }
  }
  .billing-notice.is-blinking { animation: billingPulse 1.4s ease-in-out infinite; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>Prévia — Aviso de pendência financeira</h1>
    <div class="sub">Gerado a partir da função real do sistema. Nada aqui está publicado.</div>

    <div class="aviso-previa">
      Em <code>js/app.js</code> o aviso está com <code>ativo: false</code> — não aparece para ninguém.
      Esta página mostra como ficaria se fosse ligado. O aviso aparece <strong>somente</strong> para o
      login do dono (<code>admin</code>); funcionário nunca vê.
    </div>

    <div class="barra">
      <button class="tema" onclick="document.documentElement.classList.toggle('light-mode')">
        Alternar tema claro / escuro
      </button>
    </div>
${blocos}
  </div>
</body>
</html>
`;

const destino = path.join(__dirname, 'previa-aviso.html');
fs.writeFileSync(destino, html, 'utf8');
console.log('Prévia gerada em: ' + destino);
CENARIOS.forEach(c => console.log('  - ' + c.titulo));
