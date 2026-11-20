// Testes das regras de reserva. Cada teste cita o critério de aceite (CA) da SPEC que ele prova.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarReserva } from '../src/reservas.js';

const AGORA = new Date('2026-12-01T08:00:00-03:00');
const pedido = (extra = {}) => ({
  sala: 'lab-1',
  inicio: '2026-12-01T14:00:00-03:00',
  fim: '2026-12-01T16:00:00-03:00',
  responsavel: 'prof.ana',
  ...extra,
});

test('CA-1: sala livre é reservada', () => {
  const r = criarReserva([], pedido(), AGORA);
  assert.equal(r.status, 201);
  assert.equal(r.reserva.sala, 'lab-1');
  assert.equal(r.reserva.responsavel, 'prof.ana');
});

test('campo obrigatório ausente devolve 400 dizendo qual falta', () => {
  const r = criarReserva([], pedido({ responsavel: '' }), AGORA);
  assert.equal(r.status, 400);
  assert.match(r.erro, /responsavel/);
});

test('sala inexistente devolve 404', () => {
  const r = criarReserva([], pedido({ sala: 'sala-que-nao-existe' }), AGORA);
  assert.equal(r.status, 404);
});

test('fim antes do início devolve 400', () => {
  const r = criarReserva([], pedido({ fim: '2026-12-01T13:00:00-03:00' }), AGORA);
  assert.equal(r.status, 400);
});

test('CA-3: reserva que começa no passado devolve 400', () => {
  const r = criarReserva([], pedido({ inicio: '2026-12-01T07:00:00-03:00', fim: '2026-12-01T09:00:00-03:00' }), AGORA);
  assert.equal(r.status, 400);
  assert.match(r.erro, /passado/);
});

test('CA-3: reserva que começa exatamente agora não é passado', () => {
  const r = criarReserva([], pedido({ inicio: '2026-12-01T08:00:00-03:00', fim: '2026-12-01T10:00:00-03:00' }), AGORA);
  assert.equal(r.status, 201);
});

test('CA-3: o passado é medido pelo início, não pelo fim', () => {
  const r = criarReserva([], pedido({ inicio: '2026-12-01T07:59:00-03:00', fim: '2026-12-01T10:00:00-03:00' }), AGORA);
  assert.equal(r.status, 400);
});

// CA-2: já existe uma reserva no lab-1 das 14h às 16h.
const existentes = () => [criarReserva([], pedido(), AGORA).reserva];

test('CA-2: horário sobreposto na mesma sala devolve 409 com a mensagem do conflito', () => {
  const r = criarReserva(
    existentes(),
    pedido({ responsavel: 'prof.bruno', inicio: '2026-12-01T15:00:00-03:00', fim: '2026-12-01T17:00:00-03:00' }),
    AGORA,
  );
  assert.equal(r.status, 409);
  assert.match(r.erro, /conflito/i);
});

test('CA-2: horário encostado (16h às 18h) não é conflito', () => {
  const r = criarReserva(
    existentes(),
    pedido({ responsavel: 'prof.bruno', inicio: '2026-12-01T16:00:00-03:00', fim: '2026-12-01T18:00:00-03:00' }),
    AGORA,
  );
  assert.equal(r.status, 201);
});

test('CA-2: outra sala no mesmo horário não é conflito', () => {
  const r = criarReserva(existentes(), pedido({ sala: 'auditorio', responsavel: 'prof.bruno' }), AGORA);
  assert.equal(r.status, 201);
});

// Variações de sobreposição (reserva existente: lab-1 das 14h às 16h).
const tentar = (inicio, fim) =>
  criarReserva(
    existentes(),
    pedido({ responsavel: 'prof.bruno', inicio: `2026-12-01T${inicio}:00-03:00`, fim: `2026-12-01T${fim}:00-03:00` }),
    AGORA,
  );

test('CA-2: a mensagem do conflito mostra o horário em -03:00', () => {
  const r = tentar('15:00', '17:00');
  assert.equal(r.status, 409);
  assert.match(r.erro, /2026-12-01T14:00:00-03:00/);
  assert.match(r.erro, /2026-12-01T16:00:00-03:00/);
});

test('CA-2: reserva dentro de outra é conflito', () => {
  assert.equal(tentar('15:00', '15:30').status, 409);
});

test('CA-2: reserva que contém outra é conflito', () => {
  assert.equal(tentar('13:00', '17:00').status, 409);
});

test('CA-2: reserva idêntica é conflito', () => {
  assert.equal(tentar('14:00', '16:00').status, 409);
});

test('CA-2: sobreposição na ponta inicial é conflito', () => {
  assert.equal(tentar('13:00', '15:00').status, 409);
});

test('CA-2: horário encostado antes (12h às 14h) não é conflito', () => {
  assert.equal(tentar('12:00', '14:00').status, 201);
});

