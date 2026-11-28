import { centavos } from "./calc";
import type { Lancamento, FormaPagamento } from "./schemas";

export type Conta = "empresa" | "pessoal";
export type Pagamento = {
  id: string;
  valor: number;
  data: string;
  formaPagamento: FormaPagamento;
  usuarioNome: string;
};
export function pago(l: Pick<Lancamento, "valor" | "pagoEm" | "valorPago">) {
  return centavos(l.valorPago ?? (l.pagoEm ? l.valor : 0));
}
export const restante = (l: Pick<Lancamento, "valor" | "pagoEm" | "valorPago">) =>
  centavos(Math.max(0, l.valor - pago(l)));
export function statusFinanceiro(l: Lancamento, hoje: string) {
  if (restante(l) === 0) return "Pago";
  if (l.vencimento < hoje) return "Vencido";
  return pago(l) > 0 ? "Parcial" : "Em aberto";
}
export function pagamentosDe(l: Lancamento): Pagamento[] {
  const historico = l.pagamentos ?? [];
  const registrado = centavos(historico.reduce((s, p) => s + p.valor, 0));
  const legado = centavos(pago(l) - registrado);
  return [
    ...(legado > 0 && (l.pagoEm || l.dataUltimoPagamento)
      ? [
          {
            id: `legado-${l.id}`,
            valor: legado,
            data: l.pagoEm || l.dataUltimoPagamento || "",
            formaPagamento: l.formaPagamento,
            usuarioNome: l.baixadoPor,
          },
        ]
      : []),
    ...historico,
  ];
}
export function adicionarPagamento(l: Lancamento, pagamento: Pagamento): Lancamento {
  if (
    !Number.isFinite(pagamento.valor) ||
    centavos(pagamento.valor) <= 0 ||
    centavos(pagamento.valor) > restante(l)
  )
    throw new Error("O pagamento deve ser positivo e não pode superar o saldo.");
  const valorPago = centavos(pago(l) + pagamento.valor);
  return {
    ...l,
    valorPago,
    pagamentos: [...(l.pagamentos ?? []), { ...pagamento, valor: centavos(pagamento.valor) }],
    dataUltimoPagamento: pagamento.data,
    pagoEm: valorPago === l.valor ? pagamento.data : "",
    baixadoPor: pagamento.usuarioNome,
  };
}
export const dentroPeriodo = (data: string, de: string, ate: string) =>
  (!de || !ate || de <= ate) &&
  Boolean(data) &&
  (!de || data.slice(0, 10) >= de) &&
  (!ate || data.slice(0, 10) <= ate);
export function movimentacao(lancamentos: Lancamento[], de: string, ate: string) {
  return lancamentos.flatMap((l) =>
    pagamentosDe(l)
      .filter((p) => dentroPeriodo(p.data, de, ate))
      .map((p) => ({ ...p, lancamento: l })),
  );
}
export function intervaloMes(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  if (!ano || !m) return { de: "", ate: "" };
  const ultimo = new Date(ano, m, 0).getDate();
  return { de: `${mes}-01`, ate: `${mes}-${ultimo}` };
}
export function exportarCSV(nome: string, cab: string[], linhas: unknown[][]) {
  const celula = (x: unknown) => {
    let s = String(x ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  const csv = "\uFEFF" + [cab, ...linhas].map((row) => row.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
