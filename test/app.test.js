// Teste de ponta a ponta da API: sobe o servidor numa porta livre e faz requisições de verdade.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { criarApp } from '../src/app.js';

let servidor;
let base;

before(async () => {
  servidor = createServer(criarApp({ agora: () => new Date('2026-12-01T08:00:00-03:00') }));
  await new Promise((ok) => servidor.listen(0, ok));
  base = `http://localhost:${servidor.address().port}`;
});

after(() => servidor.close());

test('GET /salas lista as salas', async () => {
  const resp = await fetch(`${base}/salas`);
  assert.equal(resp.status, 200);
  const salas = await resp.json();
  assert.ok(salas.length >= 1);
});

test('POST /reservas cria e GET /reservas mostra a reserva', async () => {
  const criar = await fetch(`${base}/reservas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sala: 'auditorio', inicio: '2026-12-02T09:00:00-03:00', fim: '2026-12-02T11:00:00-03:00', responsavel: 'prof.bruno' }),
  });
  assert.equal(criar.status, 201);
  const lista = await (await fetch(`${base}/reservas`)).json();
  assert.ok(lista.some((r) => r.responsavel === 'prof.bruno'));
});

test('JSON inválido devolve 400', async () => {
  const resp = await fetch(`${base}/reservas`, { method: 'POST', body: '{isso não é json' });
  assert.equal(resp.status, 400);
});

// SPEC-004: filtrar por sala. O servidor de teste guarda as reservas entre os testes,
// então cada teste cria a sua (em dia próprio) e confere subconjuntos, nunca o tamanho total.
const reservar = async (sala, dia) => {
  const resp = await fetch(`${base}/reservas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sala, inicio: `2026-12-${dia}T14:00:00-03:00`, fim: `2026-12-${dia}T16:00:00-03:00`, responsavel: 'prof.ana' }),
  });
  assert.equal(resp.status, 201);
  return resp.json();
};

test('SPEC-004 CA-1: GET /reservas?sala=lab-1 devolve só o lab-1', async () => {
  const lab = await reservar('lab-1', '10');
  await reservar('auditorio', '11');
  const resp = await fetch(`${base}/reservas?sala=lab-1`);
  assert.equal(resp.status, 200);
  const lista = await resp.json();
  assert.ok(lista.some((r) => r.id === lab.id));
  assert.ok(lista.every((r) => r.sala === 'lab-1'));
});

test('SPEC-004 CA-2: GET /reservas?sala=lab-2 sem reservas devolve lista vazia', async () => {
  const resp = await fetch(`${base}/reservas?sala=lab-2`);
  assert.equal(resp.status, 200);
  assert.deepEqual(await resp.json(), []);
});

test('SPEC-004 CA-3: GET /reservas?sala=sala-x devolve 404', async () => {
  const resp = await fetch(`${base}/reservas?sala=sala-x`);
  assert.equal(resp.status, 404);
  assert.equal((await resp.json()).erro, 'Sala não encontrada: sala-x');
});

test('SPEC-004 CA-4: GET /reservas sem filtro devolve as reservas de todas as salas', async () => {
  await reservar('lab-1', '12');
  await reservar('auditorio', '13');
  const lista = await (await fetch(`${base}/reservas`)).json();
  assert.ok(lista.some((r) => r.sala === 'lab-1'));
  assert.ok(lista.some((r) => r.sala === 'auditorio'));
});

test('SPEC-004 CA-5: GET /reservas?sala= vazio devolve 404', async () => {
  const resp = await fetch(`${base}/reservas?sala=`);
  assert.equal(resp.status, 404);
});

test('SPEC-004 CA-6: GET /reservas?sala=LAB-1 devolve 404', async () => {
  const resp = await fetch(`${base}/reservas?sala=LAB-1`);
  assert.equal(resp.status, 404);
});

test('SPEC-004 CA-7: GET /reservas?sala=lab-1&sala=lab-2 devolve 400', async () => {
  const resp = await fetch(`${base}/reservas?sala=lab-1&sala=lab-2`);
  assert.equal(resp.status, 400);
  assert.equal((await resp.json()).erro, 'Informe uma única sala');
});

// SPEC-005: o que foi recusado não pode aparecer em GET /reservas. Cada teste sobe o próprio servidor,
// com o "agora" da SPEC, para não misturar reservas com os testes acima.
const conferirRecusa = async ({ existentes = [], pedido, status, mensagem }) => {
  const proprio = createServer(criarApp({ agora: () => new Date('2026-11-30T08:00:00-03:00') }));
  await new Promise((ok) => proprio.listen(0, ok));
  const url = `http://localhost:${proprio.address().port}/reservas`;
  // 'HH:MM' vira 01/12 em -03:00; um texto completo é usado como está.
  const instante = (t) => (t.length === 5 ? `2026-12-01T${t}:00-03:00` : t);
  const enviar = ([inicio, fim, responsavel = 'Ana']) =>
    fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sala: 'lab-1', inicio: instante(inicio), fim: instante(fim), responsavel }),
    });
  try {
    for (const existente of existentes) assert.equal((await enviar(existente)).status, 201);
    const antes = await (await fetch(url)).json();
    const resp = await enviar(pedido);
    assert.equal(resp.status, status);
    assert.equal((await resp.json()).erro, mensagem);
    assert.deepEqual(await (await fetch(url)).json(), antes);
  } finally {
    proprio.close();
  }
};

const A = { status: 400, mensagem: 'Reserva não realizada por período acima de 4 horas' };
const B = { status: 409, mensagem: 'Reserva não realizada: você já tem uma reserva nesta sala em seguida' };
const casos = [
  ['CA-2', { ...A, pedido: ['08:00', '2026-12-01T12:00:01-03:00'] }],
  ['CA-8', { ...B, existentes: [['08:00', '12:00']], pedido: ['12:00', '13:00'] }],
  ['CA-9', { ...B, existentes: [['12:00', '16:00']], pedido: ['11:00', '12:00'] }],
  ['CA-14', { ...B, existentes: [['08:00', '10:00'], ['10:00', '12:00']], pedido: ['12:00', '13:00'] }],
  ['CA-15', { ...B, existentes: [['08:00', '10:00'], ['12:00', '13:00']], pedido: ['10:00', '12:00'] }],
  ['CA-16', { ...B, existentes: [['08:00', '12:00']], pedido: ['12:00', '13:00', 'ana '] }],
  ['CA-20', { ...B, existentes: [['08:00', '12:00']], pedido: ['2026-12-01T15:00:00Z', '2026-12-01T16:00:00Z'] }],
  ['CA-21', { ...A, pedido: ['08:00', '2026-12-01T12:00:00.001-03:00'] }],
  ['CA-22', { ...B, existentes: [['08:00', '12:00', 123]], pedido: ['12:00', '13:00', 123] }],
  ['CA-23', { ...B, existentes: [['08:00', '12:00']], pedido: ['12:00', '13:00', ' Ana'] }],
  ['CA-26', {
    ...B,
    existentes: [['21:00', '2026-12-02T00:00:00-03:00']],
    pedido: ['2026-12-02T00:00:00-03:00', '2026-12-02T02:00:00-03:00'],
  }],
];
for (const [ca, caso] of casos) {
  test(`SPEC-005 ${ca}: pela API, a recusa não aparece em GET /reservas`, () => conferirRecusa(caso));
}
