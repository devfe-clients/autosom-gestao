import type { acoesAuditoria, EventoAuditoria, origensMovimento } from "../schemas";

export type Registro = { id: string; [k: string]: unknown };
export type ColecaoNome =
  | "clientes"
  | "veiculos"
  | "ordens"
  | "produtos"
  | "movimentos"
  | "vendas"
  | "compras"
  | "fornecedores"
  | "lancamentos"
  | "usuarios"
  | "auditoria";

export type Autor = { uid: string; nome: string };
export type AcaoAuditoria = (typeof acoesAuditoria)[number];

export type Escrita = { colecao: ColecaoNome; registro: Registro; acao?: AcaoAuditoria; detalhe?: string };
export type Remocao = { colecao: ColecaoNome; id: string; detalhe?: string };
export type MovEstoque = {
  produtoId: string;
  delta: number;
  origem: (typeof origensMovimento)[number];
  referenciaId?: string;
  observacao?: string;
};

/** Um pacote atômico: tudo é gravado ou nada é gravado. */
export type Pacote = {
  escritas: PreparedEscrita[];
  movimentos: MovEstoque[];
  remocoes: Remocao[];
  auditorias: EventoAuditoria[];
  autor: Autor;
  agora: string;
};
export type PreparedEscrita = { colecao: ColecaoNome; registro: Registro };

export interface DBAdapter {
  nome: "local" | "firebase";
  listar<T extends Registro>(colecao: ColecaoNome): Promise<T[]>;
  observar(colecao: ColecaoNome, cb: () => void): () => void;
  commit(pacote: Pacote): Promise<void>;
}
