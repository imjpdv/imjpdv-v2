import { base44 } from '@/api/base44Client';

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Busca TODOS os registros de Movimentacao que referenciam um ID,
 * paginando até esgotar os resultados.
 */
async function fetchAllMovimentacoesByField(field, id, igrejaId) {
  const all = [];
  let skip = 0;
  while (true) {
    const batch = await base44.entities.Movimentacao.filter(
      { [field]: id, igreja_id: igrejaId },
      '-created_date',
      BATCH_SIZE,
      skip
    );
    all.push(...batch);
    if (batch.length < BATCH_SIZE) break;
    skip += BATCH_SIZE;
  }
  return all;
}

/**
 * Migra todos os registros de Movimentacao que usam `fromId` para `toId`
 * no campo especificado (categoria_id ou forma_pagamento_id).
 * Processa em lotes de BATCH_SIZE com delay entre lotes.
 * onProgress(current, total) é chamado a cada lote.
 */
export async function migrateMovimentacoes({ field, fromId, toId, igrejaId, onProgress }) {
  const all = await fetchAllMovimentacoesByField(field, fromId, igrejaId);
  const total = all.length;

  if (total === 0) {
    onProgress && onProgress(0, 0);
    return { total: 0, migrated: 0 };
  }

  let migrated = 0;

  for (let i = 0; i < all.length; i += BATCH_SIZE) {
    const batch = all.slice(i, i + BATCH_SIZE);

    for (const mov of batch) {
      await base44.entities.Movimentacao.update(mov.id, { [field]: toId });
      migrated++;
    }

    onProgress && onProgress(migrated, total);

    if (i + BATCH_SIZE < all.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return { total, migrated };
}

/**
 * Conta quantas movimentações usam um determinado ID no campo dado.
 */
export async function countMovimentacoesByField(field, id, igrejaId) {
  const all = await fetchAllMovimentacoesByField(field, id, igrejaId);
  return all.length;
}