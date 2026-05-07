import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload, Download, FileText, AlertCircle, CheckCircle2,
  Loader2, Eye, FileUp, X, Info
} from 'lucide-react';

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
  return { headers, rows };
}

function generateCSV(headers, rows) {
  const h = headers.join(',');
  const body = rows.map(r => headers.map(k => `"${(r[k] ?? '')}"`).join(',')).join('\n');
  return h + '\n' + body;
}

function downloadCSV(filename, content) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Templates ────────────────────────────────────────────────────────────────

// NOVO: usa membro_email em vez de membro_id
const MOV_HEADERS = ['tipo', 'data', 'categoria', 'membro_email', 'membro_nome', 'valor', 'forma_pagamento', 'descricao', 'observacoes'];
const MOV_EXAMPLE = [{
  tipo: 'entrada', data: '2024-01-15', categoria: 'Dízimo',
  membro_email: 'joao@email.com', membro_nome: 'João Silva',
  valor: '200.00', forma_pagamento: 'PIX',
  descricao: 'Dízimo de janeiro', observacoes: ''
}];
const MBR_HEADERS = ['nome', 'email', 'telefone'];
const MBR_EXAMPLE = [{ nome: 'Maria Santos', email: 'maria@email.com', telefone: '11999990000' }];

// ─── Validação estática ───────────────────────────────────────────────────────

function validateMovimentacoesStatico(rows, categorias, formas) {
  const erros = [];
  rows.forEach((row, i) => {
    const ln = i + 2;
    if (!row.tipo) erros.push(`Linha ${ln}: "tipo" obrigatório`);
    else if (!['entrada', 'saida'].includes(row.tipo))
      erros.push(`Linha ${ln}: "tipo" deve ser "entrada" ou "saida"`);
    if (!row.data) erros.push(`Linha ${ln}: "data" obrigatória`);
    else if (isNaN(Date.parse(row.data)))
      erros.push(`Linha ${ln}: "data" inválida (use AAAA-MM-DD)`);
    if (!row.valor) erros.push(`Linha ${ln}: "valor" obrigatório`);
    else if (isNaN(parseFloat(row.valor)) || parseFloat(row.valor) <= 0)
      erros.push(`Linha ${ln}: "valor" deve ser numérico e maior que 0`);
    if (!row.categoria) erros.push(`Linha ${ln}: "categoria" obrigatória`);
    else if (!categorias.find(c => c.nome.toLowerCase() === row.categoria.toLowerCase()))
      erros.push(`Linha ${ln}: categoria "${row.categoria}" não encontrada`);
    if (!row.forma_pagamento) erros.push(`Linha ${ln}: "forma_pagamento" obrigatória`);
    else if (!formas.find(f => f.nome.toLowerCase() === row.forma_pagamento.toLowerCase()))
      erros.push(`Linha ${ln}: forma "${row.forma_pagamento}" não encontrada`);
  });
  return erros;
}

function validateMembros(rows) {
  const erros = [];
  rows.forEach((row, i) => {
    const ln = i + 2;
    if (!row.nome) erros.push(`Linha ${ln}: "nome" obrigatório`);
    if (!row.email) erros.push(`Linha ${ln}: "email" obrigatório`);
    else if (!/\S+@\S+\.\S+/.test(row.email)) erros.push(`Linha ${ln}: "email" inválido`);
  });
  return erros;
}

// ─── Delay helper ────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── ImportPanel ─────────────────────────────────────────────────────────────

