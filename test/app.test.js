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

// SPEC-002: cancelar reserva pela API. Cada teste sobe o próprio servidor, para os ids começarem em 1.
const MENSAGEM_S = 'Reserva cancelada com sucesso.';
const D = { status: 403, erro: 'Não é responsável pela reserva. Solicitação não realizada.' };
const N = { status: 404, erro: 'Reserva não encontrada. Impossível cancelar.' };
const OBRIGATORIO = { status: 400, erro: 'Campos obrigatórios: responsavel' };

// Agora é 30/11 às 08h. A reserva 1, de Carlos, é do lab-1 em 01/12 das 14h às 16h, salvo outro responsável.
const comReserva = async (roteiro, { responsavel = 'Carlos' } = {}) => {
  const proprio = createServer(criarApp({ agora: () => new Date('2026-11-30T08:00:00-03:00') }));
  await new Promise((ok) => proprio.listen(0, ok));
  const origem = `http://localhost:${proprio.address().port}`;
  const chamar = async (metodo, caminho, corpo) => {
    const resp = await fetch(`${origem}${caminho}`, { method: metodo, body: corpo });
    return { status: resp.status, corpo: await resp.json() };
  };
  const api = {
    criar: (nome, { sala = 'lab-1', de = '14:00', ate = '16:00' } = {}) =>
      chamar('POST', '/reservas', JSON.stringify({
        sala, responsavel: nome, inicio: `2026-12-01T${de}:00-03:00`, fim: `2026-12-01T${ate}:00-03:00`,
      })),
    // `corpo` é o texto enviado; undefined = pedido sem corpo.
    apagar: (caminho, corpo) => chamar('DELETE', caminho, corpo),
    cancelar: (id, nome = 'Carlos') => chamar('DELETE', `/reservas/${id}`, JSON.stringify({ responsavel: nome })),
    listar: async (consulta = '') => (await chamar('GET', `/reservas${consulta}`)).corpo,
  };
  try {
    assert.equal((await api.criar(responsavel)).status, 201);
    await roteiro(api);
  } finally {
    proprio.close();
  }
};

const cancelada = (r) => assert.deepEqual(r, { status: 200, corpo: { mensagem: MENSAGEM_S } });

// Confere a resposta exata e que as reservas continuam iguais.
const semMudanca = async (api, enviar, { status, erro }) => {
  const antes = await api.listar();
  assert.deepEqual(await enviar(), { status, corpo: { erro } });
  assert.deepEqual(await api.listar(), antes);
};

test('SPEC-002 CA-1: pela API, a cancelada some da lista com e sem filtro', () =>
  comReserva(async (api) => {
    cancelada(await api.cancelar(1));
    assert.deepEqual(await api.listar(), []);
    assert.deepEqual(await api.listar('?sala=lab-1'), []);
  }));

test('SPEC-002 CA-2: pela API, o horário cancelado pode ser reservado', () =>
  comReserva(async (api) => {
    cancelada(await api.cancelar(1));
    assert.equal((await api.criar('Bruno')).status, 201);
  }));

test('SPEC-002 CA-3: pela API, outra pessoa recebe 403', () =>
  comReserva((api) => semMudanca(api, () => api.cancelar(1, 'Ana'), D)));

test('SPEC-002 CA-4: pela API, "carlos " cancela a reserva de Carlos', () =>
  comReserva(async (api) => {
    cancelada(await api.cancelar(1, 'carlos '));
    assert.deepEqual(await api.listar(), []);
  }));

test('SPEC-002 CA-5: pela API, Joao não cancela a reserva de João', () =>
  comReserva(async (api) => {
    assert.equal((await api.criar('João', { sala: 'lab-2' })).status, 201);
    await semMudanca(api, () => api.cancelar(2, 'Joao'), D);
  }));

test('SPEC-002 CA-6: pela API, id que não existe recebe 404', () =>
  comReserva((api) => semMudanca(api, () => api.cancelar(99), N)));

