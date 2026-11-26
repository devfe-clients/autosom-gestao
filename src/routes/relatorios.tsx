import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Campo, PageHeader, Stat, Tabela, TD } from "@/components/app/kit";
import { Input } from "@/components/ui/input";
import { useColecao } from "@/lib/db";
import { meta } from "@/lib/meta";
import { brl, hojeISO } from "@/lib/calc";
import type { EventoAuditoria, Lancamento, OrdemServico, Venda } from "@/lib/schemas";

export const Route = createFileRoute("/relatorios")({
  head: () => meta("Relatórios", "Faturamento, despesas, produtos mais vendidos e produção por funcionário."),
  component: Relatorios,
});

function Relatorios() {
  const { dados: vendas } = useColecao<Venda>("vendas");
  const { dados: lanc } = useColecao<Lancamento>("lancamentos");
  const { dados: ordens } = useColecao<OrdemServico>("ordens");
  const { dados: aud } = useColecao<EventoAuditoria>("auditoria");
  const [de, setDe] = useState(hojeISO().slice(0, 8) + "01");
  const [ate, setAte] = useState(hojeISO());
  const dentro = (iso: string) => !!iso && iso.slice(0, 10) >= de && iso.slice(0, 10) <= ate;
  const v = vendas.filter((x) => dentro(x.data));
  const receitas = lanc.filter((l) => l.tipo === "receber" && dentro(l.pagoEm)).reduce((s, l) => s + l.valor, 0);
  const despesas = lanc.filter((l) => l.tipo === "pagar" && dentro(l.pagoEm)).reduce((s, l) => s + l.valor, 0);
  const custoVendas = v.reduce((s, x) => s + x.itens.reduce((t, i) => t + i.custoUnitario * i.quantidade, 0), 0);
  const top = new Map<string, { q: number; t: number }>();
  for (const x of v) for (const i of x.itens) { const a = top.get(i.descricao) ?? { q: 0, t: 0 }; top.set(i.descricao, { q: a.q + i.quantidade, t: a.t + i.quantidade * i.valorUnitario }); }
  const porForma = new Map<string, number>();
  for (const l of lanc.filter((l) => l.tipo === "receber" && dentro(l.pagoEm))) porForma.set(l.formaPagamento, (porForma.get(l.formaPagamento) ?? 0) + l.valor);
  const porUsuario = new Map<string, number>();
  for (const a of aud.filter((a) => dentro(a.data) && a.acao !== "login" && a.acao !== "logout")) porUsuario.set(a.usuarioNome, (porUsuario.get(a.usuarioNome) ?? 0) + 1);
  const osEntregues = ordens.filter((o) => o.tipo === "os" && o.status === "Entregue" && dentro(o.atualizadoEm ?? "")).length;
  return (
    <div className="space-y-5">
      <PageHeader titulo="Relatórios" />
      <div className="flex gap-3">
        <Campo rotulo="De"><Input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></Campo>
        <Campo rotulo="Até"><Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></Campo>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat rotulo="Receitas" tom="ok" valor={brl(receitas)} />
        <Stat rotulo="Despesas" tom="perigo" valor={brl(despesas)} />
        <Stat rotulo="Resultado" tom={receitas - despesas >= 0 ? "ok" : "perigo"} valor={brl(receitas - despesas)} />
        <Stat rotulo="Vendas balcão" valor={v.length} detalhe={`Margem ${brl(v.reduce((s, x) => s + x.total, 0) - custoVendas)}`} />
        <Stat rotulo="OS entregues" valor={osEntregues} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div><h2 className="mb-2 font-display font-bold">Mais vendidos</h2>
          <Tabela cab={["Produto", "Qtd", "Total"]}>{[...top].sort((a, b) => b[1].q - a[1].q).slice(0, 10).map(([n, x]) => <tr key={n}><td className={TD}>{n}</td><td className={TD}>{x.q}</td><td className={TD}>{brl(x.t)}</td></tr>)}</Tabela></div>
        <div><h2 className="mb-2 font-display font-bold">Recebido por forma</h2>
          <Tabela cab={["Forma", "Total"]}>{[...porForma].map(([f, t]) => <tr key={f}><td className={TD}>{f}</td><td className={TD}>{brl(t)}</td></tr>)}</Tabela></div>
        <div><h2 className="mb-2 font-display font-bold">Ações por funcionário</h2>
          <Tabela cab={["Usuário", "Ações"]}>{[...porUsuario].sort((a, b) => b[1] - a[1]).map(([u, n]) => <tr key={u}><td className={TD}>{u}</td><td className={TD}>{n}</td></tr>)}</Tabela></div>
      </div>
    </div>
  );
}