function ImportPanel({ igrejaId, categorias, formas, membros }) {
  const [tipo, setTipo] = useState('movimentacoes');
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [erros, setErros] = useState([]);
  const [status, setStatus] = useState(null); // null|'error'|'valid'|'importing'|'done'
  const [fileName, setFileName] = useState('');
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [retryLog, setRetryLog] = useState(null);
  const fileRef = useRef();
  const isProcessingRef = useRef(false);

  function reset() {
    setRows([]); setHeaders([]); setErros([]); setStatus(null);
    setFileName(''); setResultado(null); setImportando(false);
    setProgresso({ atual: 0, total: 0 }); setRetryLog(null);
    isProcessingRef.current = false;
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const { headers: h, rows: r } = parseCSV(ev.target.result);
      setHeaders(h); setRows(r);
      const errs = tipo === 'movimentacoes'
        ? validateMovimentacoesStatico(r, categorias, formas)
        : validateMembros(r);
      setErros(errs);
      setStatus(errs.length > 0 ? 'error' : 'valid');
    };
    reader.readAsText(file, 'utf-8');
  }

  async function handleImport() {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setImportando(true);
    setStatus('importing');

    const BATCH_SIZE = 50;
    const DELAY_MS = 2000;

    if (tipo === 'movimentacoes') {
      // 1. Carrega TODOS os membros via list() para garantir sem paginação truncada
      setRetryLog('Carregando membros da igreja...');
      const todosOsMembros = await base44.entities.Membro.list();
      const membrosAtivos = todosOsMembros.filter(m => m.igreja_id === igrejaId);

      // 2. Mapa robusto: email_normalizado → membro_id
      const emailParaMembroId = {};
      membrosAtivos.forEach(m => {
        if (m.email && m.id) {
          const key = m.email.trim().toLowerCase();
          emailParaMembroId[key] = m.id;
        }
      });
      console.log(`[Import] Membros carregados: ${membrosAtivos.length} | Mapa:`, emailParaMembroId);

      // 3. Busca duplicatas existentes
      setRetryLog('Verificando duplicatas...');
      const existentes = await base44.entities.Movimentacao.filter(
        { igreja_id: igrejaId }, '-data', 2000
      );
      const dupSet = new Set(
        existentes.map(e => `${e.data}|${e.valor}|${e.categoria_id}|${e.tipo}`)
      );

      // 4. Pré-processa TODAS as linhas — validação forte antes do bulk
      const payloads = [];
      const errosImport = [];
      let duplicados = 0;

      rows.forEach((row, i) => {
        const ln = i + 2;
        const cat = categorias.find(c => c.nome.toLowerCase() === row.categoria?.toLowerCase());
        const forma = formas.find(f => f.nome.toLowerCase() === row.forma_pagamento?.toLowerCase());
        const valor = parseFloat(row.valor);

        // Validação de campos obrigatórios
        if (!['entrada', 'saida'].includes(row.tipo) || isNaN(Date.parse(row.data)) ||
            isNaN(valor) || valor <= 0 || !cat || !forma) {
          errosImport.push(`Linha ${ln}: dados inválidos (tipo/data/valor/categoria/forma) — ignorado`);
          return;
        }

        // Resolução do membro_id via email (OBRIGATÓRIO se email preenchido)
        const emailRaw = row.membro_email?.trim().toLowerCase() || '';
        let membroId = null;

        if (emailRaw) {
          membroId = emailParaMembroId[emailRaw] || null;
          console.log(`[Import linha ${ln}] email="${emailRaw}" → membro_id=${membroId}`);

          if (!membroId) {
            errosImport.push(`Linha ${ln}: membro não encontrado para email "${row.membro_email}" — ignorado`);
            return; // NÃO inclui no lote
          }
        }

        // Duplicata
        const dupKey = `${row.data}|${valor}|${cat.id}|${row.tipo}`;
        if (dupSet.has(dupKey)) { duplicados++; return; }

        // Monta payload — membro_id só é incluído quando há email e foi resolvido
        const payload = {
          tipo: row.tipo,
          data: row.data,
          categoria_id: cat.id,
          valor,
          forma_pagamento_id: forma.id,
          membro_nome: row.membro_nome || '',
          descricao: row.descricao || '',
          observacoes: row.observacoes || '',
          igreja_id: igrejaId,
        };
        if (membroId) payload.membro_id = membroId;

        payloads.push(payload);
      });

      console.log(`[Import] Payloads válidos: ${payloads.length} | Erros: ${errosImport.length} | Duplicados: ${duplicados}`);

      // 6. Processa em lotes com bulkCreate
      const totalLotes = Math.ceil(payloads.length / BATCH_SIZE);
      let ok = 0;
      setProgresso({ atual: 0, total: totalLotes });

      for (let li = 0; li < totalLotes; li++) {
        const lote = payloads.slice(li * BATCH_SIZE, (li + 1) * BATCH_SIZE);
        setRetryLog(`Enviando lote ${li + 1} de ${totalLotes} (${lote.length} registros)...`);
        await base44.entities.Movimentacao.bulkCreate(lote);
        ok += lote.length;
        setProgresso({ atual: li + 1, total: totalLotes });
        if (li < totalLotes - 1) await sleep(DELAY_MS);
      }

      setRetryLog(null);
      setResultado({ ok, duplicados, erros: errosImport, total: rows.length });
    } else {
      // Membros — bulk simples
      const records = rows.map(row => ({
        nome: row.nome,
        email: row.email,
        telefone: row.telefone || '',
        igreja_id: igrejaId,
      }));
      await base44.entities.Membro.bulkCreate(records);
      setResultado({ ok: records.length, duplicados: 0, erros: [], total: records.length });
    }

    setStatus('done');
    setImportando(false);
    isProcessingRef.current = false;
  }

  function downloadTemplate() {
    if (tipo === 'movimentacoes') downloadCSV('modelo_movimentacoes.csv', generateCSV(MOV_HEADERS, MOV_EXAMPLE));
    else downloadCSV('modelo_membros.csv', generateCSV(MBR_HEADERS, MBR_EXAMPLE));
  }

  return (
    <div className="space-y-5">
      {/* Seletor de tipo */}
      <div className="flex gap-2">
        {['movimentacoes', 'membros'].map(t => (
          <button key={t} onClick={() => { setTipo(t); reset(); }}
            className={`px-4 py-2 rounded-xl text-sm font-body font-semibold transition-colors ${tipo === t ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
            {t === 'movimentacoes' ? 'Movimentações' : 'Membros'}
          </button>
        ))}
      </div>

      {/* Info sobre membro_email */}
      {tipo === 'movimentacoes' && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Use o campo <strong>membro_email</strong> (opcional) para vincular automaticamente a movimentação ao membro cadastrado.
            O email deve corresponder exatamente ao email do membro na igreja.
          </p>
        </div>
      )}

      {/* Download template */}
      <div className="flex items-center gap-3 bg-accent/50 rounded-xl px-4 py-3">
        <FileText className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-body font-semibold text-foreground">Modelo de importação</p>
          <p className="text-xs text-muted-foreground">Baixe o modelo CSV e preencha com seus dados.</p>
        </div>
        <button onClick={downloadTemplate} className="btn-sacred px-4 py-2 text-xs flex items-center gap-1.5 rounded-lg">
          <Download className="w-3.5 h-3.5" /> Baixar modelo
        </button>
      </div>

      {/* Upload */}
      {status !== 'done' && (
        <div>
          <label className="block text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Selecionar arquivo (CSV)
          </label>
          <div
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            {fileName
              ? <p className="text-sm font-medium text-foreground">{fileName}</p>
              : <p className="text-sm text-muted-foreground">Clique para selecionar um arquivo CSV</p>
            }
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        </div>
      )}

      {/* Erros de validação */}
      {status === 'error' && erros.length > 0 && (
        <div className="bg-destructive/5 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm font-semibold">{erros.length} erro(s) — importação bloqueada</p>
          </div>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {erros.map((e, i) => <li key={i} className="text-xs text-destructive font-body">• {e}</li>)}
          </ul>
        </div>
      )}

      {/* Preview */}
      {status === 'valid' && rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-secondary">
            <Eye className="w-4 h-4" />
            <p className="text-sm font-semibold">{rows.length} linha(s) válidas — pré-visualização</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border/40 max-h-52">
            <table className="w-full text-xs font-body">
              <thead className="bg-muted/60">
                <tr>
                  {headers.map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                    {headers.map(h => (
                      <td key={h} className="px-3 py-1.5 text-foreground max-w-[120px] truncate">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 10 && (
              <p className="text-xs text-muted-foreground text-center py-2">... e mais {rows.length - 10} linhas</p>
            )}
          </div>
          <button
            onClick={handleImport}
            disabled={importando}
            className="btn-sacred px-5 py-2.5 text-sm flex items-center gap-2 rounded-xl w-full justify-center disabled:opacity-60"
          >
            <Upload className="w-4 h-4" /> Importar {rows.length} registro(s)
          </button>
        </div>
      )}

      {/* Importando */}
      {status === 'importing' && (
        <div className="space-y-3 py-6">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-sm font-body">
              {progresso.total > 0
                ? `Lote ${progresso.atual} de ${progresso.total} processado...`
                : 'Preparando importação...'}
            </p>
          </div>
          {progresso.total > 0 && (
            <>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 bg-primary rounded-full transition-all duration-150"
                  style={{ width: `${Math.round((progresso.atual / progresso.total) * 100)}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {Math.round((progresso.atual / progresso.total) * 100)}%
              </p>
            </>
          )}
          {retryLog && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
              <p className="text-xs text-amber-700 font-body">{retryLog}</p>
            </div>
          )}
        </div>
      )}

      {/* Resultado */}
      {status === 'done' && resultado && (
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="bg-secondary/10 px-5 py-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-secondary" />
            <div>
              <p className="text-sm font-display font-bold text-foreground">Importação concluída</p>
              <p className="text-xs text-muted-foreground">{resultado.total} linha(s) processadas</p>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border/40">
            <div className="px-4 py-3 text-center">
              <p className="text-xl font-display font-bold text-secondary">{resultado.ok}</p>
              <p className="text-xs text-muted-foreground">Importados</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-xl font-display font-bold text-amber-500">{resultado.duplicados}</p>
              <p className="text-xs text-muted-foreground">Ignorados (dup.)</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-xl font-display font-bold text-destructive">{resultado.erros.length}</p>
              <p className="text-xs text-muted-foreground">Com erro</p>
            </div>
          </div>
          {resultado.erros.length > 0 && (
            <div className="px-5 py-3 bg-destructive/5 border-t border-border/40">
              <p className="text-xs font-semibold text-destructive mb-2">Detalhes dos erros:</p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {resultado.erros.map((e, i) => <li key={i} className="text-xs text-destructive">• {e}</li>)}
              </ul>
            </div>
          )}
          <div className="px-5 py-4 border-t border-border/40">
            <button onClick={reset} className="btn-sacred px-4 py-2 text-xs rounded-lg flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Nova importação
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ExportPanel ─────────────────────────────────────────────────────────────

function ExportPanel({ igrejaId }) {
  const [loading, setLoading] = useState(null);

  async function exportar(tipo) {
    setLoading(tipo);
    if (tipo === 'movimentacoes') {
      const [movs, cats, formas, membros] = await Promise.all([
        base44.entities.Movimentacao.filter({ igreja_id: igrejaId }, '-data', 2000),
        base44.entities.CategoriaConfig.filter({ igreja_id: igrejaId }, 'nome', 200),
        base44.entities.FormaPagamentoConfig.filter({ igreja_id: igrejaId }, 'nome', 200),
        base44.entities.Membro.filter({ igreja_id: igrejaId }, 'nome', 2000),
      ]);
      const membrosById = {};
      membros.forEach(m => { membrosById[m.id] = m; });
      const rows = movs.map(m => ({
        tipo: m.tipo,
        data: m.data,
        categoria: cats.find(c => c.id === m.categoria_id)?.nome || '',
        membro_email: membrosById[m.membro_id]?.email || '',
        membro_nome: m.membro_nome || '',
        valor: m.valor,
        forma_pagamento: formas.find(f => f.id === m.forma_pagamento_id)?.nome || '',
        descricao: m.descricao || '',
        observacoes: m.observacoes || '',
      }));
      downloadCSV('movimentacoes.csv', generateCSV(MOV_HEADERS, rows));
    } else {
      const membros = await base44.entities.Membro.filter({ igreja_id: igrejaId }, 'nome', 2000);
      const rows = membros.map(m => ({ id: m.id, nome: m.nome, email: m.email, telefone: m.telefone || '' }));
      downloadCSV('membros.csv', generateCSV(['id', ...MBR_HEADERS], rows));
    }
    setLoading(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-body text-muted-foreground">Exporte seus dados em formato CSV para uso externo.</p>
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>O export de <strong>Movimentações</strong> inclui o campo <strong>membro_email</strong> para facilitar reimportações com vínculo automático.</p>
      </div>
      {[
        { tipo: 'movimentacoes', label: 'Movimentações', desc: 'Todas as entradas e saídas registradas' },
        { tipo: 'membros', label: 'Membros', desc: 'Lista completa com ID e email' },
      ].map(item => (
        <div key={item.tipo} className="flex items-center justify-between bg-card rounded-2xl shadow-sacred px-5 py-4">
          <div>
            <p className="text-sm font-display font-semibold text-foreground">{item.label}</p>
            <p className="text-xs font-body text-muted-foreground">{item.desc}</p>
          </div>
          <button
            onClick={() => exportar(item.tipo)}
            disabled={!!loading}
            className="btn-sacred px-4 py-2 text-xs flex items-center gap-1.5 rounded-lg disabled:opacity-50"
          >
            {loading === item.tipo
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exportando...</>
              : <><Download className="w-3.5 h-3.5" /> Exportar CSV</>
            }
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ImportacaoExportacaoPanel({ igrejaId }) {
  const [categorias, setCategorias] = useState([]);
  const [formas, setFormas] = useState([]);
  const [membros, setMembros] = useState([]);

  useEffect(() => {
    if (!igrejaId) return;
    Promise.all([
      base44.entities.CategoriaConfig.filter({ igreja_id: igrejaId }, 'nome', 200),
      base44.entities.FormaPagamentoConfig.filter({ igreja_id: igrejaId }, 'nome', 200),
      base44.entities.Membro.filter({ igreja_id: igrejaId }, 'nome', 2000),
    ]).then(([cats, fs, mbs]) => { setCategorias(cats); setFormas(fs); setMembros(mbs); });
  }, [igrejaId]);

  return (
    <Tabs defaultValue="importar">
      <TabsList className="mb-5">
        <TabsTrigger value="importar" className="flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" /> Importar
        </TabsTrigger>
        <TabsTrigger value="exportar" className="flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" /> Exportar
        </TabsTrigger>
      </TabsList>
      <TabsContent value="importar">
        <ImportPanel igrejaId={igrejaId} categorias={categorias} formas={formas} membros={membros} />
      </TabsContent>
      <TabsContent value="exportar">
        <ExportPanel igrejaId={igrejaId} />
      </TabsContent>
    </Tabs>
  );
}