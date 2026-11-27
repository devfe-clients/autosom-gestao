import { useCallback, useEffect, useState } from "react";
import type { ZodType } from "zod";
import { localAdapter } from "./local-adapter";
import { firebaseAdapter } from "./firebase-adapter";
import { firebaseConfigurado } from "../firebaseConfig";
import { novoId } from "./id";
import {
  clienteSchema,
  compraSchema,
  fornecedorSchema,
  lancamentoSchema,
  ordemSchema,
  produtoSchema,
  usuarioSchema,
  vendaSchema,
  veiculoSchema,
  type EventoAuditoria,
} from "../schemas";
import type { AcaoAuditoria, Autor, ColecaoNome, DBAdapter, Escrita, MovEstoque, Registro, Remocao } from "./types";

export const db: DBAdapter = firebaseConfigurado ? firebaseAdapter : localAdapter;
export const modoBanco = db.nome;
export { novoId };
export type { Autor, ColecaoNome, Escrita, MovEstoque, Registro };

/** Toda gravação passa por aqui e é validada — a tela nunca grava direto no banco. */
const SCHEMAS: Partial<Record<ColecaoNome, ZodType>> = {
  clientes: clienteSchema,
  veiculos: veiculoSchema,
  ordens: ordemSchema,
  produtos: produtoSchema,
  vendas: vendaSchema,
  compras: compraSchema,
  fornecedores: fornecedorSchema,
  lancamentos: lancamentoSchema,
  lancamentosPessoais: lancamentoSchema,
  usuarios: usuarioSchema,
};
const NOMES: Record<ColecaoNome, string> = {
  clientes: "Cliente",
  veiculos: "Veículo",
  ordens: "OS/Orçamento",
  produtos: "Produto",
  movimentos: "Movimento",
  vendas: "Venda",
  compras: "Compra",
  fornecedores: "Fornecedor",
  lancamentos: "Lançamento",
  lancamentosPessoais: "Lançamento pessoal",
  usuarios: "Usuário",
  auditoria: "Auditoria",
};

export class ValidacaoError extends Error {}

function rotulo(r: Registro) {
  return String(r["numero"] ?? r["nome"] ?? r["descricao"] ?? r["placa"] ?? r.id);
}

export async function gravar(opts: {
  autor: Autor;
  escritas?: Escrita[];
  movimentos?: MovEstoque[];
  remocoes?: Remocao[];
  existentes?: Set<string>;
}) {
  const agora = new Date().toISOString();
  const { autor } = opts;
  const auditorias: EventoAuditoria[] = [];
  const escritas = (opts.escritas ?? []).map((e) => {
    const auditoriaId = novoId();
    const novo = !e.registro["criadoEm"];
    const carimbado: Registro = {
      ...e.registro,
      criadoEm: (e.registro["criadoEm"] as string | undefined) ?? agora,
      criadoPor: (e.registro["criadoPor"] as string | undefined) ?? autor.uid,
      criadoPorNome: (e.registro["criadoPorNome"] as string | undefined) ?? autor.nome,
      atualizadoEm: agora,
      atualizadoPor: autor.uid,
      atualizadoPorNome: autor.nome,
    };
    const schema = SCHEMAS[e.colecao];
    let final: Registro = carimbado;
    if (schema) {
      const r = schema.safeParse(carimbado);
      if (!r.success) {
        const msg = r.error.issues[0]?.message ?? "Dados inválidos";
        throw new ValidacaoError(`${NOMES[e.colecao]}: ${msg}`);
      }
      final = r.data as Registro;
    }
    auditorias.push({
      id: auditoriaId,
      colecao: e.colecao,
      registroId: final.id,
      acao: e.acao ?? (novo ? "criar" : "alterar"),
      usuarioId: autor.uid,
      usuarioNome: autor.nome,
      data: agora,
      detalhe: (e.detalhe ?? `${NOMES[e.colecao]} ${rotulo(final)}`).slice(0, 500),
    });
    return { colecao: e.colecao, registro: { ...final, auditoriaId } };
  });
  const remocoes = opts.remocoes ?? [];
  for (const rm of remocoes) {
    auditorias.push({
      id: `DEL-${rm.colecao}-${rm.id}`,
      colecao: rm.colecao,
      registroId: rm.id,
      acao: "excluir",
      usuarioId: autor.uid,
      usuarioNome: autor.nome,
      data: agora,
      detalhe: (rm.detalhe ?? `${NOMES[rm.colecao]} excluído`).slice(0, 500),
    });
  }
  await db.commit({ escritas, movimentos: opts.movimentos ?? [], remocoes, auditorias, autor, agora });
}

/** Registra um evento de auditoria isolado (ex.: login). */
export async function registrarEvento(autor: Autor, acao: AcaoAuditoria, detalhe: string) {
  const agora = new Date().toISOString();
  await db.commit({
    escritas: [],
    movimentos: [],
    remocoes: [],
    autor,
    agora,
    auditorias: [
      { id: novoId(), colecao: "sessao", registroId: autor.uid, acao, usuarioId: autor.uid, usuarioNome: autor.nome, data: agora, detalhe },
    ],
  });
}

/** Lista uma coleção e acompanha alterações em tempo real. */
export function useColecao<T>(colecao: ColecaoNome, ativo = true) {
  const [dados, setDados] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);
  const recarregar = useCallback(() => {
    void db
      .listar<Registro>(colecao)
      .then((d) => setDados(d as unknown as T[]))
      .catch((e) => console.warn(`Falha ao ler ${colecao}`, e))
      .finally(() => setCarregando(false));
  }, [colecao]);
  useEffect(() => {
    if (!ativo) return;
    recarregar();
    return db.observar(colecao, recarregar);
  }, [colecao, recarregar, ativo]);
  return { dados, carregando, recarregar };
}

export async function proximoNumero(colecao: ColecaoNome, prefixo: string) {
  const lista = await db.listar<Registro>(colecao);
  const max = lista.reduce((m, r) => {
    const n = Number(String(r["numero"] ?? "").replace(/\D/g, ""));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefixo}${String(max + 1).padStart(5, "0")}`;
}
