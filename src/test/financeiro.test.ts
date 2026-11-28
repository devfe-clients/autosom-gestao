import { describe, expect, it } from "vitest";
import {
  adicionarPagamento,
  dentroPeriodo,
  intervaloMes,
  movimentacao,
  pago,
  restante,
  statusFinanceiro,
} from "@/lib/financeiro";
import { lancamentoSchema } from "@/lib/schemas";
import { validarConflitoFinanceiro } from "@/lib/db/financeiro-conflito";

const conta = () =>
  lancamentoSchema.parse({
    id: "conta-500",
    descricao: "Serviço de som",
    tipo: "receber",
    valor: 500,
    vencimento: "2026-11-27",
  });
const pagamento = (valor: number, data = "2026-11-27T12:00:00") => ({
  id: `pag-${valor}-${data}`,
  valor,
  data,
  formaPagamento: "PIX" as const,
  usuarioNome: "Dayane",
});
describe("Financeiro nas contas Empresa e Pessoal", () => {
  for (const origemLancamento of ["empresa", "pessoal"] as const) {
    it(`registra entrada de R$ 200 e saldo R$ 300 na conta ${origemLancamento}`, () => {
      const l = adicionarPagamento({ ...conta(), origemLancamento }, pagamento(200));
      expect(pago(l)).toBe(200);
      expect(restante(l)).toBe(300);
      expect(l.pagoEm).toBe("");
      expect(l.pagamentos).toHaveLength(1);
      expect(lancamentoSchema.safeParse(l).success).toBe(true);
    });
  }
  it("quita somente ao atingir os R$ 500", () => {
    const l = adicionarPagamento(adicionarPagamento(conta(), pagamento(200)), pagamento(300));
    expect(restante(l)).toBe(0);
    expect(l.pagoEm).toBe("2026-11-27T12:00:00");
    expect(statusFinanceiro(l, "2026-11-27")).toBe("Pago");
  });
  it("não permite pagamento maior que o saldo R$ 300", () => {
    expect(() =>
      adicionarPagamento(adicionarPagamento(conta(), pagamento(200)), pagamento(301)),
    ).toThrow();
  });
  it("não permite valor zero ou negativo", () => {
    expect(() => adicionarPagamento(conta(), pagamento(0))).toThrow();
    expect(() => adicionarPagamento(conta(), pagamento(-1))).toThrow();
  });
  it("mantém pagamentos antigos sem valorPago", () => {
    const l = { ...conta(), pagoEm: "2026-11-26T12:00:00" };
    expect(pago(l)).toBe(500);
    expect(restante(l)).toBe(0);
    expect(movimentacao([l], "2026-11-01", "2026-11-30").reduce((s, p) => s + p.valor, 0)).toBe(
      500,
    );
  });
  it("contabiliza cada parcial na sua data, não o valor integral do lançamento", () => {
    const l = adicionarPagamento(
      adicionarPagamento(conta(), pagamento(200, "2026-11-27T12:00:00")),
      pagamento(300, "2026-12-01T12:00:00"),
    );
    expect(movimentacao([l], "2026-11-01", "2026-11-30").reduce((s, p) => s + p.valor, 0)).toBe(
      200,
    );
    expect(movimentacao([l], "2026-12-01", "2026-12-31").reduce((s, p) => s + p.valor, 0)).toBe(
      300,
    );
  });
  it("identifica vencido com saldo parcial", () => {
    expect(statusFinanceiro(adicionarPagamento(conta(), pagamento(200)), "2026-11-28")).toBe(
      "Vencido",
    );
  });
  it("inclui os dois limites de data e rejeita intervalo invertido", () => {
    expect(dentroPeriodo("2026-11-01T12:00:00", "2026-11-01", "2026-11-30")).toBe(true);
    expect(dentroPeriodo("2026-11-30T12:00:00", "2026-11-01", "2026-11-30")).toBe(true);
    expect(dentroPeriodo("2026-11-27", "2026-11-30", "2026-11-01")).toBe(false);
  });
  it("calcula último dia do mês e fevereiro bissexto", () => {
    expect(intervaloMes("2026-11").ate).toBe("2026-11-30");
    expect(intervaloMes("2028-02").ate).toBe("2028-02-29");
  });
  it("recusa saldo ou histórico adulterado no schema", () => {
    expect(lancamentoSchema.safeParse({ ...conta(), valorPago: 501 }).success).toBe(false);
    expect(
      lancamentoSchema.safeParse({ ...conta(), valorPago: 100, pagamentos: [pagamento(200)] })
        .success,
    ).toBe(false);
  });
  it("rejeita uma baixa concorrente baseada em saldo antigo", () => {
    const a = adicionarPagamento(conta(), pagamento(200));
    const b = adicionarPagamento(conta(), { ...pagamento(100), id: "outro" });
    expect(() => validarConflitoFinanceiro(a, b)).toThrow();
    expect(() => validarConflitoFinanceiro(a, adicionarPagamento(a, pagamento(300)))).not.toThrow();
  });
  it("não permite mudar valor ou direção de um lançamento já pago", () => {
    const l = adicionarPagamento(conta(), pagamento(200));
    expect(() => validarConflitoFinanceiro(l, { ...l, valor: 600 })).toThrow();
    expect(() => validarConflitoFinanceiro(l, { ...l, tipo: "pagar" })).toThrow();
  });
});
