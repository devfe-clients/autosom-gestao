import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  Plus,
  Pencil,
  Trash2,
  Download,
  MessageCircle,
  History,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Campo,
  PageHeader,
  SEL,
  Stat,
  StatusBadge,
  Tabela,
  TD,
  Vazio,
  erroMsg,
} from "@/components/app/kit";
import { ContaTabs } from "@/components/app/ContaTabs";
import { gravar, novoId, useColecao, type ColecaoNome } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { meta } from "@/lib/meta";
import { brl, dataBR, hojeISO, linkWhatsApp } from "@/lib/calc";
import {
  adicionarPagamento,
  dentroPeriodo,
  exportarCSV,
  intervaloMes,
  movimentacao,
  pago,
  pagamentosDe,
  restante,
  statusFinanceiro,
  type Conta,
} from "@/lib/financeiro";
import {
  formasPagamento,
  type Lancamento,
  type Cliente,
  type OrdemServico,
  type FormaPagamento,
} from "@/lib/schemas";

export const Route = createFileRoute("/financeiro")({
  head: () =>
    meta(
      "Financeiro",
      "Contas da empresa e pessoais, pagamentos parciais, vencimentos e fluxo financeiro da Adriano Auto Som.",
    ),
  component: Financeiro,
});
type Formulario = {
  descricao: string;
  tipo: "pagar" | "receber";
  valor: string;
  vencimento: string;
  formaPagamento: FormaPagamento;
  categoria: string;
  observacao: string;
  clienteId: string;
  referenciaId: string;
};
const vazio = (): Formulario => ({
  descricao: "",
  tipo: "pagar",
  valor: "",
  vencimento: hojeISO(),
  formaPagamento: "PIX",
  categoria: "Despesas gerais",
  observacao: "",
  clienteId: "",
  referenciaId: "",
});
function Financeiro() {
  const { usuario } = useAuth();
  const [conta, setConta] = useState<Conta>("empresa");
  const ativa = usuario?.perfil === "proprietaria" ? conta : "empresa";
  return (
    <div className="space-y-4">
      {usuario?.perfil === "proprietaria" && <ContaTabs conta={ativa} onChange={setConta} />}
      <Contas key={ativa} conta={ativa} />
    </div>
  );
}
function Contas({ conta }: { conta: Conta }) {
  const { autor, pode } = useAuth();
  const colecao: ColecaoNome = conta === "pessoal" ? "lancamentosPessoais" : "lancamentos";
  const { dados, carregando } = useColecao<Lancamento>(colecao);
  const { dados: clientes } = useColecao<Cliente>("clientes", conta === "empresa");
  const { dados: ordens } = useColecao<OrdemServico>("ordens", conta === "empresa");
  const [mes, setMes] = useState(hojeISO().slice(0, 7));
  const periodo = intervaloMes(mes);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [categoria, setCategoria] = useState("todas");
  const [formaFiltro, setFormaFiltro] = useState("todas");
  const [ordem, setOrdem] = useState("vencimento");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<Formulario | null>(null);
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [acao, setAcao] = useState<{
    tipo: "pagar" | "remarcar" | "excluir";
    itens: Lancamento[];
  } | null>(null);
  const [historico, setHistorico] = useState<Lancamento | null>(null);
  const [valorBaixa, setValorBaixa] = useState("");
  const [data, setData] = useState(hojeISO());
  const [forma, setForma] = useState<FormaPagamento>("PIX");
  const [ocupado, setOcupado] = useState(false);
  const nomeCliente = (l: Lancamento) =>
    clientes.find(
      (c) => c.id === (l.clienteId || ordens.find((o) => o.id === l.referenciaId)?.clienteId),
    )?.nome ?? "";
  const base = dados.filter(
    (l) =>
      (tipo === "todos" || l.tipo === tipo) &&
      (categoria === "todas" || l.categoria === categoria) &&
      (formaFiltro === "todas" || l.formaPagamento === formaFiltro) &&
      `${l.descricao} ${l.observacao} ${nomeCliente(l)}`
        .toLowerCase()
        .includes(busca.toLowerCase()),
  );
  const lista = base
    .filter(
      (l) =>
        dentroPeriodo(l.vencimento, periodo.de, periodo.ate) &&
        (status === "todos" ||
          (status === "nao-pagos"
            ? restante(l) > 0
            : status === "Parcial"
              ? pago(l) > 0 && restante(l) > 0
              : statusFinanceiro(l, hojeISO()) === status)),
    )
    .sort((a, b) =>
      ordem === "valor"
        ? b.valor - a.valor
        : ordem === "descricao"
          ? a.descricao.localeCompare(b.descricao)
          : a.vencimento.localeCompare(b.vencimento),
    );
  const movimentos = movimentacao(base, periodo.de, periodo.ate).filter(
    (p) => formaFiltro === "todas" || p.formaPagamento === formaFiltro,
  );
  const entradas = movimentos
    .filter((p) => p.lancamento.tipo === "receber")
    .reduce((s, p) => s + p.valor, 0);
  const saidas = movimentos
    .filter((p) => p.lancamento.tipo === "pagar")
    .reduce((s, p) => s + p.valor, 0);
  const marcados = lista.filter((l) => selecionados.has(l.id));
  function moverMes(delta: number) {
    const d = new Date(`${mes || hojeISO().slice(0, 7)}-15T12:00:00`);
    d.setMonth(d.getMonth() + delta);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelecionados(new Set());
  }
  function editar(l: Lancamento) {
    setEditando(l);
    setForm({
      descricao: l.descricao,
      tipo: l.tipo,
      valor: String(l.valor),
      vencimento: l.vencimento,
      formaPagamento: l.formaPagamento,
      categoria: l.categoria,
      observacao: l.observacao,
      clienteId: l.clienteId ?? "",
      referenciaId: l.referenciaId,
    });
  }
  function abrir(tipoAcao: "pagar" | "remarcar" | "excluir", itens: Lancamento[]) {
    const primeiro = itens[0];
    if (!primeiro) return;
    setAcao({ tipo: tipoAcao, itens });
    setValorBaixa(itens.length === 1 ? String(restante(primeiro)) : "");
    setData(hojeISO());
    setForma(primeiro.formaPagamento);
  }
  async function salvar() {
    if (!form || ocupado) return;
    setOcupado(true);
    try {
      const valor = Number(form.valor);
      if (editando && valor < pago(editando))
        throw new Error("O valor não pode ser menor que o já pago.");
      await gravar({
        autor,
        escritas: [
          {
            colecao,
            registro: {
              ...editando,
              ...form,
              valor,
              id: editando?.id ?? novoId(),
              origem: editando?.origem ?? (form.referenciaId ? "os" : "manual"),
              origemLancamento: conta,
            },
          },
        ],
      });
      setForm(null);
      toast.success(editando ? "Lançamento atualizado" : "Lançamento criado");
    } catch (e) {
      toast.error(erroMsg(e));
    } finally {
      setOcupado(false);
    }
  }
  async function confirmar() {
    if (!acao || ocupado) return;
    setOcupado(true);
    try {
      if (acao.itens.length > 10) throw new Error("Selecione até 10 lançamentos por operação.");
      if (acao.tipo === "excluir") {
        if (!pode("excluir") || acao.itens.some((l) => pago(l) > 0 || l.origem !== "manual"))
          throw new Error("Só lançamentos manuais sem pagamentos podem ser excluídos.");
        await gravar({
          autor,
          remocoes: acao.itens.map((l) => ({
            colecao,
            id: l.id,
            detalhe: `Exclusão: ${l.descricao}`,
          })),
        });
      } else {
        if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error("Informe uma data válida.");
        const escritas = acao.itens.map((l) => {
          const registro =
            acao.tipo === "remarcar"
              ? { ...l, vencimento: data }
              : adicionarPagamento(l, {
                  id: novoId(),
                  valor: valorBaixa ? Number(valorBaixa) : restante(l),
                  data: `${data}T12:00:00`,
                  formaPagamento: forma,
                  usuarioNome: autor.nome,
                });
          return {
            colecao,
            registro,
            acao: acao.tipo === "pagar" ? ("pagamento" as const) : ("alterar" as const),
            detalhe: `${acao.tipo === "pagar" ? "Pagamento" : "Vencimento"}: ${l.descricao}`,
          };
        });
        await gravar({ autor, escritas });
      }
      setAcao(null);
      setSelecionados(new Set());
      toast.success("Operação concluída");
    } catch (e) {
      toast.error(erroMsg(e));
    } finally {
      setOcupado(false);
    }
  }
  const exportar = () =>
    exportarCSV(
      `financeiro-${conta}-${mes || "todos"}.csv`,
      [
        "Vencimento",
        "Descrição",
        "Cliente",
        "Categoria",
        "Tipo",
        "Valor",
        "Pago",
        "Saldo",
        "Situação",
        "Forma",
      ],
      lista.map((l) => [
        l.vencimento,
        l.descricao,
        nomeCliente(l),
        l.categoria,
        l.tipo,
        l.valor,
        pago(l),
        restante(l),
        statusFinanceiro(l, hojeISO()),
        l.formaPagamento,
      ]),
    );
  return (
    <div className="space-y-4">
      <PageHeader
        titulo={conta === "empresa" ? "Financeiro · Empresa" : "Financeiro · Pessoal"}
        acoes={
          <>
            <Button variant="outline" title="Exportar lançamentos filtrados" onClick={exportar}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={() => {
                setEditando(null);
                setForm(vazio());
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo lançamento
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <Button size="icon" variant="outline" title="Mês anterior" onClick={() => moverMes(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Campo rotulo="Mês de vencimento">
          <Input
            aria-label="Mês de vencimento"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
        </Campo>
        <Button size="icon" variant="outline" title="Próximo mês" onClick={() => moverMes(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={() => setMes("")}>
          Todo o período
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat rotulo="Recebido no período" valor={brl(entradas)} tom="ok" />
        <Stat rotulo="Pago no período" valor={brl(saidas)} tom="perigo" />
        <Stat
          rotulo="Saldo realizado"
          valor={brl(entradas - saidas)}
          tom={entradas >= saidas ? "ok" : "perigo"}
        />
        <Stat
          rotulo="A receber · filtrado"
          valor={brl(
            lista.filter((l) => l.tipo === "receber").reduce((s, l) => s + restante(l), 0),
          )}
        />
        <Stat
          rotulo="A pagar · filtrado"
          valor={brl(lista.filter((l) => l.tipo === "pagar").reduce((s, l) => s + restante(l), 0))}
          detalhe={`Vencido: ${brl(lista.filter((l) => l.tipo === "pagar" && l.vencimento < hojeISO()).reduce((s, l) => s + restante(l), 0))}`}
          tom="alerta"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Campo rotulo="Buscar">
          <Input
            aria-label="Buscar lançamentos"
            placeholder="Descrição ou cliente"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </Campo>
        <Campo rotulo="Tipo">
          <select
            aria-label="Filtrar tipo"
            className={SEL}
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="receber">A receber</option>
            <option value="pagar">A pagar</option>
          </select>
        </Campo>
        <Campo rotulo="Situação">
          <select
            aria-label="Filtrar situação"
            className={SEL}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {[
              ["todos", "Todas"],
              ["nao-pagos", "Não pagos"],
              ["Em aberto", "Em aberto"],
              ["Vencido", "Vencidos"],
              ["Parcial", "Pago parcial"],
              ["Pago", "Quitados"],
            ].map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Categoria">
          <select
            aria-label="Filtrar categoria"
            className={SEL}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="todas">Todas</option>
            {[...new Set(dados.map((l) => l.categoria))].sort().map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Forma">
          <select
            aria-label="Filtrar forma"
            className={SEL}
            value={formaFiltro}
            onChange={(e) => setFormaFiltro(e.target.value)}
          >
            <option value="todas">Todas</option>
            {formasPagamento.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Ordenar">
          <select className={SEL} value={ordem} onChange={(e) => setOrdem(e.target.value)}>
            <option value="vencimento">Vencimento</option>
            <option value="valor">Maior valor</option>
            <option value="descricao">Descrição</option>
          </select>
        </Campo>
      </div>
      {marcados.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-y py-3">
          <strong className="text-sm">{marcados.length} selecionados</strong>
          <Button
            size="sm"
            disabled={marcados.some((l) => restante(l) === 0)}
            onClick={() => abrir("pagar", marcados)}
          >
            <Check className="mr-1 h-4 w-4" />
            Registrar pagamento
          </Button>
          <Button size="sm" variant="outline" onClick={() => abrir("remarcar", marcados)}>
            <Calendar className="mr-1 h-4 w-4" />
            Remarcar
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {lista.length} lançamentos · Valor {brl(lista.reduce((s, l) => s + l.valor, 0))} · Saldo{" "}
        {brl(lista.reduce((s, l) => s + restante(l), 0))}
      </p>
      {carregando ? (
        <Vazio>Carregando lançamentos…</Vazio>
      ) : lista.length === 0 ? (
        <Vazio>Nenhum lançamento encontrado.</Vazio>
      ) : (
        <Tabela
          cab={[
            "Seleção",
            "Vencimento",
            "Descrição / Cliente",
            "Tipo",
            "Valor",
            "Pago / Saldo",
            "Situação",
            "Ações",
          ]}
        >
          {lista.map((l) => {
            const url = linkWhatsApp(
              clientes.find(
                (c) =>
                  c.id === (l.clienteId || ordens.find((o) => o.id === l.referenciaId)?.clienteId),
              )?.telefone,
              `Olá ${nomeCliente(l)}! Adriano Auto Som: o saldo de ${l.descricao} é ${brl(restante(l))}, com vencimento em ${dataBR(l.vencimento + "T12:00:00")}. Podemos combinar o pagamento?`,
            );
            return (
              <tr key={l.id}>
                <td className={TD}>
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${l.descricao}`}
                    checked={selecionados.has(l.id)}
                    onChange={(e) =>
                      setSelecionados((prev) => {
                        const n = new Set(prev);
                        e.target.checked ? n.add(l.id) : n.delete(l.id);
                        return n;
                      })
                    }
                  />
                </td>
                <td className={`${TD} whitespace-nowrap`}>{dataBR(l.vencimento + "T12:00:00")}</td>
                <td className={TD}>
                  {l.descricao}
                  <div className="text-xs text-muted-foreground">
                    {l.categoria}
                    {nomeCliente(l) && ` · ${nomeCliente(l)}`}
                  </div>
                </td>
                <td className={TD}>{l.tipo === "receber" ? "Receber" : "Pagar"}</td>
                <td className={`${TD} whitespace-nowrap`}>{brl(l.valor)}</td>
                <td className={`${TD} whitespace-nowrap`}>
                  <div className="text-success">{brl(pago(l))}</div>
                  <div className="text-muted-foreground">{brl(restante(l))}</div>
                </td>
                <td className={TD}>
                  <StatusBadge status={statusFinanceiro(l, hojeISO())} />
                </td>
                <td className={TD}>
                  <div className="flex gap-1">
                    {restante(l) > 0 && (
                      <Button
                        size="icon"
                        variant="secondary"
                        title="Registrar pagamento"
                        aria-label={`Pagar ${l.descricao}`}
                        onClick={() => abrir("pagar", [l])}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Editar lançamento"
                      aria-label={`Editar ${l.descricao}`}
                      onClick={() => editar(l)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Histórico de pagamentos"
                      aria-label={`Histórico ${l.descricao}`}
                      onClick={() => setHistorico(l)}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    {conta === "empresa" && l.tipo === "receber" && restante(l) > 0 && url && (
                      <Button size="icon" variant="ghost" title="Cobrar pelo WhatsApp" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {pode("excluir") && l.origem === "manual" && pago(l) === 0 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Excluir lançamento"
                        aria-label={`Excluir ${l.descricao}`}
                        onClick={() => abrir("excluir", [l])}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Tabela>
      )}
      <Dialog
        open={Boolean(form)}
        onOpenChange={(v) => {
          if (!v && !ocupado) setForm(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Descrição" className="sm:col-span-2">
                <Input
                  aria-label="Descrição"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Tipo">
                <select
                  aria-label="Tipo do lançamento"
                  className={SEL}
                  disabled={Boolean(editando && pago(editando) > 0)}
                  value={form.tipo}
                  onChange={(e) =>
                    setForm({ ...form, tipo: e.target.value as "pagar" | "receber" })
                  }
                >
                  <option value="pagar">A pagar</option>
                  <option value="receber">A receber</option>
                </select>
              </Campo>
              <Campo rotulo="Valor (R$)">
                <Input
                  aria-label="Valor do lançamento"
                  type="number"
                  step="0.01"
                  min="0.01"
                  disabled={Boolean(editando && pago(editando) > 0)}
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Vencimento">
                <Input
                  aria-label="Vencimento"
                  type="date"
                  value={form.vencimento}
                  onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Forma">
                <select
                  className={SEL}
                  value={form.formaPagamento}
                  onChange={(e) =>
                    setForm({ ...form, formaPagamento: e.target.value as FormaPagamento })
                  }
                >
                  {formasPagamento.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Categoria">
                <Input
                  aria-label="Categoria"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                />
              </Campo>
              {conta === "empresa" && (
                <Campo rotulo="Cliente">
                  <select
                    className={SEL}
                    value={form.clienteId}
                    onChange={(e) =>
                      setForm({ ...form, clienteId: e.target.value, referenciaId: "" })
                    }
                  >
                    <option value="">Sem vínculo</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </Campo>
              )}
              {conta === "empresa" && (
                <Campo rotulo="OS" className="sm:col-span-2">
                  <select
                    className={SEL}
                    value={form.referenciaId}
                    disabled={Boolean(editando && editando.origem !== "manual")}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        referenciaId: e.target.value,
                        clienteId:
                          ordens.find((o) => o.id === e.target.value)?.clienteId ?? form.clienteId,
                      })
                    }
                  >
                    <option value="">Sem vínculo</option>
                    {ordens
                      .filter(
                        (o) =>
                          o.tipo === "os" && (!form.clienteId || o.clienteId === form.clienteId),
                      )
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.numero}
                        </option>
                      ))}
                  </select>
                </Campo>
              )}
              <Campo rotulo="Observações" className="sm:col-span-2">
                <Input
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                />
              </Campo>
            </div>
          )}
          <DialogFooter>
            <Button disabled={ocupado} onClick={() => void salvar()}>
              {ocupado ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(acao)}
        onOpenChange={(v) => {
          if (!v && !ocupado) setAcao(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {acao?.tipo === "pagar"
                ? "Registrar pagamento"
                : acao?.tipo === "remarcar"
                  ? "Remarcar vencimento"
                  : "Excluir lançamento?"}
            </DialogTitle>
          </DialogHeader>
          <p>
            {acao?.itens.length} lançamento(s) · Saldo{" "}
            {brl(acao?.itens.reduce((s, l) => s + restante(l), 0) ?? 0)}
          </p>
          {acao?.tipo === "pagar" && (
            <>
              <Campo
                rotulo={
                  acao.itens.length > 1
                    ? "Valor por lançamento (vazio = quitar cada saldo)"
                    : "Valor a pagar"
                }
              >
                <Input
                  aria-label="Valor do pagamento"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={valorBaixa}
                  onChange={(e) => setValorBaixa(e.target.value)}
                />
              </Campo>
              <Campo rotulo="Forma do pagamento">
                <select
                  aria-label="Forma do pagamento"
                  className={SEL}
                  value={forma}
                  onChange={(e) => setForma(e.target.value as FormaPagamento)}
                >
                  {formasPagamento.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Campo>
            </>
          )}
          {acao?.tipo !== "excluir" && (
            <Campo rotulo={acao?.tipo === "pagar" ? "Data do pagamento" : "Novo vencimento"}>
              <Input
                aria-label="Data da operação"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </Campo>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={ocupado} onClick={() => setAcao(null)}>
              Cancelar
            </Button>
            <Button
              disabled={ocupado}
              variant={acao?.tipo === "excluir" ? "destructive" : "default"}
              onClick={() => void confirmar()}
            >
              {ocupado ? "Salvando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(historico)} onOpenChange={(v) => !v && setHistorico(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de pagamentos</DialogTitle>
          </DialogHeader>
          {historico && (
            <>
              <p>
                {historico.descricao} · Saldo {brl(restante(historico))}
              </p>
              <Tabela cab={["Data", "Valor", "Forma", "Responsável"]}>
                {pagamentosDe(historico).map((p) => (
                  <tr key={p.id}>
                    <td className={TD}>{dataBR(p.data)}</td>
                    <td className={TD}>{brl(p.valor)}</td>
                    <td className={TD}>{p.formaPagamento}</td>
                    <td className={TD}>{p.usuarioNome}</td>
                  </tr>
                ))}
              </Tabela>
              {pagamentosDe(historico).length === 0 && <Vazio>Sem pagamentos registrados.</Vazio>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
