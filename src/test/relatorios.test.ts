import { describe, expect, it } from "vitest";
import { itensComerciais, margemSobreVenda, totalOrdem } from "@/lib/relatorios";
import { ordemSchema, vendaSchema } from "@/lib/schemas";
describe("Relatórios comerciais", () => {
  it("desconta a OS e usa custo histórico, não o preço atual do estoque", () => {
    const o = ordemSchema.parse({
      id: "os1",
      numero: "OS1",
      tipo: "os",
      clienteId: "cliente",
      veiculoId: "v1",
      emissao: "2026-11-27",
      descontoGeral: 50,
      itens: [
        {
          id: "item",
          tipo: "produto",
          produtoId: "som",
          descricao: "Som",
          quantidade: 2,
          valorUnitario: 250,
          custoUnitario: 100,
          desconto: 50,
        },
      ],
    });
    expect(totalOrdem(o)).toBe(400);
    const itens = itensComerciais([o], []);
    expect(itens[0]?.receita).toBe(400);
    expect(itens[0]?.custo).toBe(200);
  });
  it("separa PDV das receitas do caixa e aplica desconto da venda", () => {
    const v = vendaSchema.parse({
      id: "v1",
      numero: "V1",
      itens: [
        {
          produtoId: "som",
          descricao: "Som",
          quantidade: 2,
          valorUnitario: 100,
          custoUnitario: 50,
        },
      ],
      subtotal: 200,
      desconto: 20,
      total: 180,
      formaPagamento: "PIX",
      valorRecebido: 180,
      troco: 0,
      data: "2026-11-27",
    });
    const itens = itensComerciais([], [v]);
    expect(itens).toHaveLength(1);
    expect(itens[0]?.receita).toBe(180);
    expect(itens[0]?.custo).toBe(100);
  });
  it("distribui centavos de desconto sem alterar o total do documento", () => {
    const o = ordemSchema.parse({
      id: "os-centavos",
      numero: "OS2",
      tipo: "os",
      clienteId: "c",
      veiculoId: "v",
      emissao: "2026-11-27",
      descontoGeral: 0.01,
      itens: [0, 1, 2].map((i) => ({
        id: String(i),
        tipo: "servico",
        descricao: "Serviço",
        quantidade: 1,
        valorUnitario: 1,
      })),
    });
    const receita = itensComerciais([o], []).reduce((s, i) => s + i.receita, 0);
    expect(Math.round(receita * 100)).toBe(299);
  });
  it("não confunde margem sobre venda com markup sobre custo", () => {
    expect(margemSobreVenda(70, 30)).toBeCloseTo(57.142857);
    expect(margemSobreVenda(0, 30)).toBeNull();
  });
});
