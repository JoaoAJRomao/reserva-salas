// Regras de reserva de salas (SPEC-001, SPEC-002, SPEC-004 e SPEC-005).
// Funções puras: recebem os dados e devolvem um resultado { status, ... } com os dados ou um erro.
// Não leem relógio nem banco por conta própria, por isso são fáceis de testar.
import { salaExiste } from './salas.js';

const CAMPOS_OBRIGATORIOS = ['sala', 'inicio', 'fim', 'responsavel'];

const textoEmBranco = (valor) => typeof valor === 'string' && valor.trim() === '';

// SPEC-002: a reserva cancelada continua guardada, para o id não ser reaproveitado, mas não vale para mais nada.
const reservasAtivas = (reservas) => reservas.filter((r) => !r.cancelada);

// CA-4: ISO 8601 com hora e fuso obrigatórios (Z ou ±hh:mm). Sem fuso o JS adivinharia o do servidor.
// Captura ano, mês, dia e hora para o CA-5.
const ISO_COM_FUSO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

// CA-4 + CA-5: formato ISO com fuso e data que existe no calendário.
// O JS "corrige" 30/02 para 02/03 e 24:00 para o dia seguinte; aqui isso vira erro.
function dataValida(texto) {
  const partes = typeof texto === 'string' ? ISO_COM_FUSO.exec(texto) : null;
  if (!partes) return false;
  const [ano, mes, dia, hora] = partes.slice(1, 5).map(Number);
  const calendario = new Date(0);
  calendario.setUTCFullYear(ano, mes - 1, dia); // setUTCFullYear não trata anos 0–99 como 19xx
  return hora <= 23 && calendario.getUTCDate() === dia;
}

// Fuso da faculdade, usado só para exibir mensagens (o Brasil não tem horário de verão desde 2019).
const FUSO_EXIBICAO = { rotulo: '-03:00', minutos: -180 };

function formatarNoFusoDaFaculdade(iso) {
  const deslocado = new Date(new Date(iso).getTime() + FUSO_EXIBICAO.minutos * 60_000);
  return deslocado.toISOString().slice(0, 19) + FUSO_EXIBICAO.rotulo;
}

// SPEC-005: limite por reserva e por sequência encostada do mesmo professor na mesma sala.
const DURACAO_MAXIMA_MS = 4 * 60 * 60_000;
const ERRO_DURACAO = 'Reserva não realizada por período acima de 4 horas';
const ERRO_ENCOSTADA = 'Reserva não realizada: você já tem uma reserva nesta sala em seguida';

// Sem login, o professor é o texto de `responsavel`: ignora maiúsculas e espaços nas pontas, mantém acentos.
// O que não é texto (ex.: número) vira texto com JSON.stringify. Estruturas aninhadas em milhares de níveis ainda
// causam erro; recusar `responsavel` que não é texto fica para a SPEC de login.
function chaveDoResponsavel(valor) {
  return (typeof valor === 'string' ? valor : JSON.stringify(valor)).trim().toLowerCase();
}

// Duração do pedido somada às reservas encostadas nele, antes e depois, em sequência.
// `proprias` são as reservas do mesmo professor na mesma sala, já sem sobreposição com o pedido.
function duracaoDaSequencia(proprias, inicio, fim) {
  const porFim = new Map(proprias.map((r) => [Date.parse(r.fim), Date.parse(r.inicio)]));
  const porInicio = new Map(proprias.map((r) => [Date.parse(r.inicio), Date.parse(r.fim)]));
  let comeco = inicio.getTime();
  let termino = fim.getTime();
  while (porFim.has(comeco)) comeco = porFim.get(comeco);
  while (porInicio.has(termino)) termino = porInicio.get(termino);
  return termino - comeco;
}

/**
 * Lista as reservas, com filtro opcional por sala (SPEC-004).
 * @param {Array} reservas  reservas que já existem
 * @param {object} filtro   { salas } com os valores do parâmetro ?sala= ([] = sem filtro)
 */
export function listarReservas(reservas, { salas = [] } = {}) {
  const ativas = reservasAtivas(reservas);
  if (salas.length === 0) return { status: 200, reservas: ativas }; // CA-4
  if (salas.length > 1) return { status: 400, erro: 'Informe uma única sala' }; // CA-7
  const [sala] = salas;
  // CA-3, CA-5, CA-6: o id é exato; vazio e maiúsculas não existem.
  if (!salaExiste(sala)) return { status: 404, erro: `Sala não encontrada: ${sala}` };
  return { status: 200, reservas: ativas.filter((r) => r.sala === sala) }; // CA-1, CA-2
}

/**
 * Tenta criar uma reserva.
 * @param {Array} reservas  reservas que já existem
 * @param {object} pedido   { sala, inicio, fim, responsavel } com datas em ISO 8601
 * @param {Date} agora      momento atual (injetado para o teste controlar o tempo)
 */
