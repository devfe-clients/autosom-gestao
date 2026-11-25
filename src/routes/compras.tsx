import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PackageCheck, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, PageHeader, SEL, StatusBadge, Tabela, TD, Vazio, erroMsg } from "@/components/app/kit";
import { gravar, novoId, proximoNumero, useColecao } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { meta } from "@/lib/meta";
import { brl, centavos, dataBR, hojeISO } from "@/lib/calc";
import { formasPagamento, type Compra, type Fornecedor, type Produto } from "@/lib/schemas";

export const Route = createFileRoute("/compras")({
  head: () => meta("Compras", "Pedidos a fornecedores e recebimento de mercadorias."),
  component: Compras,
});

type ItemF = { produtoId: string; quantidade: string; custoUnitario: string };
type FormC = { fornecedorId: string; notaFiscal: string; vencimento: string; formaPagamento: string; itens: ItemF[] };

function Compras() {
  const { autor } = useAuth();
  const { dados } = useColecao<Compra>("compras");
  const { dados: fornecedores } = useColecao<Fornecedor>("fornecedores");
  const { dados: produtos } = useColecao<Produto>("produtos");
  const [form, setForm] = useState<FormC | null>(null);
  const [forn, setForn] = useState<{ nome: string; cnpj: string; telefone: string; contato: string } | null>(null);
  async function salvarForn() {
    if (!forn) return;
    try { await gravar({ autor, escritas: [{ colecao: "fornecedores", registro: { ...forn, id: novoId() } }] }); setForn(null); toast.success("Fornecedor salvo"); }
    catch (e) { toast.error(erroMsg(e)); }
  }
  async function salvar() {
    if (!form) return;
    try {
      const itens = form.itens.map((i) => ({ produtoId: i.produtoId, descricao: produtos.find((p) => p.id === i.produtoId)?.nome ?? "", quantidade: Number(i.quantidade), custoUnitario: Number(i.custoUnitario) }));
      const numero = await proximoNumero("compras", "C");
      await gravar({ autor, escritas: [{ colecao: "compras", registro: { id: novoId(), numero, fornecedorId: form.fornecedorId, fornecedorNome: fornecedores.find((f) => f.id === form.fornecedorId)?.nome ?? "", itens, total: centavos(itens.reduce((s, i) => s + i.quantidade * i.custoUnitario, 0)), status: "Pedido", dataPedido: hojeISO(), notaFiscal: form.notaFiscal, vencimento: form.vencimento, formaPagamento: form.formaPagamento } }] });
      setForm(null); toast.success(`Pedido ${numero} criado`);
    } catch (e) { toast.error(erroMsg(e)); }
  }
  async function receber(c: Compra) {
    if (!confirm(`Receber ${c.numero}? O estoque será somado.`)) return;
    try {
      await gravar({
        autor,
        escritas: [
          { colecao: "compras", acao: "status", detalhe: `Compra ${c.numero} recebida`, registro: { ...c, status: "Recebida", dataRecebimento: hojeISO() } },
          { colecao: "lancamentos", registro: { id: novoId(), tipo: "pagar", descricao: `Compra ${c.numero} · ${c.fornecedorNome}`, valor: c.total, vencimento: c.vencimento || hojeISO(), formaPagamento: c.formaPagamento, categoria: "Compras de mercadoria", origem: "compra", referenciaId: c.id } },
        ],
        movimentos: c.itens.map((i) => ({ produtoId: i.produtoId, delta: i.quantidade, origem: "compra" as const, referenciaId: c.id, observacao: `Compra ${c.numero}` })),
      });
      toast.success("Mercadoria recebida e estoque atualizado");
    } catch (e) { toast.error(erroMsg(e)); }
  }
  const setItem = (idx: number, k: keyof ItemF, v: string) => setForm((f) => f && { ...f, itens: f.itens.map((i, j) => {
    if (j !== idx) return i;
    const n = { ...i, [k]: v };
    if (k === "produtoId") n.custoUnitario = String(produtos.find((p) => p.id === v)?.custo ?? 0);
    return n;
  }) });
  return (
    <div className="space-y-4">
      <PageHeader titulo="Compras" acoes={<>
        <Button variant="secondary" onClick={() => setForn({ nome: "", cnpj: "", telefone: "", contato: "" })}>Novo fornecedor</Button>
        <Button onClick={() => setForm({ fornecedorId: "", notaFiscal: "", vencimento: hojeISO(), formaPagamento: "Boleto", itens: [{ produtoId: "", quantidade: "1", custoUnitario: "0" }] })}><Plus className="mr-1 h-4 w-4" />Novo pedido</Button>
      </>} />
      {dados.length === 0 ? <Vazio>Nenhuma compra registrada.</Vazio> : (
        <Tabela cab={["Nº", "Fornecedor", "Pedido", "Itens", "Total", "Status", ""]}>
          {[...dados].sort((a, b) => b.numero.localeCompare(a.numero)).map((c) => (
            <tr key={c.id}>
              <td className={TD}>{c.numero}</td><td className={TD}>{c.fornecedorNome}</td><td className={TD}>{dataBR(c.dataPedido + "T12:00")}</td>
              <td className={TD}>{c.itens.map((i) => `${i.quantidade}× ${i.descricao}`).join(", ")}</td>
              <td className={TD}>{brl(c.total)}</td><td className={TD}><StatusBadge status={c.status} /></td>
              <td className={TD}>{c.status === "Pedido" && <Button size="sm" onClick={() => void receber(c)}><PackageCheck className="mr-1 h-4 w-4" />Receber</Button>}</td>
            </tr>
          ))}
        </Tabela>
      )}
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Novo pedido de compra</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo rotulo="Fornecedor"><select className={SEL} value={form.fornecedorId} onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}><option value="">Selecione…</option>{fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></Campo>
                <Campo rotulo="Nota fiscal"><Input value={form.notaFiscal} onChange={(e) => setForm({ ...form, notaFiscal: e.target.value })} /></Campo>
                <Campo rotulo="Vencimento"><Input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></Campo>
                <Campo rotulo="Pagamento"><select className={SEL} value={form.formaPagamento} onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })}>{formasPagamento.map((f) => <option key={f}>{f}</option>)}</select></Campo>
              </div>
              {form.itens.map((i, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_110px_40px] gap-2">
                  <select className={SEL} value={i.produtoId} onChange={(e) => setItem(idx, "produtoId", e.target.value)}><option value="">Produto…</option>{produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
                  <Input type="number" value={i.quantidade} onChange={(e) => setItem(idx, "quantidade", e.target.value)} />
                  <Input type="number" step="0.01" value={i.custoUnitario} onChange={(e) => setItem(idx, "custoUnitario", e.target.value)} />
                  <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, itens: form.itens.filter((_, j) => j !== idx) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={() => setForm({ ...form, itens: [...form.itens, { produtoId: "", quantidade: "1", custoUnitario: "0" }] })}>+ Item</Button>
            </div>
          )}
          <DialogFooter><Button onClick={() => void salvar()}>Salvar pedido</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!forn} onOpenChange={(v) => !v && setForn(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo fornecedor</DialogTitle></DialogHeader>
          {forn && (
            <div className="space-y-3">
              <Campo rotulo="Nome"><Input value={forn.nome} onChange={(e) => setForn({ ...forn, nome: e.target.value })} /></Campo>
              <Campo rotulo="CNPJ"><Input value={forn.cnpj} onChange={(e) => setForn({ ...forn, cnpj: e.target.value })} /></Campo>
              <Campo rotulo="Telefone"><Input value={forn.telefone} onChange={(e) => setForn({ ...forn, telefone: e.target.value })} /></Campo>
              <Campo rotulo="Contato"><Input value={forn.contato} onChange={(e) => setForn({ ...forn, contato: e.target.value })} /></Campo>
            </div>
          )}
          <DialogFooter><Button onClick={() => void salvarForn()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
