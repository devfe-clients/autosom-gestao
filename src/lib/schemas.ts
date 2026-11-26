import { z } from "zod";

const so = (v: string) => v.replace(/\D/g, "");
const opc = (s: z.ZodString) => s.optional().or(z.literal(""));

export function isValidCPF(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  const d1 = ((sum * 10) % 11) % 10;
  if (d1 !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  return ((sum * 10) % 11) % 10 === Number(cpf[10]);
}
export function isValidCNPJ(cnpj: string) {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    let pos = len - 7;
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += Number(cnpj[i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}
export const cpfCnpjSchema = z
  .string()
  .trim()
  .refine((v) => {
    const d = so(v);
    return d.length === 11 ? isValidCPF(d) : d.length === 14 ? isValidCNPJ(d) : false;
  }, "CPF/CNPJ inválido");
export const telefoneSchema = z
  .string()
  .trim()
  .refine((v) => [10, 11].includes(so(v).length), "Telefone inválido");
export const placaSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
  .refine((v) => /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(v), "Placa inválida (ABC1234 ou ABC1D23)");

const base = {
  id: z.string().min(1),
  criadoEm: z.string().optional(),
  criadoPor: z.string().optional(),
  criadoPorNome: z.string().optional(),
  atualizadoEm: z.string().optional(),
  atualizadoPor: z.string().optional(),
  atualizadoPorNome: z.string().optional(),
};

export const formasPagamento = ["Dinheiro", "PIX", "Débito", "Crédito", "Boleto", "Transferência"] as const;
export type FormaPagamento = (typeof formasPagamento)[number];

// ---------- Clientes / veículos ----------
export const clienteSchema = z.object({
  ...base,
  nome: z.string().trim().min(3, "Informe o nome completo").max(120),
  cpfCnpj: cpfCnpjSchema.optional().or(z.literal("")),
  telefone: telefoneSchema,
  email: z.string().trim().email("E-mail inválido").max(160).optional().or(z.literal("")),
  endereco: opc(z.string().trim().max(200)),
  cidade: opc(z.string().trim().max(80)),
  observacoes: opc(z.string().trim().max(1000)),
});
export type Cliente = z.infer<typeof clienteSchema>;

export const veiculoSchema = z.object({
  ...base,
  clienteId: z.string().min(1, "Selecione o cliente"),
  placa: placaSchema,
  marca: z.string().trim().min(1, "Informe a marca").max(40),
  modelo: z.string().trim().min(1, "Informe o modelo").max(80),
  ano: z.coerce.number().int().min(1950, "Ano inválido").max(new Date().getFullYear() + 1, "Ano inválido"),
  cor: opc(z.string().trim().max(30)),
  observacoes: opc(z.string().trim().max(1000)),
});
export type Veiculo = z.infer<typeof veiculoSchema>;

// ---------- Estoque ----------
export const codigoBarrasSchema = z
  .string()
  .trim()
  .max(32)
  .refine((v) => v === "" || /^[0-9A-Za-z\-.]{4,32}$/.test(v), "Código de barras inválido");

export const categoriasProduto = [
  "Som / Multimídia",
  "Alto-falantes",
  "Módulos / Amplificadores",
  "Subwoofers / Caixas",
  "Cabos e conectores",
  "Acessórios",
  "Iluminação",
  "Alarmes / Travas",
  "Insulfilm / Película",
  "Outros",
] as const;

export const produtoSchema = z.object({
  ...base,
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  codigoBarras: codigoBarrasSchema.default(""),
  sku: opc(z.string().trim().max(40)),
  categoria: z.string().trim().max(60).default("Outros"),
  marca: opc(z.string().trim().max(60)),
  unidade: z.enum(["UN", "PAR", "KIT", "M", "CX"]).default("UN"),
  custo: z.coerce.number().min(0, "Custo inválido").max(1_000_000),
  precoVenda: z.coerce.number().min(0, "Preço inválido").max(1_000_000),
  quantidade: z.coerce.number().int("Quantidade deve ser inteira").min(0, "Estoque não pode ficar negativo"),
  estoqueMinimo: z.coerce.number().int().min(0).default(1),
  localizacao: opc(z.string().trim().max(40)),
  ativo: z.boolean().default(true),
  ultimoMovimentoId: z.string().optional(),
});
export type Produto = z.infer<typeof produtoSchema>;

export const origensMovimento = ["bipagem", "compra", "os", "pdv", "ajuste", "estorno"] as const;
export const movimentoSchema = z.object({
  ...base,
  produtoId: z.string().min(1),
  produtoNome: z.string(),
  codigoBarras: z.string().default(""),
  tipo: z.enum(["entrada", "saida"]),
  quantidade: z.number().int().positive(),
  delta: z.number().int(),
  saldoAnterior: z.number().int().min(0),
  saldoApos: z.number().int().min(0),
  origem: z.enum(origensMovimento),
  referenciaId: z.string().default(""),
  observacao: z.string().max(300).default(""),
});
export type Movimento = z.infer<typeof movimentoSchema>;

// ---------- OS / Orçamentos ----------
export const itemOSSchema = z.object({
  id: z.string(),
  tipo: z.enum(["servico", "produto"]),
  produtoId: z.string().default(""),
  descricao: z.string().trim().min(2, "Descrição obrigatória").max(160),
  quantidade: z.coerce.number().positive("Qtd inválida").max(9999),
  valorUnitario: z.coerce.number().min(0).max(1_000_000),
  custoUnitario: z.coerce.number().min(0).default(0),
  desconto: z.coerce.number().min(0).default(0),
  baixado: z.boolean().default(false),
});
export type ItemOS = z.infer<typeof itemOSSchema>;

export const itensChecklist = [
  "Som/multimídia original",
  "Alto-falantes",
  "Painel e acabamentos",
  "Luzes do painel",
  "Vidros elétricos",
  "Travas elétricas",
  "Alarme",
  "Bateria",
  "Faróis e lanternas",
  "Lataria / pintura",
  "Bancos e forração",
  "Porta-malas",
  "Ar-condicionado",
  "Retrovisores",
] as const;
export const estadosChecklist = ["OK", "Avariado", "Não possui"] as const;

export const checklistSchema = z.object({
  itens: z.record(z.string(), z.enum(estadosChecklist)).default({}),
  combustivel: z.enum(["Reserva", "1/4", "1/2", "3/4", "Cheio"]).default("1/2"),
  km: z.coerce.number().min(0).default(0),
  tensaoBateria: opc(z.string().max(10)),
  pertences: opc(z.string().max(500)),
  observacoes: z.string().max(1000).default(""),
  responsavel: z.string().default(""),
  dataHora: z.string().default(""),
});
export type Checklist = z.infer<typeof checklistSchema>;

export const statusOS = ["Aberta", "Em execução", "Aguardando peça", "Pronta", "Entregue", "Cancelada"] as const;
export const statusOrcamento = ["Pendente", "Aprovado", "Recusado", "Convertido"] as const;

export const ordemSchema = z
  .object({
    ...base,
    numero: z.string().min(1),
    tipo: z.enum(["os", "orcamento"]),
    clienteId: z.string().min(1, "Selecione o cliente"),
    veiculoId: z.string().default(""),
    status: z.enum(statusOS).default("Aberta"),
    situacaoOrcamento: z.enum(statusOrcamento).default("Pendente"),
    emissao: z.string(),
    previsao: z.string().default(""),
    validadeDias: z.coerce.number().int().min(1).max(90).default(7),
    servicoSolicitado: z.string().max(2000).default(""),
    observacoes: z.string().max(2000).default(""),
    garantiaDias: z.coerce.number().int().min(0).max(3650).default(90),
    tecnico: z.string().max(80).default(""),
    itens: z.array(itemOSSchema).max(200).default([]),
    descontoGeral: z.coerce.number().min(0).default(0),
    checklistEntrada: checklistSchema.optional(),
    checklistSaida: checklistSchema.optional(),
    orcamentoOrigemId: z.string().default(""),
    pago: z.boolean().default(false),
  })
  .refine((o) => o.tipo === "orcamento" || o.veiculoId.length > 0, {
    message: "Selecione o veículo da OS",
    path: ["veiculoId"],
  });
export type OrdemServico = z.infer<typeof ordemSchema>;

// ---------- PDV ----------
export const itemVendaSchema = z.object({
  produtoId: z.string().min(1),
  descricao: z.string().min(1),
  codigoBarras: z.string().default(""),
  quantidade: z.number().int().positive(),
  valorUnitario: z.number().min(0),
  custoUnitario: z.number().min(0).default(0),
});
export const vendaSchema = z
  .object({
    ...base,
    numero: z.string(),
    itens: z.array(itemVendaSchema).min(1, "Adicione ao menos um item").max(200),
    subtotal: z.number().min(0),
    desconto: z.number().min(0),
    total: z.number().min(0),
    formaPagamento: z.enum(formasPagamento),
    valorRecebido: z.number().min(0),
    troco: z.number().min(0),
    clienteNome: z.string().max(120).default(""),
    data: z.string(),
  })
  .refine((v) => v.desconto <= v.subtotal, { message: "Desconto maior que o subtotal", path: ["desconto"] })
  .refine((v) => Math.abs(v.subtotal - v.desconto - v.total) < 0.01, { message: "Total inconsistente" })
  .refine((v) => v.formaPagamento !== "Dinheiro" || v.valorRecebido + 0.001 >= v.total, {
    message: "Valor recebido menor que o total",
    path: ["valorRecebido"],
  });
export type Venda = z.infer<typeof vendaSchema>;

// ---------- Compras / fornecedores ----------
export const fornecedorSchema = z.object({
  ...base,
  nome: z.string().trim().min(2, "Informe o fornecedor").max(120),
  cnpj: cpfCnpjSchema.optional().or(z.literal("")),
  telefone: opc(z.string().trim().max(20)),
  contato: opc(z.string().trim().max(80)),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
});
export type Fornecedor = z.infer<typeof fornecedorSchema>;

export const itemCompraSchema = z.object({
  produtoId: z.string().min(1, "Selecione o produto"),
  descricao: z.string(),
  quantidade: z.coerce.number().int().positive(),
  custoUnitario: z.coerce.number().min(0),
});
export const compraSchema = z.object({
  ...base,
  numero: z.string(),
  fornecedorId: z.string().min(1, "Selecione o fornecedor"),
  fornecedorNome: z.string(),
  itens: z.array(itemCompraSchema).min(1, "Adicione ao menos um item").max(200),
  total: z.number().min(0),
  status: z.enum(["Pedido", "Recebida", "Cancelada"]).default("Pedido"),
  dataPedido: z.string(),
  dataRecebimento: z.string().default(""),
  notaFiscal: z.string().max(60).default(""),
  vencimento: z.string().default(""),
  formaPagamento: z.enum(formasPagamento).default("Boleto"),
});
export type Compra = z.infer<typeof compraSchema>;

// ---------- Financeiro ----------
export const lancamentoSchema = z
  .object({
    ...base,
    tipo: z.enum(["receber", "pagar"]),
    descricao: z.string().trim().min(2, "Descrição obrigatória").max(160),
    valor: z.coerce.number().positive("Valor inválido"),
    vencimento: z.string().min(1, "Informe o vencimento"),
    pagoEm: z.string().default(""),
    formaPagamento: z.enum(formasPagamento).default("PIX"),
    categoria: z.string().trim().max(60).default("Outros"),
    observacao: z.string().max(500).default(""),
    origem: z.enum(["manual", "os", "pdv", "compra"]).default("manual"),
    referenciaId: z.string().default(""),
    baixadoPor: z.string().default(""),
    origemLancamento: z.enum(["empresa", "pessoal"]).default("empresa"),
  });
export type Lancamento = z.infer<typeof lancamentoSchema>;

// ---------- Usuários / auditoria ----------
export const perfis = ["proprietaria", "funcionario"] as const;
export type Perfil = (typeof perfis)[number];
export const usuarioSchema = z.object({
  ...base,
  nome: z.string().trim().min(2, "Informe o nome").max(80),
  email: z.string().trim().email("E-mail inválido"),
  perfil: z.enum(perfis),
  cargo: z.string().trim().max(60).default(""),
  ativo: z.boolean().default(true),
  senhaLocal: z.string().optional(),
});
export type Usuario = z.infer<typeof usuarioSchema>;

export const acoesAuditoria = [
  "criar",
  "alterar",
  "excluir",
  "entrada-estoque",
  "saida-estoque",
  "venda",
  "pagamento",
  "status",
  "login",
  "logout",
] as const;
export const auditoriaSchema = z.object({
  id: z.string(),
  colecao: z.string(),
  registroId: z.string(),
  acao: z.enum(acoesAuditoria),
  usuarioId: z.string(),
  usuarioNome: z.string(),
  data: z.string(),
  detalhe: z.string().max(500).default(""),
});
export type EventoAuditoria = z.infer<typeof auditoriaSchema>;
