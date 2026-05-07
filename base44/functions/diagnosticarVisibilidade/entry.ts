import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.igreja_id) {
      return Response.json({ error: 'User sem igreja_id' }, { status: 400 });
    }

    const igrejaId = user.igreja_id;

    // ── PASSO 1: Buscar TODAS as movimentações (apenas igreja_id) ──────────────
    console.log('\n[TESTE 1] Buscando movimentações SEM filtros (apenas igreja_id)...');
    let todasMovs = [];
    let skip = 0;
    while (true) {
      const batch = await base44.entities.Movimentacao.filter(
        { igreja_id: igrejaId },
        '-data',
        200,
        skip
      );
      todasMovs.push(...batch);
      if (batch.length < 200) break;
      skip += 200;
    }

    console.log(`[TESTE 1] Total de registros retornados: ${todasMovs.length}`);
    console.log('[TESTE 1] Primeiros 5 registros completos:');
    todasMovs.slice(0, 5).forEach((m, i) => {
      console.log(`  [${i}]`, {
        id: m.id,
        data: m.data,
        tipo: m.tipo,
        categoria_id: m.categoria_id,
        membro_id: m.membro_id,
        membro_nome: m.membro_nome,
        valor: m.valor,
        created_date: m.created_date,
      });
    });

    // ── PASSO 2: Testar filtro por membro ────────────────────────────────────
    console.log('\n[TESTE 2] Testando filtro por membro...');
    console.log(`[TESTE 2] user.id: ${user.id}`);
    console.log(`[TESTE 2] user.email: ${user.email}`);

    const membrosDoEmail = await base44.entities.Membro.filter(
      { igreja_id: igrejaId, email: user.email },
      'nome',
      1
    );
    const membroRecord = membrosDoEmail[0] || null;

    if (membroRecord) {
      console.log(`[TESTE 2] Membro encontrado: id=${membroRecord.id}, nome=${membroRecord.nome}`);

      // Filtro em memória
      const movsMembro = todasMovs.filter(m => m.membro_id === membroRecord.id);
      console.log(`[TESTE 2] Movimentações com membro_id=${membroRecord.id}: ${movsMembro.length}`);

      // Também testar por membro_nome
      const movsMemberNome = todasMovs.filter(m => m.membro_nome === membroRecord.nome);
      console.log(`[TESTE 2] Movimentações com membro_nome="${membroRecord.nome}": ${movsMemberNome.length}`);

      // Ambos critérios
      const movsMemboCombinado = todasMovs.filter(
        m => m.membro_id === membroRecord.id || m.membro_nome === membroRecord.nome
      );
      console.log(`[TESTE 2] Movimentações (membro_id OU membro_nome): ${movsMemboCombinado.length}`);
    } else {
      console.log('[TESTE 2] NENHUM membro encontrado com este email!');
    }

    // ── PASSO 3: Testar filtro de data isoladamente ──────────────────────────
    console.log('\n[TESTE 3] Testando filtro de data...');

    // Separar por mês (sem usar new Date)
    const mesAtual = '2026-04'; // data local é 2026-04-30
    const mesAnterior = '2026-03';

    const movsAtual = todasMovs.filter(m => m.data?.slice(0, 7) === mesAtual);
    const movsAnterior = todasMovs.filter(m => m.data?.slice(0, 7) === mesAnterior);

    console.log(`[TESTE 3] Registros em ${mesAtual}: ${movsAtual.length}`);
    console.log(`[TESTE 3] Registros em ${mesAnterior}: ${movsAnterior.length}`);

    // Contar por mês (todos os meses)
    const porMes = {};
    for (const m of todasMovs) {
      const mes = m.data?.slice(0, 7) || 'sem-data';
      porMes[mes] = (porMes[mes] || 0) + 1;
    }
    console.log('[TESTE 3] Distribuição por mês:', porMes);

    // ── RESUMO FINAL ──────────────────────────────────────────────────────────
    const resumo = {
      teste1_total_movs: todasMovs.length,
      teste1_primeiros5: todasMovs.slice(0, 5),
      teste2_membro_id: membroRecord?.id || null,
      teste2_membro_nome: membroRecord?.nome || null,
      teste2_movs_por_id: membroRecord ? todasMovs.filter(m => m.membro_id === membroRecord.id).length : 0,
      teste2_movs_por_nome: membroRecord ? todasMovs.filter(m => m.membro_nome === membroRecord.nome).length : 0,
      teste2_movs_combinado: membroRecord
        ? todasMovs.filter(m => m.membro_id === membroRecord.id || m.membro_nome === membroRecord.nome).length
        : 0,
      teste3_mes_atual: movsAtual.length,
      teste3_mes_anterior: movsAnterior.length,
      teste3_por_mes: porMes,
    };

    return Response.json({ diagnostico: resumo, success: true });
  } catch (error) {
    console.error('[ERRO]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});