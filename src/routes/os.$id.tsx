import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, PackageMinus, Plus, Printer, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Campo, PageHeader, SEL, StatusBadge, erroMsg } from "@/components/app/kit";
import { gravar, novoId, proximoNumero, useColecao } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { meta } from "@/lib/meta";
import { brl, centavos, dataHoraBR, hojeISO, somaItens, totalItem } from "@/lib/calc";
import { EMPRESA } from "@/lib/empresa";
import {
  estadosChecklist, formasPagamento, itensChecklist, statusOS, statusOrcamento,
  type Checklist, type Cliente, type FormaPagamento, type ItemOS, type OrdemServico, type Produto, type Veiculo,
} from "@/lib/schemas";

export const Route = createFileRoute("/os/$id")({
  head: () => meta("Ordem de serviço", "Detalhes da ordem de serviço ou orçamento."),
  component: Editor,
});

type O = Omit<OrdemServico, "id"> & { id: string };
const checkVazio = (): Checklist => ({ itens: {}, combustivel: "1/2", km: 0, tensaoBateria: "", pertences: "", observacoes: "", responsavel: "", dataHora: "" });

function Editor() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { autor } = useAuth();
  const { dados: ordens, carregando } = useColecao<OrdemServico>("ordens");
  const { dados: clientes } = useColecao<Cliente>("clientes");
  const { dados: veiculos } = useColecao<Veiculo>("veiculos");
  const { dados: produtos } = useColecao<Produto>("produtos");
  const novo = id === "nova-os" || id === "novo-orcamento";
  const [o, setO] = useState<O | null>(null);
  const [forma, setForma] = useState<FormaPagamento>("PIX");
  const [prodSel, setProdSel] = useState("");

  useEffect(() => {
    if (o && o.id === id) return;
    if (novo) {
      setO({ id: novoId(), numero: "", tipo: id === "nova-os" ? "os" : "orcamento", clienteId: "", veiculoId: "", status: "Aberta", situacaoOrcamento: "Pendente", emissao: new Date().toISOString(), previsao: "", validadeDias: 7, servicoSolicitado: "", observacoes: "", garantiaDias: 90, tecnico: "", itens: [], descontoGeral: 0, orcamentoOrigemId: "", pago: false, checklistEntrada: checkVazio() });
    } else if (!carregando) {
      const x = ordens.find((r) => r.id === id);
      if (x) setO({ ...x, checklistEntrada: x.checklistEntrada ?? checkVazio() });
    }
  }, [id, novo, ordens, carregando, o]);

  if (!o) return <p className="text-muted-foreground">{carregando ? "Carregando…" : "Registro não encontrado."}</p>;
  const isOS = o.tipo === "os";
  const salvo = ordens.find((r) => r.id === o.id);
  const subtotal = somaItens(o.itens);
  const total = centavos(subtotal - o.descontoGeral);
  const cliente = clientes.find((c) => c.id === o.clienteId);
  const veiculo = veiculos.find((v) => v.id === o.veiculoId);
  const up = (p: Partial<O>) => setO({ ...o, ...p });
  const upItem = (idx: number, p: Partial<ItemOS>) => up({ itens: o.itens.map((i, j) => (j === idx ? { ...i, ...p } : i)) });
  const upCheck = (p: Partial<Checklist>) => up({ checklistEntrada: { ...(o.checklistEntrada ?? checkVazio()), ...p } });

  async function salvar(extra: Partial<O> = {}, acao?: "status" | "pagamento", detalhe?: string) {
    if (!o) return false;
    try {
      const numero = o.numero || (await proximoNumero("ordens", isOS ? "OS" : "ORC"));
      const reg = { ...o, ...extra, numero };
      await gravar({ autor, escritas: [{ colecao: "ordens", registro: reg, ...(acao ? { acao } : {}), ...(detalhe ? { detalhe } : {}) }] });
      setO(reg);
      toast.success(`${numero} salvo`);
      if (novo) void nav({ to: "/os/$id", params: { id: reg.id }, replace: true });
      return true;
    } catch (e) { toast.error(erroMsg(e)); return false; }
  }
  async function baixarPecas() {
    if (!o || !salvo) return void toast.error("Salve a OS antes.");
    const pend = o.itens.filter((i) => i.tipo === "produto" && i.produtoId && !i.baixado);
    if (!pend.length) return void toast.info("Nenhuma peça pendente de baixa.");
    try {
      const reg = { ...o, itens: o.itens.map((i) => (pend.includes(i) ? { ...i, baixado: true } : i)) };
      await gravar({ autor, escritas: [{ colecao: "ordens", registro: reg, detalhe: `Baixa de peças da ${o.numero}` }], movimentos: pend.map((i) => ({ produtoId: i.produtoId, delta: -Math.round(i.quantidade), origem: "os" as const, referenciaId: o.id, observacao: `OS ${o.numero}` })) });
      setO(reg); toast.success("Peças baixadas do estoque");
    } catch (e) { toast.error(erroMsg(e)); }
  }
  async function pagar() {
    if (!o || !salvo) return void toast.error("Salve a OS antes.");
    try {
      const reg = { ...o, pago: true };
      await gravar({ autor, escritas: [
        { colecao: "ordens", registro: reg, acao: "pagamento", detalhe: `Pagamento ${o.numero} · ${brl(total)} · ${forma}` },
        { colecao: "lancamentos", acao: "pagamento", detalhe: `Recebido ${o.numero}`, registro: { id: novoId(), tipo: "receber", descricao: `OS ${o.numero} · ${cliente?.nome ?? ""}`, valor: total, vencimento: hojeISO(), pagoEm: new Date().toISOString(), formaPagamento: forma, categoria: "Serviços", origem: "os", referenciaId: o.id, baixadoPor: autor.nome } },
      ] });
      setO(reg); toast.success("Pagamento registrado");
    } catch (e) { toast.error(erroMsg(e)); }
  }
  async function converter() {
    if (!o || !salvo) return;
    try {
      const numero = await proximoNumero("ordens", "OS");
      const nova = { ...o, id: novoId(), numero, tipo: "os" as const, status: "Aberta" as const, orcamentoOrigemId: o.id, criadoEm: undefined, emissao: new Date().toISOString(), itens: o.itens.map((i) => ({ ...i, baixado: false })) };
      delete (nova as Partial<O>).criadoEm;
      if (!nova.veiculoId) return void toast.error("Selecione o veículo antes de converter.");
      await gravar({ autor, escritas: [
        { colecao: "ordens", registro: { ...o, situacaoOrcamento: "Convertido" }, acao: "status", detalhe: `${o.numero} convertido em ${numero}` },
        { colecao: "ordens", registro: nova },
      ] });
      toast.success(`OS ${numero} criada`);
      void nav({ to: "/os/$id", params: { id: nova.id } });
      setO(null);
    } catch (e) { toast.error(erroMsg(e)); }
  }
  function addProduto() {
    const p = produtos.find((x) => x.id === prodSel);
    if (!p || !o) return;
    up({ itens: [...o.itens, { id: novoId(), tipo: "produto", produtoId: p.id, descricao: p.nome, quantidade: 1, valorUnitario: p.precoVenda, custoUnitario: p.custo, desconto: 0, baixado: false }] });
    setProdSel("");
  }
  const ck = o.checklistEntrada ?? checkVazio();
  return (
    <div className="space-y-5">
      <div className="nao-imprimir">
        <Link to={isOS ? "/os" : "/orcamentos"} className="mb-2 inline-flex items-center text-sm text-muted-foreground"><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link>
        <PageHeader titulo={`${isOS ? "OS" : "Orçamento"} ${o.numero || "(nova)"}`} descricao={salvo ? `Criada por ${salvo.criadoPorNome} em ${dataHoraBR(salvo.criadoEm)} · alterada por ${salvo.atualizadoPorNome} em ${dataHoraBR(salvo.atualizadoEm)}` : "Ainda não salva"} acoes={<>
          <Button variant="secondary" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Imprimir</Button>
          {!isOS && salvo && o.situacaoOrcamento !== "Convertido" && <Button variant="secondary" onClick={() => void converter()}>Converter em OS</Button>}
          <Button onClick={() => void salvar()}>Salvar</Button>
        </>} />
      </div>
      <div className="hidden print:block">
        <p className="font-bold">{EMPRESA.nomeFantasia} — {EMPRESA.razaoSocial} — CNPJ {EMPRESA.cnpj}</p>
        <p className="text-sm">{EMPRESA.endereco} · {EMPRESA.cidade}</p>
        <h1 className="mt-2 text-xl font-bold">{isOS ? "Ordem de serviço" : "Orçamento"} {o.numero}</h1>
        <p className="text-sm">Cliente: {cliente?.nome} · {cliente?.telefone} · Veículo: {veiculo ? `${veiculo.marca} ${veiculo.modelo} ${veiculo.placa}` : "—"}</p>
      </div>
      <section className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Cliente"><select className={SEL} value={o.clienteId} onChange={(e) => up({ clienteId: e.target.value, veiculoId: "" })}><option value="">Selecione…</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
        <Campo rotulo="Veículo"><select className={SEL} value={o.veiculoId} onChange={(e) => up({ veiculoId: e.target.value })}><option value="">{isOS ? "Selecione…" : "(opcional)"}</option>{veiculos.filter((v) => v.clienteId === o.clienteId).map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.modelo}</option>)}</select></Campo>
        {isOS ? (
          <Campo rotulo="Status"><select className={SEL} value={o.status} onChange={(e) => up({ status: e.target.value as O["status"] })}>{statusOS.map((s) => <option key={s}>{s}</option>)}</select></Campo>
        ) : (
          <Campo rotulo="Situação"><select className={SEL} value={o.situacaoOrcamento} onChange={(e) => up({ situacaoOrcamento: e.target.value as O["situacaoOrcamento"] })}>{statusOrcamento.map((s) => <option key={s}>{s}</option>)}</select></Campo>
        )}
        <Campo rotulo="Técnico"><Input value={o.tecnico} onChange={(e) => up({ tecnico: e.target.value })} /></Campo>
        <Campo rotulo="Previsão"><Input type="date" value={o.previsao} onChange={(e) => up({ previsao: e.target.value })} /></Campo>
        {isOS ? <Campo rotulo="Garantia (dias)"><Input type="number" value={o.garantiaDias} onChange={(e) => up({ garantiaDias: Number(e.target.value) })} /></Campo>
          : <Campo rotulo="Validade (dias)"><Input type="number" value={o.validadeDias} onChange={(e) => up({ validadeDias: Number(e.target.value) })} /></Campo>}
        <Campo rotulo="Serviço solicitado" className="sm:col-span-2"><Textarea value={o.servicoSolicitado} onChange={(e) => up({ servicoSolicitado: e.target.value })} /></Campo>
      </section>

      {isOS && (
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 font-display text-lg font-bold">Checklist de entrada do veículo</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {itensChecklist.map((item) => (
              <div key={item} className="flex items-center justify-between gap-2 text-sm">
                <span>{item}</span>
                <select className={`${SEL} w-32`} value={ck.itens[item] ?? ""} onChange={(e) => upCheck({ itens: { ...ck.itens, [item]: e.target.value as (typeof estadosChecklist)[number] } })}>
                  <option value="">—</option>{estadosChecklist.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <Campo rotulo="Combustível"><select className={SEL} value={ck.combustivel} onChange={(e) => upCheck({ combustivel: e.target.value as Checklist["combustivel"] })}>{["Reserva", "1/4", "1/2", "3/4", "Cheio"].map((s) => <option key={s}>{s}</option>)}</select></Campo>
            <Campo rotulo="KM"><Input type="number" value={ck.km} onChange={(e) => upCheck({ km: Number(e.target.value) })} /></Campo>
            <Campo rotulo="Tensão bateria"><Input value={ck.tensaoBateria ?? ""} onChange={(e) => upCheck({ tensaoBateria: e.target.value })} /></Campo>
            <Campo rotulo="Pertences no veículo"><Input value={ck.pertences ?? ""} onChange={(e) => upCheck({ pertences: e.target.value })} /></Campo>
          </div>
          <Button size="sm" variant="secondary" className="mt-3 nao-imprimir" onClick={() => upCheck({ responsavel: autor.nome, dataHora: new Date().toISOString() })}>Assinar checklist</Button>
          {ck.responsavel && <p className="mt-2 text-xs text-muted-foreground">Conferido por {ck.responsavel} em {dataHoraBR(ck.dataHora)}</p>}
        </section>
      )}

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-display text-lg font-bold">Serviços e peças</h2>
        <div className="space-y-2">
          {o.itens.map((i, idx) => (
            <div key={i.id} className="grid grid-cols-[1fr_70px_110px_100px_40px] items-center gap-2 text-sm">
              <Input value={i.descricao} disabled={i.tipo === "produto"} onChange={(e) => upItem(idx, { descricao: e.target.value })} />
              <Input type="number" value={i.quantidade} disabled={i.baixado} onChange={(e) => upItem(idx, { quantidade: Number(e.target.value) })} />
              <Input type="number" step="0.01" value={i.valorUnitario} onChange={(e) => upItem(idx, { valorUnitario: Number(e.target.value) })} />
              <span className="text-right">{brl(totalItem(i))}{i.baixado && <span className="block text-[10px] text-success">baixado</span>}</span>
              <Button size="icon" variant="ghost" disabled={i.baixado} onClick={() => up({ itens: o.itens.filter((_, j) => j !== idx) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <div className="nao-imprimir mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => up({ itens: [...o.itens, { id: novoId(), tipo: "servico", produtoId: "", descricao: "Mão de obra", quantidade: 1, valorUnitario: 0, custoUnitario: 0, desconto: 0, baixado: false }] })}><Plus className="mr-1 h-4 w-4" />Serviço</Button>
          <select className={`${SEL} w-64`} value={prodSel} onChange={(e) => setProdSel(e.target.value)}><option value="">Peça do estoque…</option>{produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.quantidade})</option>)}</select>
          <Button size="sm" variant="secondary" disabled={!prodSel} onClick={addProduto}>Adicionar peça</Button>
        </div>
        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <span>Subtotal {brl(subtotal)}</span>
          <label className="flex items-center gap-2">Desconto <Input type="number" className="w-28" value={o.descontoGeral} onChange={(e) => up({ descontoGeral: Number(e.target.value) })} /></label>
          <span className="font-display text-2xl font-bold">Total {brl(total)}</span>
          {o.pago && <StatusBadge status="Pago" />}
        </div>
      </section>
      <Campo rotulo="Observações"><Textarea value={o.observacoes} onChange={(e) => up({ observacoes: e.target.value })} /></Campo>

      {isOS && salvo && (
        <section className="nao-imprimir flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
          <Button variant="secondary" onClick={() => void baixarPecas()}><PackageMinus className="mr-1 h-4 w-4" />Dar baixa nas peças</Button>
          {!o.pago && <>
            <Campo rotulo="Forma de pagamento" className="w-48"><select className={SEL} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>{formasPagamento.map((f) => <option key={f}>{f}</option>)}</select></Campo>
            <Button onClick={() => void pagar()}><Wallet className="mr-1 h-4 w-4" />Registrar pagamento {brl(total)}</Button>
          </>}
          {o.status !== "Entregue" && <Button variant="outline" onClick={() => void salvar({ status: "Entregue" }, "status", `${o.numero} entregue ao cliente`)}>Marcar como entregue</Button>}
        </section>
      )}
    </div>
  );
}
