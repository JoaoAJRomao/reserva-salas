// Testes das regras de reserva. Cada teste cita o critério de aceite (CA) da SPEC que ele prova.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarReserva, listarReservas } from '../src/reservas.js';
import * as regras from '../src/reservas.js';

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

test('CA-3: a mensagem informa a hora atual e o que fazer', () => {
  const r = criarReserva([], pedido({ inicio: '2026-12-01T07:00:00-03:00', fim: '2026-12-01T09:00:00-03:00' }), AGORA);
  assert.equal(r.status, 400);
  assert.match(r.erro, /2026-12-01T08:00:00-03:00/);
  assert.match(r.erro, /a partir/);
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

// SPEC-004: filtrar reservas por sala. `salas` é a lista de valores do parâmetro ?sala=
// ([] = parâmetro ausente, [''] = ?sala=, ['lab-1', 'lab-2'] = parâmetro repetido).
const reservasEmDuasSalas = () => {
  const lab = criarReserva([], pedido(), AGORA).reserva;
  const aud = criarReserva([lab], pedido({ sala: 'auditorio' }), AGORA).reserva;
  return [lab, aud];
};

test('SPEC-004 CA-1: filtrar por sala devolve só as reservas daquela sala', () => {
  const r = listarReservas(reservasEmDuasSalas(), { salas: ['lab-1'] });
  assert.equal(r.status, 200);
  assert.equal(r.reservas.length, 1);
  assert.equal(r.reservas[0].sala, 'lab-1');
  assert.deepEqual(Object.keys(r.reservas[0]).sort(), ['fim', 'id', 'inicio', 'responsavel', 'sala']);
});

test('SPEC-004 CA-2: sala que existe e não tem reservas devolve 200 e lista vazia', () => {
  const r = listarReservas(reservasEmDuasSalas(), { salas: ['lab-2'] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.reservas, []);
});

test('SPEC-004 CA-3: sala inexistente devolve 404 com a mensagem', () => {
  const r = listarReservas(reservasEmDuasSalas(), { salas: ['sala-x'] });
  assert.equal(r.status, 404);
  assert.equal(r.erro, 'Sala não encontrada: sala-x');
});

test('SPEC-004 CA-4: sem o parâmetro sala devolve todas as reservas', () => {
  const todas = reservasEmDuasSalas();
  const r = listarReservas(todas, { salas: [] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.reservas, todas);
});

test('SPEC-004 CA-5: parâmetro sala vazio devolve 404 e não a lista completa', () => {
  const r = listarReservas(reservasEmDuasSalas(), { salas: [''] });
  assert.equal(r.status, 404);
  assert.match(r.erro, /Sala não encontrada/);
});

test('SPEC-004 CA-6: o id da sala é exato, LAB-1 não é lab-1', () => {
  const r = listarReservas(reservasEmDuasSalas(), { salas: ['LAB-1'] });
  assert.equal(r.status, 404);
});

test('SPEC-004 CA-7: parâmetro sala repetido devolve 400', () => {
  const r = listarReservas(reservasEmDuasSalas(), { salas: ['lab-1', 'lab-2'] });
  assert.equal(r.status, 400);
  assert.equal(r.erro, 'Informe uma única sala');
});

// SPEC-005: limitar a duração da reserva. Salvo indicação, agora é 30/11 às 08h e o responsável é Ana.
// As reservas existentes são objetos prontos, para o teste não depender da regra que está testando.
const AGORA_005 = new Date('2026-11-30T08:00:00-03:00');
const MENSAGEM_A = 'Reserva não realizada por período acima de 4 horas';
const MENSAGEM_B = 'Reserva não realizada: você já tem uma reserva nesta sala em seguida';

// 'HH:MM' vira 01/12 em -03:00; um texto completo é usado como está.
const instante = (t) => (t.length === 5 ? `2026-12-01T${t}:00-03:00` : t);
const guardada = (inicio, fim, responsavel = 'Ana', sala = 'lab-1') => ({
  id: 1, sala, responsavel,
  inicio: new Date(instante(inicio)).toISOString(),
  fim: new Date(instante(fim)).toISOString(),
});
const pedir = (inicio, fim, { lista = [], responsavel = 'Ana', sala = 'lab-1', agora = AGORA_005 } = {}) =>
  criarReserva(lista, { sala, responsavel, inicio: instante(inicio), fim: instante(fim) }, agora);

const aceita = (r) => assert.equal(r.status, 201, r.erro);
const recusada = (r, status, mensagem) => {
  assert.equal(r.status, status);
  assert.equal(r.erro, mensagem);
  assert.equal(r.reserva, undefined);
};

test('SPEC-005 CA-1: 4h exatas são aceitas', () => {
  aceita(pedir('08:00', '12:00'));
});

test('SPEC-005 CA-2: 4h e 1s recebem 400 com a mensagem A', () => {
  recusada(pedir('08:00', '2026-12-01T12:00:01-03:00'), 400, MENSAGEM_A);
});

test('SPEC-005 CA-3: 4h reais com fusos diferentes são aceitas', () => {
  aceita(pedir('08:00', '2026-12-01T15:00:00+00:00'));
});

test('SPEC-005 CA-4: 5h reais com fusos diferentes recebem 400', () => {
  recusada(pedir('08:00', '2026-12-01T11:00:00-05:00'), 400, MENSAGEM_A);
});

test('SPEC-005 CA-5: 4h cruzando a meia-noite são aceitas', () => {
  aceita(pedir('22:00', '2026-12-02T02:00:00-03:00'));
});

test('SPEC-005 CA-6: 5h cruzando a meia-noite recebem 400', () => {
  recusada(pedir('22:00', '2026-12-02T03:00:00-03:00'), 400, MENSAGEM_A);
});

test('SPEC-005 CA-7: acima de 4h e sobreposto recebe o 400 da duração, não o 409', () => {
  recusada(pedir('12:00', '17:00', { lista: [guardada('14:00', '15:00')] }), 400, MENSAGEM_A);
});

test('SPEC-005 CA-8: encostada depois que soma 5h recebe 409 com a mensagem B', () => {
  recusada(pedir('12:00', '13:00', { lista: [guardada('08:00', '12:00')] }), 409, MENSAGEM_B);
});

test('SPEC-005 CA-9: encostada antes que soma 5h recebe 409 com a mensagem B', () => {
  recusada(pedir('11:00', '12:00', { lista: [guardada('12:00', '16:00')] }), 409, MENSAGEM_B);
});

test('SPEC-005 CA-10: encostadas que somam 4h exatas são aceitas', () => {
  aceita(pedir('10:00', '12:00', { lista: [guardada('08:00', '10:00')] }));
});

test('SPEC-005 CA-11: encostada de outro responsável é aceita', () => {
  aceita(pedir('12:00', '13:00', { lista: [guardada('08:00', '12:00')], responsavel: 'Bruno' }));
});

test('SPEC-005 CA-12: horário encostado em outra sala é aceito', () => {
  aceita(pedir('12:00', '13:00', { lista: [guardada('08:00', '12:00')], sala: 'lab-2' }));
});

test('SPEC-005 CA-13: no passado e acima de 4h recebe o erro do passado', () => {
  recusada(
    pedir('08:00', '13:00', { agora: new Date('2026-12-01T09:00:00-03:00') }),
    400,
    'A reserva não pode começar no passado: agora são 2026-12-01T09:00:00-03:00. Escolha um início a partir deste horário.',
  );
});

test('SPEC-005 CA-14: sequência de três reservas que soma 5h recebe 409', () => {
  const lista = [guardada('08:00', '10:00'), guardada('10:00', '12:00')];
  recusada(pedir('12:00', '13:00', { lista }), 409, MENSAGEM_B);
});

test('SPEC-005 CA-15: pedido que une duas reservas e soma 5h recebe 409', () => {
  const lista = [guardada('08:00', '10:00'), guardada('12:00', '13:00')];
  recusada(pedir('10:00', '12:00', { lista }), 409, MENSAGEM_B);
});

test('SPEC-005 CA-16: minúscula e espaço no fim são a mesma pessoa', () => {
  recusada(pedir('12:00', '13:00', { lista: [guardada('08:00', '12:00')], responsavel: 'ana ' }), 409, MENSAGEM_B);
});

test('SPEC-005 CA-17: sobreposição vem antes da reserva encostada', () => {
  const lista = [guardada('08:00', '12:00'), guardada('13:00', '14:00', 'Bruno')];
  recusada(
    pedir('12:00', '13:30', { lista }),
    409,
    'Conflito: lab-1 já está reservada de 2026-12-01T13:00:00-03:00 até 2026-12-01T14:00:00-03:00',
  );
});

test('SPEC-005 CA-18: reserva de outro professor interrompe a sequência', () => {
  const lista = [guardada('08:00', '10:00'), guardada('10:00', '11:00', 'Bruno')];
  aceita(pedir('11:00', '14:00', { lista }));
});

test('SPEC-005 CA-19: pedido que une duas reservas e soma 4h exatas é aceito', () => {
  const lista = [guardada('08:00', '09:00'), guardada('11:00', '12:00')];
  aceita(pedir('09:00', '11:00', { lista }));
});

test('SPEC-005 CA-20: encostada escrita em outro fuso recebe 409', () => {
  const lista = [guardada('08:00', '12:00')];
  recusada(pedir('2026-12-01T15:00:00Z', '2026-12-01T16:00:00Z', { lista }), 409, MENSAGEM_B);
});

test('SPEC-005 CA-21: 4h e 1 milissegundo recebem 400', () => {
  recusada(pedir('08:00', '2026-12-01T12:00:00.001-03:00'), 400, MENSAGEM_A);
});

test('SPEC-005 CA-22: responsável numérico também é comparado', () => {
  const lista = [guardada('08:00', '12:00', 123)];
  recusada(pedir('12:00', '13:00', { lista, responsavel: 123 }), 409, MENSAGEM_B);
});

test('SPEC-005 CA-23: espaço no início não muda a pessoa', () => {
  recusada(pedir('12:00', '13:00', { lista: [guardada('08:00', '12:00')], responsavel: ' Ana' }), 409, MENSAGEM_B);
});

test('SPEC-005 CA-24: acento diferencia as pessoas, e o nome é guardado sem mudança', () => {
  const r = pedir('12:00', '13:00', { lista: [guardada('08:00', '12:00', 'João')], responsavel: 'Joao' });
  aceita(r);
  assert.equal(r.reserva.responsavel, 'Joao');
  // "Decididas": a comparação ignora maiúsculas e espaços, mas o valor guardado não muda.
  assert.equal(pedir('08:00', '09:00', { responsavel: ' Ana ' }).reserva.responsavel, ' Ana ');
});

test('SPEC-005 CA-25: fração abaixo de 1 milissegundo é ignorada', () => {
  aceita(pedir('08:00', '2026-12-01T12:00:00.0001-03:00'));
});

test('SPEC-005 CA-26: encostadas na virada do dia que somam 5h recebem 409', () => {
  const lista = [guardada('21:00', '2026-12-02T00:00:00-03:00')];
  recusada(pedir('2026-12-02T00:00:00-03:00', '2026-12-02T02:00:00-03:00', { lista }), 409, MENSAGEM_B);
});

// SPEC-002: cancelar reserva. Salvo indicação, agora é 30/11 às 08h e a reserva 1, de Carlos, é do lab-1 das 14h às 16h.
// As reservas existentes são objetos prontos, porque não dá para criar reserva no passado.
const MENSAGEM_S = 'Reserva cancelada com sucesso.';
const MENSAGEM_D = 'Não é responsável pela reserva. Solicitação não realizada.';
const MENSAGEM_I = 'Reserva iniciada não permite ser cancelada.';
const MENSAGEM_N = 'Reserva não encontrada. Impossível cancelar.';
const OBRIGATORIO = 'Campos obrigatórios: responsavel';
const PRECISA_SER_TEXTO = 'O campo responsavel precisa ser um texto.';

const item = (id, inicio, fim, responsavel, sala = 'lab-1') => ({ ...guardada(inicio, fim, responsavel, sala), id });
const reserva1 = () => item(1, '14:00', '16:00', 'Carlos');

const cancelar = (lista, { id = '1', responsavel = 'Carlos', corpo = { responsavel }, agora = AGORA_005 } = {}) =>
  regras.cancelarReserva(lista, { id, pedido: corpo }, agora);

// Faz o que a camada HTTP faz no sucesso: troca a reserva pela versão cancelada.
const aplicar = (lista, r) => {
  assert.equal(r.status, 200, r.erro);
  assert.equal(r.mensagem, MENSAGEM_S);
  return lista.map((x) => (x.id === r.cancelada.id ? r.cancelada : x));
};

const negada = (lista, opcoes, status, mensagem) => {
  const antes = structuredClone(lista);
  const r = cancelar(lista, opcoes);
  assert.equal(r.status, status);
  assert.equal(r.erro, mensagem);
  assert.equal(r.cancelada, undefined);
  assert.deepEqual(lista, antes);
};

const idsListados = (lista, salas = []) => listarReservas(lista, { salas }).reservas.map((r) => r.id);

test('SPEC-002 CA-1: o dono cancela, e a reserva some da lista com e sem filtro', () => {
  const lista = [reserva1()];
  const r = cancelar(lista);
  assert.deepEqual(lista, [reserva1()]); // a função não altera a lista recebida
  const depois = aplicar(lista, r);
  assert.deepEqual(idsListados(depois), []);
  assert.deepEqual(idsListados(depois, ['lab-1']), []);
});

test('SPEC-002 CA-2: o horário cancelado pode ser reservado por outra pessoa', () => {
  const lista = [reserva1()];
  const depois = aplicar(lista, cancelar(lista));
  aceita(pedir('14:00', '16:00', { lista: depois, responsavel: 'Bruno' }));
});

test('SPEC-002 CA-3: outra pessoa recebe 403 e a reserva continua guardada', () => {
  negada([reserva1()], { responsavel: 'Ana' }, 403, MENSAGEM_D);
});

test('SPEC-002 CA-4: minúsculas e espaço no fim são o mesmo dono', () => {
  const lista = [reserva1()];
  assert.deepEqual(idsListados(aplicar(lista, cancelar(lista, { responsavel: 'carlos ' }))), []);
});

test('SPEC-002 CA-5: nome sem acento não é o dono', () => {
  const lista = [reserva1(), item(2, '14:00', '16:00', 'João', 'lab-2')];
  negada(lista, { id: '2', responsavel: 'Joao' }, 403, MENSAGEM_D);
});

test('SPEC-002 CA-6: id que não existe recebe 404', () => {
  negada([reserva1()], { id: '99' }, 404, MENSAGEM_N);
});

test('SPEC-002 CA-7: cancelar de novo recebe 404', () => {
  const lista = [reserva1()];
  negada(aplicar(lista, cancelar(lista)), {}, 404, MENSAGEM_N);
});

test('SPEC-002 CA-8: id escrito de outro jeito recebe 404', () => {
  for (const id of ['abc', '0', '-1', '1.5', '01', '1.0', '+1']) negada([reserva1()], { id }, 404, MENSAGEM_N);
});

test('SPEC-002 CA-9: sem responsavel, vazio ou só com espaços recebe 400', () => {
  for (const corpo of [{}, { responsavel: '' }, { responsavel: '   ' }]) {
    negada([reserva1()], { corpo }, 400, OBRIGATORIO);
  }
});

test('SPEC-002 CA-11: no instante exato do início ainda cancela', () => {
  const lista = [reserva1()];
  const r = cancelar(lista, { agora: new Date('2026-12-01T14:00:00-03:00') });
  assert.deepEqual(idsListados(aplicar(lista, r)), []);
});

test('SPEC-002 CA-12: 1 milissegundo depois do início recebe 403', () => {
  negada([reserva1()], { agora: new Date('2026-12-01T14:00:00.001-03:00') }, 403, MENSAGEM_I);
});

test('SPEC-002 CA-13: reserva encerrada recebe 403', () => {
  negada([reserva1()], { agora: new Date('2026-12-01T17:00:00-03:00') }, 403, MENSAGEM_I);
});

test('SPEC-002 CA-14: de outra pessoa e já iniciada recebe a mensagem de dono', () => {
  negada([reserva1()], { responsavel: 'Ana', agora: new Date('2026-12-01T15:00:00-03:00') }, 403, MENSAGEM_D);
});

test('SPEC-002 CA-15: a reserva cancelada sai da soma de 4 horas', () => {
  const lista = [reserva1(), item(2, '08:00', '09:00', 'Ana'), item(3, '09:00', '10:00', 'Ana'), item(4, '10:00', '12:00', 'Ana')];
  const depois = aplicar(lista, cancelar(lista, { id: '3', responsavel: 'Ana' }));
  aceita(pedir('12:00', '14:00', { lista: depois }));
});

test('SPEC-002 CA-16: o id da reserva cancelada não é reaproveitado', () => {
  const lista = [reserva1(), item(2, '14:00', '16:00', 'Ana', 'lab-2')];
  const depois = aplicar(lista, cancelar(lista, { id: '2', responsavel: 'Ana' }));
  const r = pedir('14:00', '16:00', { lista: depois, responsavel: 'Bruno', sala: 'lab-2' });
  aceita(r);
  assert.equal(r.reserva.id, 3);
});

test('SPEC-002 CA-17: criar com responsavel só com espaços recebe 400', () => {
  recusada(pedir('14:00', '16:00', { responsavel: '   ' }), 400, OBRIGATORIO);
});

test('SPEC-002 CA-18: responsavel que não é texto recebe 400', () => {
  for (const responsavel of [123, 0, false, ['123'], { nome: '123' }]) {
    negada([item(1, '14:00', '16:00', 123)], { corpo: { responsavel } }, 400, PRECISA_SER_TEXTO);
  }
});

test('SPEC-002 CA-19: reserva guardada com número é cancelada com o texto', () => {
  const lista = [item(1, '14:00', '16:00', 123)];
  assert.deepEqual(idsListados(aplicar(lista, cancelar(lista, { responsavel: '123' }))), []);
});

test('SPEC-002 CA-20: reserva guardada com true ou lista é cancelada com o texto em JSON', () => {
  for (const [guardado, texto] of [[true, 'true'], [['Ana'], '["Ana"]']]) {
    const lista = [item(1, '14:00', '16:00', guardado)];
    assert.deepEqual(idsListados(aplicar(lista, cancelar(lista, { responsavel: texto }))), []);
  }
});

test('SPEC-002 CA-9: responsavel null vale como campo ausente', () => {
  negada([reserva1()], { corpo: { responsavel: null } }, 400, OBRIGATORIO);
});

test('SPEC-002 CA-9 e CA-18: erro nos dados vem antes da busca pela reserva', () => {
  negada([reserva1()], { id: '99', corpo: {} }, 400, OBRIGATORIO);
  negada([reserva1()], { id: '99', responsavel: 123 }, 400, PRECISA_SER_TEXTO);
});
