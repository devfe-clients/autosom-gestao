import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, PageHeader, SEL, Stat, Tabela, TD, Vazio, erroMsg } from "@/components/app/kit";
import { gravar, novoId, useColecao } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { meta } from "@/lib/meta";
import { brl, dataHoraBR } from "@/lib/calc";
import { gerarEANInterno } from "@/lib/codigo-barras";
import { categoriasProduto, type Movimento, type Produto } from "@/lib/schemas";

export const Route = createFileRoute("/estoque")({
  head: () => meta("Estoque", "Produtos, saldos e movimentações de estoque."),
  component: Estoque,
});

const VAZIO = { nome: "", codigoBarras: "", sku: "", categoria: "Outros", marca: "", unidade: "UN", custo: "0", precoVenda: "0", quantidade: "0", estoqueMinimo: "1", localizacao: "" };
type Form = typeof VAZIO & { id?: string; criadoEm?: string };

function Estoque() {
  const { autor, pode } = useAuth();
  const { dados } = useColecao<Produto>("produtos");
  const { dados: movs } = useColecao<Movimento>("movimentos");
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [ajuste, setAjuste] = useState<{ p: Produto; delta: string; obs: string } | null>(null);
  const verCusto = pode("ver-custo");
  const categorias = [...new Set<string>([...categoriasProduto, ...dados.map((p) => p.categoria).filter(Boolean)])].sort((a, b) => a.localeCompare(b));
  const lista = dados
    .filter((p) => !categoria || p.categoria === categoria)
    .filter((p) => `${p.nome} ${p.codigoBarras} ${p.marca ?? ""}`.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const totais = lista.reduce(
    (t, p) => ({ un: t.un + p.quantidade, custo: t.custo + p.quantidade * p.custo, venda: t.venda + p.quantidade * p.precoVenda }),
    { un: 0, custo: 0, venda: 0 },
  );
  async function salvar() {
    if (!form) return;
    const atual = dados.find((p) => p.id === form.id);
    if (form.codigoBarras && dados.some((p) => p.codigoBarras === form.codigoBarras && p.id !== form.id)) return void toast.error("Código de barras já usado em outro produto.");
    try {
      await gravar({ autor, escritas: [{ colecao: "produtos", registro: { ...atual, ...form, id: form.id ?? novoId(), quantidade: atual ? atual.quantidade : form.quantidade, ativo: true } }] });
      toast.success("Produto salvo");
      setForm(null);
    } catch (e) { toast.error(erroMsg(e)); }
  }
  async function ajustar() {
    if (!ajuste) return;
    try {
      await gravar({ autor, movimentos: [{ produtoId: ajuste.p.id, delta: Number(ajuste.delta), origem: "ajuste", observacao: ajuste.obs || "Ajuste manual" }] });
      toast.success("Estoque ajustado");
      setAjuste(null);
    } catch (e) { toast.error(erroMsg(e)); }
  }
  const set = (k: keyof typeof VAZIO) => (e: { target: { value: string } }) => setForm((f) => f && { ...f, [k]: e.target.value });
  return (
    <div className="space-y-6">
      <PageHeader titulo="Estoque" descricao={`${lista.length} de ${dados.length} produtos${busca || categoria ? " (filtrado)" : ""}`} acoes={<Button onClick={() => setForm({ ...VAZIO })}><Plus className="mr-1 h-4 w-4" />Novo produto</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat rotulo="Unidades em estoque" valor={String(totais.un)} detalhe={`${lista.length} produtos`} />
        {verCusto && <Stat rotulo="Valor a custo" valor={brl(totais.custo)} />}
        <Stat rotulo="Valor a preço de venda" valor={brl(totais.venda)} />
        {verCusto && (
          <Stat
            rotulo="Lucro projetado"
            tom="ok"
            valor={brl(totais.venda - totais.custo)}
            detalhe={totais.venda > 0 ? `${(((totais.venda - totais.custo) / totais.venda) * 100).toFixed(1)}% de margem` : undefined}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-sm" placeholder="Buscar por nome, código ou marca" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className={`${SEL} w-full sm:w-64`} value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {lista.length === 0 ? <Vazio>Nenhum produto.</Vazio> : (
        <Tabela cab={["Produto", "Código", "Categoria", ...(verCusto ? ["Custo"] : []), "Venda", "Saldo", "Total em estoque", ""]}>
          {lista.map((p) => (
            <tr key={p.id}>
              <td className={TD}>{p.nome}<div className="text-xs text-muted-foreground">{p.marca}</div></td>
              <td className={`${TD} font-mono text-xs`}>{p.codigoBarras || "—"}</td>
              <td className={TD}>{p.categoria}</td>
              {pode("ver-custo") && <td className={TD}>{brl(p.custo)}</td>}
              <td className={TD}>{brl(p.precoVenda)}</td>
              <td className={`${TD} font-bold ${p.quantidade <= p.estoqueMinimo ? "text-warning" : ""}`}>{p.quantidade} {p.unidade}</td>
              <td className={TD}>
                <div className="font-semibold">{brl(p.quantidade * p.precoVenda)}</div>
                {verCusto && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span>custo {brl(p.quantidade * p.custo)}</span>
                    {(() => {
                      const margemPct = p.custo > 0 ? ((p.precoVenda - p.custo) / p.custo) * 100 : 0;
                      const q =
                        margemPct >= 60
                          ? { label: "▲ Boa", cor: "text-emerald-500" }
                          : margemPct >= 30
                          ? { label: "▶ Razoável", cor: "text-amber-500" }
                          : { label: "▼ Baixa", cor: "text-rose-500" };
                      return (
                        <span className={`font-medium ${q.cor}`}>
                          ({margemPct.toFixed(0)}% {q.label})
                        </span>
                      );
                    })()}
                  </div>
                )}
              </td>
              <td className={`${TD} whitespace-nowrap text-right`}>
                <Button size="icon" variant="ghost" onClick={() => setForm({ ...VAZIO, ...p, sku: p.sku ?? "", marca: p.marca ?? "", localizacao: p.localizacao ?? "", custo: String(p.custo), precoVenda: String(p.precoVenda), quantidade: String(p.quantidade), estoqueMinimo: String(p.estoqueMinimo) } as Form)}><Pencil className="h-4 w-4" /></Button>
                {pode("ajustar-estoque") && <Button size="icon" variant="ghost" title="Ajustar saldo" onClick={() => setAjuste({ p, delta: "", obs: "" })}><SlidersHorizontal className="h-4 w-4" /></Button>}
              </td>
            </tr>
          ))}
        </Tabela>
      )}
      <div>
        <h2 className="mb-2 font-display text-lg font-bold">Últimas movimentações</h2>
        <Tabela cab={["Data", "Produto", "Tipo", "Qtd", "Saldo", "Origem", "Por"]}>
          {[...movs].sort((a, b) => b.criadoEm!.localeCompare(a.criadoEm!)).slice(0, 30).map((m) => (
            <tr key={m.id}>
              <td className={TD}>{dataHoraBR(m.criadoEm)}</td>
              <td className={TD}>{m.produtoNome}</td>
              <td className={`${TD} ${m.tipo === "entrada" ? "text-success" : "text-destructive"}`}>{m.tipo}</td>
              <td className={TD}>{m.delta > 0 ? "+" : ""}{m.delta}</td>
              <td className={TD}>{m.saldoAnterior} → {m.saldoApos}</td>
              <td className={TD}>{m.origem}</td>
              <td className={TD}>{m.criadoPorNome}</td>
            </tr>
          ))}
        </Tabela>
      </div>
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{form?.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Nome" className="sm:col-span-2"><Input value={form.nome} onChange={set("nome")} /></Campo>
              <Campo rotulo="Código de barras">
                <div className="flex gap-2">
                  <Input value={form.codigoBarras} onChange={set("codigoBarras")} className="font-mono" />
                  <Button type="button" variant="secondary" onClick={() => setForm({ ...form, codigoBarras: gerarEANInterno(dados.map((p) => p.codigoBarras)) })}>Gerar</Button>
                </div>
              </Campo>
              <Campo rotulo="Marca"><Input value={form.marca} onChange={set("marca")} /></Campo>
              <Campo rotulo="Categoria"><select className={SEL} value={form.categoria} onChange={set("categoria")}>{categoriasProduto.map((c) => <option key={c}>{c}</option>)}</select></Campo>
              <Campo rotulo="Unidade"><select className={SEL} value={form.unidade} onChange={set("unidade")}>{["UN", "PAR", "KIT", "M", "CX"].map((c) => <option key={c}>{c}</option>)}</select></Campo>
              <Campo rotulo="Custo (R$)"><Input type="number" step="0.01" value={form.custo} onChange={set("custo")} /></Campo>
              <Campo rotulo="Preço de venda (R$)"><Input type="number" step="0.01" value={form.precoVenda} onChange={set("precoVenda")} /></Campo>
              {(() => {
                const custo = Number(form.custo) || 0;
                const venda = Number(form.precoVenda) || 0;
                if (custo <= 0 && venda <= 0) return null;
                const margemPct = custo > 0 ? ((venda - custo) / custo) * 100 : 0;
                const qualidade =
                  margemPct >= 60
                    ? { label: "▲ Boa", cor: "text-emerald-500" }
                    : margemPct >= 30
                    ? { label: "▶ Razoável", cor: "text-amber-500" }
                    : { label: "▼ Baixa", cor: "text-rose-500" };
                return (
                  <div className="sm:col-span-2 rounded-md bg-muted px-3 py-2 text-sm flex items-center justify-between border border-border">
                    <span className="text-muted-foreground">Margem sobre custo</span>
                    <span className={`font-semibold ${qualidade.cor}`}>
                      {margemPct.toFixed(0)}% {qualidade.label}
                    </span>
                  </div>
                );
              })()}
              <Campo rotulo={form.id ? "Saldo (use ajuste)" : "Saldo inicial"}><Input type="number" value={form.quantidade} disabled={!!form.id} onChange={set("quantidade")} /></Campo>
              <Campo rotulo="Estoque mínimo"><Input type="number" value={form.estoqueMinimo} onChange={set("estoqueMinimo")} /></Campo>
              <Campo rotulo="Localização" className="sm:col-span-2"><Input value={form.localizacao} onChange={set("localizacao")} /></Campo>
            </div>
          )}
          <DialogFooter><Button onClick={() => void salvar()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!ajuste} onOpenChange={(v) => !v && setAjuste(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ajustar: {ajuste?.p.nome}</DialogTitle></DialogHeader>
          {ajuste && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Saldo atual: {ajuste.p.quantidade}</p>
              <Campo rotulo="Quantidade (+ entra / − sai)"><Input type="number" value={ajuste.delta} onChange={(e) => setAjuste({ ...ajuste, delta: e.target.value })} /></Campo>
              <Campo rotulo="Motivo"><Input value={ajuste.obs} onChange={(e) => setAjuste({ ...ajuste, obs: e.target.value })} /></Campo>
            </div>
          )}
          <DialogFooter><Button onClick={() => void ajustar()}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
