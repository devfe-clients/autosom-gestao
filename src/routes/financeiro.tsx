import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, PageHeader, SEL, Stat, StatusBadge, Tabela, TD, Vazio, erroMsg } from "@/components/app/kit";
import { gravar, novoId, useColecao } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { meta } from "@/lib/meta";
import { brl, dataBR, hojeISO } from "@/lib/calc";
import { formasPagamento, type Lancamento } from "@/lib/schemas";

export const Route = createFileRoute("/financeiro")({
  head: () => meta("Financeiro", "Contas a pagar e a receber da Adriano Auto Som."),
  component: Financeiro,
});

const situacao = (l: Lancamento) => (l.pagoEm ? "Pago" : l.vencimento < hojeISO() ? "Vencido" : "Em aberto");
const VAZIO = { tipo: "pagar", descricao: "", valor: "", vencimento: hojeISO(), formaPagamento: "PIX", categoria: "Despesas gerais", observacao: "" };

function Financeiro() {
  const { autor } = useAuth();
  const { dados } = useColecao<Lancamento>("lancamentos");
  const [filtro, setFiltro] = useState<"todos" | "receber" | "pagar">("todos");
  const [aba, setAba] = useState<"abertos" | "pagos">("abertos");
  const [form, setForm] = useState<typeof VAZIO | null>(null);
  const mes = hojeISO().slice(0, 7);
  const lista = dados.filter((l) => (filtro === "todos" || l.tipo === filtro) && (aba === "pagos" ? !!l.pagoEm : !l.pagoEm)).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const somar = (f: (l: Lancamento) => boolean) => dados.filter(f).reduce((s, l) => s + l.valor, 0);
  async function salvar() {
    if (!form) return;
    try { await gravar({ autor, escritas: [{ colecao: "lancamentos", registro: { ...form, id: novoId(), origem: "manual" } }] }); setForm(null); toast.success("Lançamento criado"); }
    catch (e) { toast.error(erroMsg(e)); }
  }
  async function baixar(l: Lancamento) {
    try { await gravar({ autor, escritas: [{ colecao: "lancamentos", acao: "pagamento", detalhe: `Baixa: ${l.descricao} · ${brl(l.valor)}`, registro: { ...l, pagoEm: new Date().toISOString(), baixadoPor: autor.nome } }] }); toast.success("Pagamento registrado"); }
    catch (e) { toast.error(erroMsg(e)); }
  }
  const set = (k: keyof typeof VAZIO) => (e: { target: { value: string } }) => setForm((f) => f && { ...f, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <PageHeader titulo="Financeiro" acoes={<Button onClick={() => setForm({ ...VAZIO })}><Plus className="mr-1 h-4 w-4" />Novo lançamento</Button>} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat rotulo="Recebido no mês" tom="ok" valor={brl(somar((l) => l.tipo === "receber" && l.pagoEm.slice(0, 7) === mes))} />
        <Stat rotulo="Pago no mês" tom="perigo" valor={brl(somar((l) => l.tipo === "pagar" && l.pagoEm.slice(0, 7) === mes))} />
        <Stat rotulo="A receber" valor={brl(somar((l) => l.tipo === "receber" && !l.pagoEm))} />
        <Stat rotulo="A pagar (vencidos)" tom="alerta" valor={brl(somar((l) => l.tipo === "pagar" && !l.pagoEm))} detalhe={brl(somar((l) => l.tipo === "pagar" && situacao(l) === "Vencido"))} />
      </div>
      <div className="flex flex-wrap gap-2">
        {(["abertos", "pagos"] as const).map((a) => <Button key={a} size="sm" variant={aba === a ? "default" : "secondary"} onClick={() => setAba(a)}>{a === "abertos" ? "Em aberto" : "Pagos"}</Button>)}
        <span className="mx-2" />
        {(["todos", "receber", "pagar"] as const).map((a) => <Button key={a} size="sm" variant={filtro === a ? "default" : "outline"} onClick={() => setFiltro(a)}>{a}</Button>)}
      </div>
      {lista.length === 0 ? <Vazio>Nada por aqui.</Vazio> : (
        <Tabela cab={["Vencimento", "Descrição", "Tipo", "Forma", "Valor", "Situação", ""]}>
          {lista.map((l) => (
            <tr key={l.id}>
              <td className={TD}>{dataBR(l.vencimento + "T12:00")}</td>
              <td className={TD}>{l.descricao}<div className="text-xs text-muted-foreground">{l.categoria}{l.baixadoPor && ` · baixa por ${l.baixadoPor}`}</div></td>
              <td className={`${TD} ${l.tipo === "receber" ? "text-success" : "text-destructive"}`}>{l.tipo}</td>
              <td className={TD}>{l.formaPagamento}</td>
              <td className={`${TD} font-semibold`}>{brl(l.valor)}</td>
              <td className={TD}><StatusBadge status={situacao(l)} /></td>
              <td className={TD}>{!l.pagoEm && <Button size="sm" variant="secondary" onClick={() => void baixar(l)}><Check className="mr-1 h-4 w-4" />Baixar</Button>}</td>
            </tr>
          ))}
        </Tabela>
      )}
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Tipo"><select className={SEL} value={form.tipo} onChange={set("tipo")}><option value="pagar">A pagar</option><option value="receber">A receber</option></select></Campo>
              <Campo rotulo="Valor (R$)"><Input type="number" step="0.01" value={form.valor} onChange={set("valor")} /></Campo>
              <Campo rotulo="Descrição" className="sm:col-span-2"><Input value={form.descricao} onChange={set("descricao")} /></Campo>
              <Campo rotulo="Vencimento"><Input type="date" value={form.vencimento} onChange={set("vencimento")} /></Campo>
              <Campo rotulo="Forma"><select className={SEL} value={form.formaPagamento} onChange={set("formaPagamento")}>{formasPagamento.map((f) => <option key={f}>{f}</option>)}</select></Campo>
              <Campo rotulo="Categoria" className="sm:col-span-2"><Input value={form.categoria} onChange={set("categoria")} /></Campo>
            </div>
          )}
          <DialogFooter><Button onClick={() => void salvar()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
