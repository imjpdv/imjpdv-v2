import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function fmtData(d) {
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return '-'; }
}

function buildRows(movsPeríodo, categorias, formas) {
  return movsPeríodo
    .sort((a, b) => b.data?.localeCompare(a.data))
    .map(m => ({
      data: fmtData(m.data),
      tipo: m.tipo === 'entrada' ? 'Entrada' : 'Saída',
      categoria: categorias.find(c => c.id === m.categoria_id)?.nome || '—',
      membro: m.membro_nome || '—',
      forma: formas.find(f => f.id === m.forma_pagamento_id)?.nome || '—',
      descricao: m.descricao || m.observacoes || '—',
      valor: fmt(m.valor),
      valorNum: m.valor || 0,
      isEntrada: m.tipo === 'entrada',
    }));
}

export default function ExportarRelatorio({ movsPeríodo, agrupado, totaisPeriodo, saldoCaixa, categorias, formas, filters }) {
  const [loading, setLoading] = useState(null);

  const exportCSV = () => {
    setLoading('csv');
    const rows = buildRows(movsPeríodo, categorias, formas);
    const header = ['Data', 'Tipo', 'Categoria', 'Membro', 'Forma Pgto', 'Descrição', 'Valor'];
    const lines = [
      '# PRESTAÇÃO DE CONTAS',
      `# Entradas: ${fmt(totaisPeriodo.entradas)} | Saídas: ${fmt(totaisPeriodo.saidas)} | Saldo Período: ${fmt(totaisPeriodo.saldo)} | Saldo Caixa: ${fmt(saldoCaixa)}`,
      '',
      header.join(';'),
      ...rows.map(r => [r.data, r.tipo, r.categoria, r.membro, r.forma, r.descricao, `"${r.valor}"`].join(';')),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'prestacao-contas.csv'; a.click();
    URL.revokeObjectURL(url);
    setLoading(null);
  };

  const exportXLSX = () => {
    setLoading('xlsx');
    const rows = buildRows(movsPeríodo, categorias, formas);
    // Geração manual de XLSX simples (formato CSV com extensão xlsx para compatibilidade)
    const header = ['Data', 'Tipo', 'Categoria', 'Membro', 'Forma Pgto', 'Descrição', 'Valor (R$)'];
    const lines = [
      ['PRESTAÇÃO DE CONTAS'],
      [`Entradas: ${fmt(totaisPeriodo.entradas)}`, `Saídas: ${fmt(totaisPeriodo.saidas)}`, `Saldo Período: ${fmt(totaisPeriodo.saldo)}`, `Saldo em Caixa: ${fmt(saldoCaixa)}`],
      [],
      header,
      ...rows.map(r => [r.data, r.tipo, r.categoria, r.membro, r.forma, r.descricao, r.valorNum]),
    ];
    const csv = lines.map(l => l.join('\t')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'prestacao-contas.xls'; a.click();
    URL.revokeObjectURL(url);
    setLoading(null);
  };

  const exportPDF = () => {
    setLoading('pdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 16;

    const drawLine = () => { doc.setDrawColor(220); doc.line(margin, y, W - margin, y); y += 4; };
    const addPage = () => { doc.addPage(); y = 14; };
    const checkY = (needed = 8) => { if (y + needed > 195) addPage(); };

    // Título
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(20);
    doc.text('Prestação de Contas', margin, y); y += 7;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, y); y += 8;
    drawLine();

    // Resumo
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(20);
    doc.text('Resumo', margin, y); y += 6;
    const resumo = [
      ['Saldo em Caixa (histórico)', fmt(saldoCaixa)],
      ['Entradas do Período', fmt(totaisPeriodo.entradas)],
      ['Saídas do Período', fmt(totaisPeriodo.saidas)],
      ['Saldo do Período', fmt(totaisPeriodo.saldo)],
    ];
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(40);
    resumo.forEach(([label, value]) => {
      checkY();
      doc.setFont('helvetica', 'bold'); doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal'); doc.text(value, margin + 80, y);
      y += 6;
    });
    y += 4; drawLine();

    // Agrupamento por categoria
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(20);
    doc.text('Por Categoria', margin, y); y += 6;
    const catCols = [margin, margin + 80, margin + 120, margin + 160];
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80);
    ['Categoria', 'Entradas', 'Saídas', 'Saldo'].forEach((h, i) => doc.text(h, catCols[i], y));
    y += 5; doc.setTextColor(40);
    agrupado.forEach(g => {
      checkY();
      doc.setFont('helvetica', 'normal');
      doc.text(g.nome.substring(0, 35), catCols[0], y);
      doc.setTextColor(22, 163, 74); doc.text(fmt(g.entradas), catCols[1], y);
      doc.setTextColor(220, 38, 38); doc.text(fmt(g.saidas), catCols[2], y);
      doc.setTextColor(g.saldo >= 0 ? 22 : 220, g.saldo >= 0 ? 163 : 38, g.saldo >= 0 ? 74 : 38);
      doc.text(fmt(g.saldo), catCols[3], y);
      doc.setTextColor(40);
      y += 5;
    });
    y += 4; drawLine();

    // Detalhamento
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(20);
    doc.text('Detalhamento', margin, y); y += 6;
    const cols = [margin, margin + 22, margin + 38, margin + 78, margin + 110, margin + 145, margin + 195];
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(80);
    ['Data', 'Tipo', 'Categoria', 'Membro', 'Forma Pgto', 'Descrição', 'Valor'].forEach((h, i) => doc.text(h, cols[i], y));
    y += 5;
    const rows = buildRows(movsPeríodo, categorias, formas);
    rows.forEach(r => {
      checkY(5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
      doc.text(r.data, cols[0], y);
      doc.setTextColor(r.isEntrada ? 22 : 220, r.isEntrada ? 163 : 38, r.isEntrada ? 74 : 38);
      doc.text(r.tipo, cols[1], y);
      doc.setTextColor(60);
      doc.text(r.categoria.substring(0, 18), cols[2], y);
      doc.text(r.membro.substring(0, 16), cols[3], y);
      doc.text(r.forma.substring(0, 14), cols[4], y);
      doc.text(r.descricao.substring(0, 20), cols[5], y);
      doc.setTextColor(r.isEntrada ? 22 : 220, r.isEntrada ? 163 : 38, r.isEntrada ? 74 : 38);
      doc.text(r.valor, cols[6], y);
      y += 5;
    });

    doc.save('prestacao-contas.pdf');
    setLoading(null);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!!loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPDF}>
          <FileText className="w-4 h-4 mr-2 text-red-500" /> Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportXLSX}>
          <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Exportar Excel (.xls)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2 text-blue-500" /> Exportar CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}