import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bipador } from "@/components/app/Bipador";
import { Campo, PageHeader, SEL, Tabela, TD, Vazio, erroMsg } from "@/components/app/kit";
import { gravar, novoId, proximoNumero, useColecao } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { meta } from "@/lib/meta";
import { brl, centavos, dataHoraBR, hojeISO } from "@/lib/calc";
import { formasPagamento, type FormaPagamento, type Produto, type Venda } from "@/lib/schemas";

export const Route = createFileRoute("/pdv")({
  head: () => meta("PDV / Balcão", "Venda rápida no balcão com leitor de código de barras."),
  component: PDV,
});

type Item = { produtoId: string; descricao: string; codigoBarras: string; quantidade: number; valorUnitario: number; custoUnitario: number; max: number };

function PDV() {
  const { autor } = useAuth();
  const { dados: produtos } = useColecao<Produto>("produtos");
  const { dados: vendas } = useColecao<Venda>("vendas");
  const [itens, setItens] = useState<Item[]>([]);
  const [busca, setBusca] = useState("");
  const [desconto, setDesconto] = useState("0");
  const [forma, setForma] = useState<FormaPagamento>("PIX");
  const [recebido, setRecebido] = useState("");
  const [cliente, setCliente] = useState("");
  const [salvando, setSalvando] = useState(false);

  const adicionar = useCallback((p: Produto) => {
    setItens((lista) => {
      const ex = lista.find((i) => i.produtoId === p.id);
      const qtd = (ex?.quantidade ?? 0) + 1;
      if (qtd > p.quantidade) { toast.error(`Sem estoque de ${p.nome} (disponível ${p.quantidade}).`); return lista; }
      if (ex) return lista.map((i) => (i === ex ? { ...i, quantidade: qtd } : i));
      return [...lista, { produtoId: p.id, descricao: p.nome, codigoBarras: p.codigoBarras, quantidade: 1, valorUnitario: p.precoVenda, custoUnitario: p.custo, max: p.quantidade }];
    });
  }, []);
  const onCodigo = useCallback((c: string) => {
    const p = produtos.find((x) => x.codigoBarras === c);
    if (p) adicionar(p); else toast.error(`Código ${c} não encontrado`);
  }, [produtos, adicionar]);

  const subtotal = centavos(itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0));
  const desc = Math.min(subtotal, Math.max(0, Number(desconto) || 0));
  const total = centavos(subtotal - desc);
  const rec = forma === "Dinheiro" ? Number(recebido) || 0 : total;
  const troco = Math.max(0, centavos(rec - total));

  async function finalizar() {
    setSalvando(true);
    try {
      const id = novoId();
      const numero = await proximoNumero("vendas", "V");
      const agora = new Date().toISOString();
      await gravar({
        autor,
        escritas: [
          { colecao: "vendas", acao: "venda", detalhe: `Venda ${numero} · ${brl(total)} · ${forma}`, registro: { id, numero, itens: itens.map(({ max: _m, ...i }) => i), subtotal, desconto: desc, total, formaPagamento: forma, valorRecebido: rec, troco, clienteNome: cliente, data: agora } },
          { colecao: "lancamentos", acao: "pagamento", detalhe: `Recebido venda ${numero} · ${brl(total)}`, registro: { id: novoId(), tipo: "receber", descricao: `Venda balcão ${numero}`, valor: total, vencimento: hojeISO(), pagoEm: agora, formaPagamento: forma, categoria: "Vendas balcão", origem: "pdv", referenciaId: id, baixadoPor: autor.nome } },
        ],
        movimentos: itens.map((i) => ({ produtoId: i.produtoId, delta: -i.quantidade, origem: "pdv" as const, referenciaId: id, observacao: `Venda ${numero}` })),
      });
      toast.success(`Venda ${numero} concluída${troco ? ` · troco ${brl(troco)}` : ""}`);
      setItens([]); setDesconto("0"); setRecebido(""); setCliente("");
    } catch (e) { toast.error(erroMsg(e)); } finally { setSalvando(false); }
  }

  const sugestoes = busca.length >= 2 ? produtos.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 6) : [];
  const hoje = vendas.filter((v) => v.data.slice(0, 10) === hojeISO());
  return (
    <div className="space-y-4">
      <PageHeader titulo="PDV / Balcão" descricao={`Hoje: ${hoje.length} vendas · ${brl(hoje.reduce((s, v) => s + v.total, 0))}`} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <Bipador onCodigo={onCodigo} />
          <div className="relative">
            <Input placeholder="Ou busque pelo nome do produto" value={busca} onChange={(e) => setBusca(e.target.value)} />
            {sugestoes.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow">
                {sugestoes.map((p) => (
                  <button key={p.id} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => { adicionar(p); setBusca(""); }}>
                    <span>{p.nome}</span><span className="text-muted-foreground">{brl(p.precoVenda)} · {p.quantidade} un</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {itens.length === 0 ? <Vazio>Bipe um produto para começar a venda.</Vazio> : (
            <Tabela cab={["Produto", "Qtd", "Unit.", "Total", ""]}>
              {itens.map((i, idx) => (
                <tr key={i.produtoId}>
                  <td className={TD}>{i.descricao}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setItens(itens.map((x, j) => j === idx ? { ...x, quantidade: Math.max(1, x.quantidade - 1) } : x))}><Minus className="h-3 w-3" /></Button>
                      {i.quantidade}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => i.quantidade < i.max ? setItens(itens.map((x, j) => j === idx ? { ...x, quantidade: x.quantidade + 1 } : x)) : toast.error("Sem estoque suficiente")}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </td>
                  <td className={TD}>{brl(i.valorUnitario)}</td>
                  <td className={TD}>{brl(i.quantidade * i.valorUnitario)}</td>
                  <td className={TD}><Button size="icon" variant="ghost" onClick={() => setItens(itens.filter((_, j) => j !== idx))}><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </Tabela>
          )}
        </div>
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <Campo rotulo="Cliente (opcional)"><Input value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
          <Campo rotulo="Desconto (R$)"><Input type="number" value={desconto} onChange={(e) => setDesconto(e.target.value)} /></Campo>
          <Campo rotulo="Forma de pagamento"><select className={SEL} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>{formasPagamento.map((f) => <option key={f}>{f}</option>)}</select></Campo>
          {forma === "Dinheiro" && <Campo rotulo="Valor recebido"><Input type="number" value={recebido} onChange={(e) => setRecebido(e.target.value)} /></Campo>}
          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
            <div className="flex justify-between"><span>Desconto</span><span>− {brl(desc)}</span></div>
            <div className="flex justify-between font-display text-2xl font-bold"><span>Total</span><span>{brl(total)}</span></div>
            {forma === "Dinheiro" && <div className="flex justify-between text-success"><span>Troco</span><span>{brl(troco)}</span></div>}
          </div>
          <Button className="w-full" size="lg" disabled={!itens.length || salvando} onClick={() => void finalizar()}>Finalizar venda</Button>
        </div>
      </div>
      <div>
        <h2 className="mb-2 font-display text-lg font-bold">Vendas recentes</h2>
        <Tabela cab={["Nº", "Data", "Itens", "Pagamento", "Total", "Vendedor"]}>
          {[...vendas].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 15).map((v) => (
            <tr key={v.id}><td className={TD}>{v.numero}</td><td className={TD}>{dataHoraBR(v.data)}</td><td className={TD}>{v.itens.length}</td><td className={TD}>{v.formaPagamento}</td><td className={TD}>{brl(v.total)}</td><td className={TD}>{v.criadoPorNome}</td></tr>
          ))}
        </Tabela>
      </div>
    </div>
  );
}
