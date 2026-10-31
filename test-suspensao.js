// Protege as regras da suspensão por falta de pagamento.
// A regra mais importante é que a tela de suspensão sempre ofereça a
// exportação: os dados de venda são do cliente e, com o Supabase fora, existem
// só no IndexedDB do navegador dele.
const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync('js/app.js', 'utf8');
const start = src.indexOf('const SYSTEM_SUSPENDED = {');
const end = src.indexOf('// ===================== AVISO DE PENDÊNCIA FINANCEIRA');

if (start < 0 || end < 0 || end <= start) {
  throw new Error('Não foi possível localizar o bloco de suspensão.');
}

const body = { innerHTML: '<div id="app">sistema</div>' };
const context = {
  document: { body, getElementById: () => null, createElement: () => ({ click() {} }) },
  localStorage: { getItem: () => null },
  window: {},
  console: { log() {}, warn() {}, error() {} },
  alert() {},
  Blob: class {},
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  Date, JSON
};

vm.createContext(context);
vm.runInContext(src.slice(start, end) + '\n;globalThis.SYSTEM_SUSPENDED = SYSTEM_SUSPENDED;', context);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Desligado: não interfere em nada.
context.SYSTEM_SUSPENDED.ativo = false;
assert(context.applySystemSuspension() === false, 'Suspensão desligada bloqueou o sistema.');
assert(body.innerHTML.includes('sistema'), 'Suspensão desligada alterou a página.');

// Ligado: bloqueia e substitui a tela inteira.
context.SYSTEM_SUSPENDED.ativo = true;
assert(context.applySystemSuspension() === true, 'Suspensão ligada não sinalizou o bloqueio.');
assert(!body.innerHTML.includes('<div id="app">sistema</div>'), 'A tela do sistema continuou acessível.');
assert(body.innerHTML.includes('Sistema suspenso'), 'A tela de suspensão não foi exibida.');

// REGRA CRÍTICA: os dados do cliente continuam exportáveis.
assert(context.SYSTEM_SUSPENDED.permitirExportacao === true,
  'REGRA CRÍTICA VIOLADA: a exportação de dados foi desativada.');
assert(body.innerHTML.includes('Baixar meus dados'),
  'REGRA CRÍTICA VIOLADA: a tela de suspensão não oferece a exportação dos dados.');

// O motivo e a instrução aparecem, para o cliente saber o que fazer.
assert(body.innerHTML.includes('falta de pagamento'), 'A tela não informa o motivo da suspensão.');
assert(body.innerHTML.includes('Regularize'), 'A tela não diz como reativar.');

// O contato só aparece quando preenchido.
context.SYSTEM_SUSPENDED.contato = '(00) 00000-0000';
context.applySystemSuspension();
assert(body.innerHTML.includes('(00) 00000-0000'), 'O contato preenchido não apareceu.');

console.log('OK: 9 regras da suspensão passaram.');
