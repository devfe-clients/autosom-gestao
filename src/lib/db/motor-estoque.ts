import { novoId } from "./id";
import type { Autor, MovEstoque, PreparedEscrita, Registro } from "./types";
import type { EventoAuditoria, Movimento } from "../schemas";

export class EstoqueInsuficienteError extends Error {}

/**
 * Regra central de estoque (compartilhada pelos dois adaptadores):
 * agrega os movimentos por produto, recusa saldo negativo e gera um
 * documento de movimento por produto, com saldo anterior e posterior.
 */
export function aplicarMovimentos(
  produtosAtuais: Map<string, Registro>,
  movimentos: MovEstoque[],
  autor: Autor,
  agora: string,
): { produtos: PreparedEscrita[]; movimentos: PreparedEscrita[]; auditorias: EventoAuditoria[] } {
  const porProduto = new Map<string, MovEstoque[]>();
  for (const m of movimentos) {
    if (!Number.isInteger(m.delta) || m.delta === 0) throw new Error("Quantidade de movimento inválida.");
    porProduto.set(m.produtoId, [...(porProduto.get(m.produtoId) ?? []), m]);
  }
  const out = { produtos: [] as PreparedEscrita[], movimentos: [] as PreparedEscrita[], auditorias: [] as EventoAuditoria[] };
  for (const [produtoId, lista] of porProduto) {
    const p = produtosAtuais.get(produtoId);
    if (!p) throw new Error("Produto não encontrado no estoque.");
    const anterior = Number(p["quantidade"] ?? 0);
    const delta = lista.reduce((s, m) => s + m.delta, 0);
    const apos = anterior + delta;
    const nome = String(p["nome"] ?? "");
    if (apos < 0) {
      throw new EstoqueInsuficienteError(`Estoque insuficiente de "${nome}": disponível ${anterior}, solicitado ${-delta}.`);
    }
    if (delta === 0) continue;
    const primeiro = lista[0]!;
    const movId = novoId();
    const auditoriaId = novoId();
    const mov: Movimento = {
      id: movId,
      produtoId,
      produtoNome: nome,
      codigoBarras: String(p["codigoBarras"] ?? ""),
      tipo: delta > 0 ? "entrada" : "saida",
      quantidade: Math.abs(delta),
      delta,
      saldoAnterior: anterior,
      saldoApos: apos,
      origem: primeiro.origem,
      referenciaId: primeiro.referenciaId ?? "",
      observacao: lista.map((m) => m.observacao).filter(Boolean).join(" | ").slice(0, 300),
      criadoEm: agora,
      criadoPor: autor.uid,
      criadoPorNome: autor.nome,
      atualizadoEm: agora,
      atualizadoPor: autor.uid,
      atualizadoPorNome: autor.nome,
    };
    out.movimentos.push({ colecao: "movimentos", registro: { ...mov, auditoriaId } as unknown as Registro });
    out.produtos.push({
      colecao: "produtos",
      registro: {
        ...p,
        quantidade: apos,
        ultimoMovimentoId: movId,
        atualizadoEm: agora,
        atualizadoPor: autor.uid,
        atualizadoPorNome: autor.nome,
        auditoriaId,
      },
    });
    out.auditorias.push({
      id: auditoriaId,
      colecao: "produtos",
      registroId: produtoId,
      acao: delta > 0 ? "entrada-estoque" : "saida-estoque",
      usuarioId: autor.uid,
      usuarioNome: autor.nome,
      data: agora,
      detalhe: `${delta > 0 ? "+" : ""}${delta} ${nome} (${anterior} → ${apos}) · ${primeiro.origem}`.slice(0, 500),
    });
  }
  return out;
}