test('SPEC-002 CA-7: pela API, o segundo cancelamento recebe 404', () =>
  comReserva(async (api) => {
    cancelada(await api.cancelar(1));
    await semMudanca(api, () => api.cancelar(1), N);
  }));

test('SPEC-002 CA-8: pela API, id escrito de outro jeito recebe 404', () =>
  comReserva(async (api) => {
    for (const id of ['abc', '0', '-1', '1.5', '01', '1.0', '+1']) await semMudanca(api, () => api.cancelar(id), N);
  }));

test('SPEC-002 CA-9: pela API, pedido sem responsavel recebe 400', () =>
  comReserva(async (api) => {
    for (const corpo of [undefined, '{}', '{"responsavel": ""}', '{"responsavel": "   "}']) {
      await semMudanca(api, () => api.apagar('/reservas/1', corpo), OBRIGATORIO);
    }
  }));

test('SPEC-002 CA-10: pela API, JSON inválido recebe 400', () =>
  comReserva((api) =>
    semMudanca(api, () => api.apagar('/reservas/1', '{isso não é json'), {
      status: 400, erro: 'JSON inválido no corpo da requisição',
    })));

test('SPEC-002 CA-15: pela API, a cancelada sai da soma de 4 horas', () =>
  comReserva(async (api) => {
    for (const [de, ate] of [['08:00', '09:00'], ['09:00', '10:00'], ['10:00', '12:00']]) {
      assert.equal((await api.criar('Ana', { de, ate })).status, 201);
    }
    cancelada(await api.cancelar(3, 'Ana'));
    assert.equal((await api.criar('Ana', { de: '12:00', ate: '14:00' })).status, 201);
  }));

test('SPEC-002 CA-16: pela API, o id da cancelada não é reaproveitado', () =>
  comReserva(async (api) => {
    assert.equal((await api.criar('Ana', { sala: 'lab-2' })).status, 201);
    cancelada(await api.cancelar(2, 'Ana'));
    const nova = await api.criar('Bruno', { sala: 'lab-2' });
    assert.equal(nova.status, 201);
    assert.equal(nova.corpo.id, 3);
  }));

test('SPEC-002 CA-17: pela API, criar com nome só com espaços recebe 400 e nada é guardado', () =>
  comReserva((api) => semMudanca(api, () => api.criar('   ', { sala: 'lab-2' }), OBRIGATORIO)));

test('SPEC-002 CA-18: pela API, responsavel que não é texto recebe 400', () =>
  comReserva(
    async (api) => {
      for (const nome of [123, 0, false, ['123'], { nome: '123' }]) {
        await semMudanca(api, () => api.cancelar(1, nome), {
          status: 400, erro: 'O campo responsavel precisa ser um texto.',
        });
      }
    },
    { responsavel: 123 },
  ));

test('SPEC-002 CA-19: pela API, o texto "123" cancela a reserva criada com o número', () =>
  comReserva(
    async (api) => {
      cancelada(await api.cancelar(1, '123'));
      assert.deepEqual(await api.listar(), []);
    },
    { responsavel: 123 },
  ));

test('SPEC-002 CA-20: pela API, o texto em JSON cancela reservas criadas com true ou lista', async () => {
  for (const [guardado, texto] of [[true, 'true'], [['Ana'], '["Ana"]']]) {
    await comReserva(
      async (api) => {
        cancelada(await api.cancelar(1, texto));
        assert.deepEqual(await api.listar(), []);
      },
      { responsavel: guardado },
    );
  }
});

test('SPEC-002 CA-21: pela API, rotas sem um id válido na forma continuam inexistentes', () =>
  comReserva(async (api) => {
    for (const caminho of ['/reservas', '/reservas/', '/reservas/1/']) {
      await semMudanca(api, () => api.apagar(caminho, '{"responsavel": "Carlos"}'), {
        status: 404, erro: 'Rota não encontrada',
      });
    }
  }));
