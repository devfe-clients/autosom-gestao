import type { Perfil } from "./schemas";

export type Permissao =
  | "painel"
  | "os"
  | "orcamentos"
  | "pdv"
  | "estoque"
  | "etiquetas"
  | "compras"
  | "clientes"
  | "veiculos"
  | "financeiro"
  | "relatorios"
  | "auditoria"
  | "usuarios"
  | "excluir"
  | "ver-custo"
  | "ajustar-estoque";

const OPERACAO: Permissao[] = ["painel", "os", "orcamentos", "pdv", "estoque", "etiquetas", "compras", "clientes", "veiculos"];

export const MATRIZ: Record<Perfil, Permissao[]> = {
  proprietaria: [...OPERACAO, "financeiro", "relatorios", "auditoria", "usuarios", "excluir", "ver-custo", "ajustar-estoque"],
  funcionario: OPERACAO,
};

export const NOME_PERFIL: Record<Perfil, string> = {
  proprietaria: "Proprietária",
  funcionario: "Funcionário",
};

export const pode = (perfil: Perfil | undefined, p: Permissao) => (perfil ? MATRIZ[perfil].includes(p) : false);