test('CA-4: data sem fuso devolve 400', () => {
  const r = criarReserva([], pedido({ inicio: '2026-12-01T14:00:00' }), AGORA);
  assert.equal(r.status, 400);
  assert.match(r.erro, /com fuso/);
});

test('CA-4: data sem hora também é recusada', () => {
  // Datas no futuro e fim depois do início, para o 400 só poder vir da falta de fuso.
  const r = criarReserva([], pedido({ inicio: '2026-12-02', fim: '2026-12-02T16:00:00-03:00' }), AGORA);
  assert.equal(r.status, 400);
  assert.match(r.erro, /com fuso/);
});

test('CA-4: data em UTC (Z) é aceita', () => {
  const r = criarReserva([], pedido({ inicio: '2026-12-01T17:00:00Z', fim: '2026-12-01T19:00:00Z' }), AGORA);
  assert.equal(r.status, 201);
});

// CA-5: datas no futuro (2027) e fim depois do início, para o 400 só poder vir da data inexistente.
test('CA-5: 30 de fevereiro devolve 400 em vez de virar março', () => {
  const r = criarReserva([], pedido({ inicio: '2027-02-30T10:00:00-03:00', fim: '2027-02-30T12:00:00-03:00' }), AGORA);
  assert.equal(r.status, 400);
  assert.match(r.erro, /Datas inválidas/);
});

test('CA-5: 31 de abril devolve 400', () => {
  const r = criarReserva([], pedido({ inicio: '2027-04-31T10:00:00-03:00', fim: '2027-04-31T12:00:00-03:00' }), AGORA);
  assert.equal(r.status, 400);
});

test('CA-5: hora 24:00 devolve 400 em vez de virar o dia seguinte', () => {
  const r = criarReserva([], pedido({ inicio: '2026-12-02T24:00:00-03:00', fim: '2026-12-03T02:00:00-03:00' }), AGORA);
  assert.equal(r.status, 400);
});

test('CA-5: 29 de fevereiro em ano bissexto é aceito', () => {
  const r = criarReserva([], pedido({ inicio: '2028-02-29T10:00:00-03:00', fim: '2028-02-29T12:00:00-03:00' }), AGORA);
  assert.equal(r.status, 201);
});

test('CA-5: 29 de fevereiro fora de ano bissexto devolve 400', () => {
  const r = criarReserva([], pedido({ inicio: '2027-02-29T10:00:00-03:00', fim: '2027-02-29T12:00:00-03:00' }), AGORA);
  assert.equal(r.status, 400);
});

test('CA-2: a mensagem mostra o dia certo quando a reserva existente cruza a meia-noite em UTC', () => {
  // 22:30–23:30 em -03:00 é guardado como 01:30Z–02:30Z do dia seguinte.
  const lista = [{ id: 1, sala: 'lab-1', inicio: '2026-12-02T01:30:00.000Z', fim: '2026-12-02T02:30:00.000Z', responsavel: 'a' }];
  const r = criarReserva(lista, pedido({ inicio: '2026-12-01T22:00:00-03:00', fim: '2026-12-01T23:00:00-03:00' }), AGORA);
  assert.equal(r.status, 409);
  assert.match(r.erro, /2026-12-01T22:30:00-03:00/);
  assert.match(r.erro, /2026-12-01T23:30:00-03:00/);
});

test('CA-2: pedido em +05:00 no mesmo instante de uma reserva existente é conflito', () => {
  // 14h–16h em -03:00 equivale a 22h–00h em +05:00.
  const r = criarReserva(
    existentes(),
    pedido({ responsavel: 'prof.bruno', inicio: '2026-12-01T22:00:00+05:00', fim: '2026-12-02T00:00:00+05:00' }),
    AGORA,
  );
  assert.equal(r.status, 409);
});

test('id: aceita uma lista muito grande de reservas', () => {
  const lista = Array.from({ length: 200_000 }, (_, i) => ({
    id: i + 1, sala: 'auditorio', inicio: '2027-01-01T10:00:00.000Z', fim: '2027-01-01T11:00:00.000Z', responsavel: 'x',
  }));
  const r = criarReserva(lista, pedido(), AGORA);
  assert.equal(r.status, 201);
  assert.equal(r.reserva.id, 200_001);
});

test('id: não repete id depois de cancelamentos', () => {
  const lista = [
    { id: 1, sala: 'auditorio', inicio: '2026-12-02T12:00:00.000Z', fim: '2026-12-02T13:00:00.000Z', responsavel: 'a' },
    { id: 3, sala: 'auditorio', inicio: '2026-12-03T12:00:00.000Z', fim: '2026-12-03T13:00:00.000Z', responsavel: 'b' },
  ];
  const r = criarReserva(lista, pedido(), AGORA);
  assert.equal(r.status, 201);
  assert.equal(r.reserva.id, 4);
});