export function criarReserva(reservas, pedido, agora = new Date()) {
  // SPEC-002 CA-17: nome só com espaços vale como campo ausente.
  const faltando = CAMPOS_OBRIGATORIOS.filter(
    (campo) => !pedido?.[campo] || (campo === 'responsavel' && textoEmBranco(pedido[campo])),
  );
  if (faltando.length) return { status: 400, erro: `Campos obrigatórios: ${faltando.join(', ')}` };

  if (!salaExiste(pedido.sala)) return { status: 404, erro: `Sala não encontrada: ${pedido.sala}` };

  const formatoOk = dataValida(pedido.inicio) && dataValida(pedido.fim);
  const inicio = new Date(pedido.inicio);
  const fim = new Date(pedido.fim);
  if (!formatoOk || Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return { status: 400, erro: 'Datas inválidas: use ISO 8601 com fuso, ex.: 2026-12-01T14:00:00-03:00' };
  }
  if (fim <= inicio) return { status: 400, erro: 'O fim precisa ser depois do início' };

  // CA-3 (SPEC-001): só é passado se inicio < agora; começar neste instante é permitido.
  if (inicio < agora) {
    return {
      status: 400,
      erro: `A reserva não pode começar no passado: agora são ${formatarNoFusoDaFaculdade(agora)}. Escolha um início a partir deste horário.`,
    };
  }

  // SPEC-005 CA-1 a CA-7 e CA-21: a duração é conferida depois do passado e antes da sobreposição.
  if (fim - inicio > DURACAO_MAXIMA_MS) return { status: 400, erro: ERRO_DURACAO };

  // CA-2 (SPEC-001): sobreposição na mesma sala é 409. Horário encostado (fim == início) não conflita.
  const ativas = reservasAtivas(reservas);
  const conflito = ativas.find(
    (r) => r.sala === pedido.sala && inicio < new Date(r.fim) && fim > new Date(r.inicio),
  );
  if (conflito) {
    return { status: 409, erro: `Conflito: ${pedido.sala} já está reservada de ${formatarNoFusoDaFaculdade(conflito.inicio)} até ${formatarNoFusoDaFaculdade(conflito.fim)}` };
  }

  // SPEC-005 CA-8 em diante: encostar não é sobreposição, mas o mesmo professor não passa de 4h em sequência.
  const chave = chaveDoResponsavel(pedido.responsavel);
  const proprias = ativas.filter((r) => r.sala === pedido.sala && chaveDoResponsavel(r.responsavel) === chave);
  if (duracaoDaSequencia(proprias, inicio, fim) > DURACAO_MAXIMA_MS) return { status: 409, erro: ERRO_ENCOSTADA };

  const reserva = {
    id: reservas.reduce((maior, r) => Math.max(maior, r.id), 0) + 1, // não repete id mesmo com reservas removidas
    sala: pedido.sala,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    responsavel: pedido.responsavel,
  };
  return { status: 201, reserva };
}

/**
 * Tenta cancelar uma reserva (SPEC-002). Não altera a lista: no sucesso, devolve em `cancelada`
 * a versão marcada, para quem chamou guardar no lugar da original.
 * @param {Array} reservas  reservas que já existem, inclusive as canceladas
 * @param {object} alvo     { id, pedido }: o id como veio na URL e o corpo { responsavel }
 * @param {Date} agora      momento atual (injetado para o teste controlar o tempo)
 */
export function cancelarReserva(reservas, { id, pedido }, agora = new Date()) {
  const responsavel = pedido?.responsavel;
  if (responsavel === undefined || responsavel === null || textoEmBranco(responsavel)) {
    return { status: 400, erro: 'Campos obrigatórios: responsavel' }; // CA-9
  }
  // CA-18: diferente da criação, 0 e false aqui são erro de tipo, e não campo ausente.
  if (typeof responsavel !== 'string') return { status: 400, erro: 'O campo responsavel precisa ser um texto.' };

  // CA-6 a CA-8: o id é comparado como texto, então '01', '1.0' e '+1' não são a reserva 1.
  const reserva = reservasAtivas(reservas).find((r) => String(r.id) === id);
  if (!reserva) return { status: 404, erro: 'Reserva não encontrada. Impossível cancelar.' };

  if (chaveDoResponsavel(reserva.responsavel) !== chaveDoResponsavel(responsavel)) {
    return { status: 403, erro: 'Não é responsável pela reserva. Solicitação não realizada.' };
  }
  // CA-11 a CA-13: no instante exato do início ainda pode cancelar.
  if (agora > new Date(reserva.inicio)) return { status: 403, erro: 'Reserva iniciada não permite ser cancelada.' };

  return { status: 200, mensagem: 'Reserva cancelada com sucesso.', cancelada: { ...reserva, cancelada: true } };
}
