/**
 * resumoUtils.js
 * Lógica centralizada de atualização do MovimentacaoResumo via delta.
 * NUNCA recalcula tudo do zero nas operações — usa apenas diferença.
 */
import { base44 } from '@/api/base44Client';

/**
 * Garante que existe um registro de resumo para a igreja e retorna {id, total_entrada, total_saida, saldo}.
 */
async function getOrCreateResumo(igrejaId) {
  const list = await base44.entities.MovimentacaoResumo.filter({ igreja_id: igrejaId });
  if (list.length > 0) return list[0];
  return await base44.entities.MovimentacaoResumo.create({
    igreja_id: igrejaId,
    total_entrada: 0,
    total_saida: 0,
    saldo: 0,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Aplica um delta (+/-) nos totais do resumo.
 * @param {string} igrejaId
 * @param {{ entrada?: number, saida?: number }} delta  valores a somar (negativos para subtrair)
 */
export async function aplicarDeltaResumo(igrejaId, delta) {
  const resumo = await getOrCreateResumo(igrejaId);
  const novaEntrada = (resumo.total_entrada || 0) + (delta.entrada || 0);
  const novaSaida   = (resumo.total_saida   || 0) + (delta.saida   || 0);
  await base44.entities.MovimentacaoResumo.update(resumo.id, {
    total_entrada: Math.max(0, novaEntrada),
    total_saida:   Math.max(0, novaSaida),
    saldo:         novaEntrada - novaSaida,
    updated_at:    new Date().toISOString(),
  });
}

/**
 * Delta para CREATE de uma movimentação.
 */
export async function resumoOnCreate(igrejaId, mov) {
  const delta = mov.tipo === 'entrada'
    ? { entrada: mov.valor || 0 }
    : { saida: mov.valor || 0 };
  await aplicarDeltaResumo(igrejaId, delta);
}

/**
 * Delta para DELETE de uma movimentação.
 */
export async function resumoOnDelete(igrejaId, mov) {
  const delta = mov.tipo === 'entrada'
    ? { entrada: -(mov.valor || 0) }
    : { saida: -(mov.valor || 0) };
  await aplicarDeltaResumo(igrejaId, delta);
}

/**
 * Delta para UPDATE de uma movimentação.
 * @param {string} igrejaId
 * @param {{ tipo, valor }} movAntiga  estado ANTES da edição
 * @param {{ tipo, valor }} movNova    estado DEPOIS da edição
 */
export async function resumoOnUpdate(igrejaId, movAntiga, movNova) {
  const delta = { entrada: 0, saida: 0 };

  // Remove impacto antigo
  if (movAntiga.tipo === 'entrada') delta.entrada -= (movAntiga.valor || 0);
  else                               delta.saida   -= (movAntiga.valor || 0);

  // Aplica impacto novo
  if (movNova.tipo === 'entrada')   delta.entrada += (movNova.valor || 0);
  else                               delta.saida   += (movNova.valor || 0);

  await aplicarDeltaResumo(igrejaId, delta);
}

/**
 * Recalcula o resumo do ZERO (função de segurança/correção manual).
 * Útil após inconsistências.
 */
export async function recalcularResumo(igrejaId) {
  let totalEntrada = 0;
  let totalSaida   = 0;
  let skip = 0;

  while (true) {
    const batch = await base44.entities.Movimentacao.filter(
      { igreja_id: igrejaId }, '-data', 200, skip
    );
    for (const m of batch) {
      if (m.tipo === 'entrada') totalEntrada += m.valor || 0;
      else                      totalSaida   += m.valor || 0;
    }
    if (batch.length < 200) break;
    skip += 200;
  }

  const resumo = await getOrCreateResumo(igrejaId);
  await base44.entities.MovimentacaoResumo.update(resumo.id, {
    total_entrada: totalEntrada,
    total_saida:   totalSaida,
    saldo:         totalEntrada - totalSaida,
    updated_at:    new Date().toISOString(),
  });
}