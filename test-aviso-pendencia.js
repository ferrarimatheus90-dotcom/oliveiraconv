// Protege as regras do aviso de pendência financeira. A mais importante é que
// 'funcionario' NUNCA pode ver o aviso: a tela do caixa é lida por funcionários
// e às vezes por clientes, e expor a situação financeira do dono a terceiros se
// vira contra quem cobra.
const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync('js/app.js', 'utf8');
const start = src.indexOf('const BILLING_NOTICE = {');
const end = src.indexOf('function navigate(page){');

if (start < 0 || end < 0 || end <= start) {
  throw new Error('Não foi possível localizar o bloco do aviso de pendência.');
}

const context = {
  currentUser: null,
  sessionStorage: {
    _v: {},
    getItem(k) { return this._v[k] || null; },
    setItem(k, v) { this._v[k] = v; }
  },
  document: { querySelectorAll: () => [] },
  window: {},
  console: { log() {}, warn() {}, error() {} }
};

vm.createContext(context);
// `const` dentro do vm não vira propriedade do contexto; exporta explicitamente.
vm.runInContext(src.slice(start, end) + '\n;globalThis.BILLING_NOTICE = BILLING_NOTICE;', context);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Desligado some para todo mundo. (Não fixa o valor publicado de `ativo`: ele
// é ligado e desligado conforme a cobrança, e travá-lo aqui quebraria o teste
// toda vez que o aviso fosse ativado de propósito.)
context.BILLING_NOTICE.ativo = false;
context.currentUser = { role: 'admin' };
assert(context.billingNoticeVisible() === false, 'O aviso apareceu estando desligado.');

// Ligado: só o dono vê.
context.BILLING_NOTICE.ativo = true;
context.BILLING_NOTICE.valor = 'R$ 1.200,00';

// Quem vê é decidido por `mostrarPara`. O teste cobre o mecanismo, não a
// política publicada — ela muda conforme a cobrança.
context.BILLING_NOTICE.mostrarPara = ['admin', 'dev', 'funcionario'];
['admin', 'dev', 'funcionario'].forEach(papel => {
  context.currentUser = { role: papel };
  assert(context.billingNoticeVisible() === true, `O perfil "${papel}" não viu o aviso estando liberado.`);
});

// Restringindo, quem está fora da lista deixa de ver.
context.BILLING_NOTICE.mostrarPara = ['admin'];
context.currentUser = { role: 'funcionario' };
assert(context.billingNoticeVisible() === false, 'mostrarPara não bloqueou um perfil fora da lista.');
context.currentUser = { role: 'admin' };
assert(context.billingNoticeVisible() === true, 'mostrarPara bloqueou um perfil que está na lista.');

context.BILLING_NOTICE.mostrarPara = ['admin', 'dev', 'funcionario'];
context.currentUser = null;
assert(context.billingNoticeVisible() === false, 'O aviso apareceu sem usuário logado.');

// Dispensar vale só para a sessão atual.
context.currentUser = { role: 'admin' };
context.window.dismissBillingNotice();
assert(context.billingNoticeVisible() === false, 'Dispensar não ocultou o aviso.');
context.sessionStorage._v = {};
assert(context.billingNoticeVisible() === true, 'O aviso não voltou no acesso seguinte.');

// O aviso informa, não bloqueia.
const html = context.renderBillingNotice();
assert(!/modal|overlay/i.test(html), 'O aviso virou modal/overlay e bloqueia a tela.');
assert(html.includes('R$ 1.200,00'), 'O aviso não mostra o valor em aberto.');

// ---- Contador de prazo -----------------------------------------------------
// Roda o bloco com uma data simulada para conferir os três estados.
function chamadaEm(dataSimulada, prazo) {
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
    Date: DataFake, isNaN, Math, JSON, Number, String
  };
  vm.createContext(ctx);
  vm.runInContext(src.slice(start, end) + '\n;globalThis.BILLING_NOTICE = BILLING_NOTICE;', ctx);
  ctx.BILLING_NOTICE.ativo = true;
  ctx.BILLING_NOTICE.prazo = prazo;
  return ctx.renderBillingNotice();
}

const PRAZO = '2026-10-31';

assert(chamadaEm('2026-10-29T10:00:00', PRAZO).includes('em até 2 dias'),
  'Contador errado dois dias antes do prazo.');

assert(chamadaEm('2026-10-31T10:00:00', PRAZO).includes('Último dia do prazo'),
  'O último dia do prazo não foi reconhecido.');

// Era o bug do -0: o dia seguinte ao prazo aparecia como "último dia".
const depois = chamadaEm('2026-11-01T10:00:00', PRAZO);
assert(depois.includes('Prazo encerrado'),
  'Prazo vencido não foi reconhecido (regressão do -0).');
assert(!depois.includes('Último dia'),
  'Prazo vencido ainda aparece como último dia.');

console.log('OK: 17 regras do aviso de pendência financeira passaram.');
