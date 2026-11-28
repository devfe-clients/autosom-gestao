import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/firebaseConfig", () => ({ firebaseConfigurado: false }));
import { gravar, db } from "@/lib/db";
import { lancamentoSchema, type Lancamento, type EventoAuditoria } from "@/lib/schemas";
import { adicionarPagamento } from "@/lib/financeiro";
const autor = { uid: "proprietaria-test", nome: "Dayane" };
describe("Persistência financeira e isolamento", () => {
  beforeEach(() => window.localStorage.clear());
  it("salva, lê, altera e paga em cada coleção sem misturar as contas", async () => {
    for (const [colecao, origemLancamento] of [
      ["lancamentos", "empresa"],
      ["lancamentosPessoais", "pessoal"],
    ] as const) {
      const registro = lancamentoSchema.parse({
        id: colecao,
        descricao: `Conta ${origemLancamento}`,
        tipo: "pagar",
        valor: 500,
        vencimento: "2026-11-27",
        origemLancamento,
      });
      await gravar({ autor, escritas: [{ colecao, registro }] });
      const salvo = await db.listar<Lancamento>(colecao);
      const primeiro = salvo[0];
      if (!primeiro) throw new Error("Conta não gravada");
      await gravar({
        autor,
        escritas: [
          {
            colecao,
            registro: adicionarPagamento(primeiro, {
              id: "pag-200",
              valor: 200,
              data: "2026-11-27T12:00:00",
              formaPagamento: "PIX",
              usuarioNome: "Dayane",
            }),
          },
        ],
      });
      const atual = (await db.listar<Lancamento>(colecao))[0];
      expect(atual?.valorPago).toBe(200);
      expect(atual?.origemLancamento).toBe(origemLancamento);
    }
    expect(await db.listar("lancamentos")).toHaveLength(1);
    expect(await db.listar("lancamentosPessoais")).toHaveLength(1);
  });
  it("não vaza descrição nem valor pessoal na auditoria compartilhada", async () => {
    await gravar({
      autor,
      escritas: [
        {
          colecao: "lancamentosPessoais",
          registro: {
            id: "privado",
            tipo: "pagar",
            descricao: "Despesa confidencial",
            valor: 735,
            vencimento: "2026-11-27",
            origemLancamento: "pessoal",
          },
          detalhe: "Despesa confidencial R$735",
        },
      ],
    });
    const auditoria = await db.listar<EventoAuditoria>("auditoria");
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]?.detalhe).toBe("Lançamento pessoal atualizado (conteúdo privado)");
  });
});
