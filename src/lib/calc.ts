export const brl = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dataBR = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");
export const dataHoraBR = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" }) : "—";

export const hojeISO = () => new Date().toISOString().slice(0, 10);

/** Arredonda em centavos para evitar erros de ponto flutuante. */
export const centavos = (v: number) => Math.round(v * 100) / 100;

export type ItemValor = { quantidade: number; valorUnitario: number; desconto?: number };
export const totalItem = (i: ItemValor) => centavos(i.quantidade * i.valorUnitario - (i.desconto ?? 0));
export const somaItens = (itens: ItemValor[]) => centavos(itens.reduce((s, i) => s + totalItem(i), 0));
