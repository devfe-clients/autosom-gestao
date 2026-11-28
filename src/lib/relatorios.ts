import { centavos, somaItens, totalItem } from "./calc";
import type { OrdemServico, Venda } from "./schemas";
export function totalOrdem(o: OrdemServico) {
  return centavos(Math.max(0, somaItens(o.itens) - o.descontoGeral));
}
export type ItemRelatorio = {
  id: string;
  documento: string;
  origem: "os" | "pdv";
  data: string;
  produtoId: string;
  descricao: string;
  tipo: string;
  quantidade: number;
  receita: number;
  custo: number;
  clienteId: string;
  clienteNome: string;
  tecnico: string;
};
function ratear(total: number, pesos: number[]) {
  const base = pesos.reduce((s, n) => s + n, 0);
  let acumulado = 0;
  return pesos.map((peso, index) => {
    const parcela =
      index === pesos.length - 1
        ? centavos(total - acumulado)
        : centavos(base > 0 ? (total * peso) / base : 0);
    acumulado = centavos(acumulado + parcela);
    return parcela;
  });
}
export function itensComerciais(ordens: OrdemServico[], vendas: Venda[]): ItemRelatorio[] {
  const os = ordens.flatMap((o) => {
    const valores = ratear(
      totalOrdem(o),
      o.itens.map((i) => Math.max(0, totalItem(i))),
    );
    return o.itens.map((i, index) => ({
      id: `${o.id}-${i.id}`,
      documento: o.numero,
      origem: "os" as const,
      data: o.emissao,
      produtoId: i.produtoId,
      descricao: i.descricao,
      tipo: i.tipo,
      quantidade: i.quantidade,
      receita: valores[index] ?? 0,
      custo: centavos(i.custoUnitario * i.quantidade),
      clienteId: o.clienteId,
      clienteNome: "",
      tecnico: o.tecnico,
    }));
  });
  const pdv = vendas.flatMap((v) => {
    const valores = ratear(
      v.total,
      v.itens.map((i) => i.quantidade * i.valorUnitario),
    );
    return v.itens.map((i, index) => ({
      id: `${v.id}-${index}`,
      documento: v.numero,
      origem: "pdv" as const,
      data: v.data,
      produtoId: i.produtoId,
      descricao: i.descricao,
      tipo: "produto",
      quantidade: i.quantidade,
      receita: valores[index] ?? 0,
      custo: centavos(i.quantidade * i.custoUnitario),
      clienteId: "",
      clienteNome: v.clienteNome,
      tecnico: v.criadoPorNome ?? "",
    }));
  });
  return [...os, ...pdv];
}
export function margemSobreVenda(receita: number, custo: number) {
  return receita > 0 ? ((receita - custo) / receita) * 100 : null;
}
