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
