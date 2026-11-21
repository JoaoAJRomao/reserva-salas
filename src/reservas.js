// Regras de reserva de salas (SPEC-001).
// Funções puras: recebem os dados e devolvem um resultado { status, reserva | erro }.
// Não leem relógio nem banco por conta própria, por isso são fáceis de testar.
import { salaExiste } from './salas.js';

const CAMPOS_OBRIGATORIOS = ['sala', 'inicio', 'fim', 'responsavel'];

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

/**
 * Lista as reservas, com filtro opcional por sala (SPEC-004).
 * @param {Array} reservas  reservas que já existem
 * @param {object} filtro   { salas } com os valores do parâmetro ?sala= ([] = sem filtro)
 */
export function listarReservas(reservas, { salas = [] } = {}) {
  if (salas.length === 0) return { status: 200, reservas }; // CA-4
  if (salas.length > 1) return { status: 400, erro: 'Informe uma única sala' }; // CA-7
  const [sala] = salas;
  // CA-3, CA-5, CA-6: o id é exato; vazio e maiúsculas não existem.
  if (!salaExiste(sala)) return { status: 404, erro: `Sala não encontrada: ${sala}` };
  return { status: 200, reservas: reservas.filter((r) => r.sala === sala) }; // CA-1, CA-2
}

/**
 * Tenta criar uma reserva.
 * @param {Array} reservas  reservas que já existem
 * @param {object} pedido   { sala, inicio, fim, responsavel } com datas em ISO 8601
 * @param {Date} agora      momento atual (injetado para o teste controlar o tempo)
 */
export function criarReserva(reservas, pedido, agora = new Date()) {
  const faltando = CAMPOS_OBRIGATORIOS.filter((campo) => !pedido?.[campo]);
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

  // CA-2 (SPEC-001): sobreposição na mesma sala é 409. Horário encostado (fim == início) não conflita.
  const conflito = reservas.find(
    (r) => r.sala === pedido.sala && inicio < new Date(r.fim) && fim > new Date(r.inicio),
  );
  if (conflito) {
    return { status: 409, erro: `Conflito: ${pedido.sala} já está reservada de ${formatarNoFusoDaFaculdade(conflito.inicio)} até ${formatarNoFusoDaFaculdade(conflito.fim)}` };
  }

  const reserva = {
    id: reservas.reduce((maior, r) => Math.max(maior, r.id), 0) + 1, // não repete id mesmo com reservas removidas
    sala: pedido.sala,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    responsavel: pedido.responsavel,
  };
  return { status: 201, reserva };
}
