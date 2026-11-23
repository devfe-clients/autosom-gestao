import { lerLocal } from "./db/local-adapter";
import { digitoEAN } from "./codigo-barras";

/** Dados de demonstração do modo local (nunca usados com Firebase). */
const P = "adriano-autosom:";
const iso = (diasAtras: number) => new Date(Date.now() - diasAtras * 86400000).toISOString();
const ean = (corpo: string) => corpo + digitoEAN(corpo);
const carimbo = (d: number, nome = "Dayane Santana", uid = "U-DAYANE") => ({
  criadoEm: iso(d),
  criadoPor: uid,
  criadoPorNome: nome,
  atualizadoEm: iso(d),
  atualizadoPor: uid,
  atualizadoPorNome: nome,
});

export function semearLocal() {
  if (typeof window === "undefined" || window.localStorage.getItem(P + "seed-v1")) return;
  const set = (c: string, v: unknown) => window.localStorage.setItem(P + c, JSON.stringify(v));
  if (lerLocal("usuarios").length === 0) {
    set("usuarios", [
      { id: "U-DAYANE", nome: "Dayane Santana", email: "dayane@adrianoautosom.com.br", perfil: "proprietaria", cargo: "Proprietária", ativo: true, senhaLocal: "123456", ...carimbo(60) },
      { id: "U-ADRIANO", nome: "Adriano", email: "adriano@adrianoautosom.com.br", perfil: "funcionario", cargo: "Instalador", ativo: true, senhaLocal: "123456", ...carimbo(60) },
      { id: "U-BALCAO", nome: "Lucas (Balcão)", email: "balcao@adrianoautosom.com.br", perfil: "funcionario", cargo: "Vendedor", ativo: true, senhaLocal: "123456", ...carimbo(60) },
    ]);
  }
  const produtos = [
    ["Central multimídia 7\" Android 2GB", "7898765432101", "Som / Multimídia", "Pioneer", 650, 1190, 6, 2],
    ["Rádio MP3 Bluetooth 1 DIN", "7891234500017", "Som / Multimídia", "Positron", 95, 189.9, 12, 4],
    ["Alto-falante 6\" triaxial (par)", "7891234500024", "Alto-falantes", "Bravox", 110, 219.9, 9, 4],
    ["Kit duas vias 6\" componente", "7891234500031", "Alto-falantes", "JBL", 260, 489, 3, 2],
    ["Módulo amplificador 4 canais 400W", "7891234500048", "Módulos / Amplificadores", "Taramps", 320, 599, 4, 2],
    ["Subwoofer 12\" 350W RMS", "7891234500055", "Subwoofers / Caixas", "Hurricane", 280, 520, 2, 2],
    ["Caixa dutada 12\" MDF", ean("200000000001"), "Subwoofers / Caixas", "Fabricação própria", 90, 220, 5, 2],
    ["Kit cabos 4mm p/ módulo", "7891234500062", "Cabos e conectores", "Techone", 35, 79.9, 15, 5],
    ["Chicote ISO universal", ean("200000000002"), "Cabos e conectores", "—", 8, 25, 40, 10],
    ["Moldura 2 DIN Gol G5", "7891234500079", "Acessórios", "Navpro", 28, 69.9, 1, 3],
    ["Câmera de ré com sensor", "7891234500086", "Acessórios", "Multilaser", 70, 159.9, 7, 3],
    ["Lâmpada LED H4 6000K (par)", "7891234500093", "Iluminação", "Shocklight", 85, 179.9, 10, 4],
    ["Alarme automotivo com 2 controles", "7891234500109", "Alarmes / Travas", "Pósitron", 140, 289, 4, 2],
    ["Insulfilm G20 (metro)", ean("200000000003"), "Insulfilm / Película", "Insulfilm", 12, 35, 50, 15],
  ] as const;
  set(
    "produtos",
    produtos.map(([nome, codigoBarras, categoria, marca, custo, precoVenda, quantidade, estoqueMinimo], i) => ({
      id: `P-${String(i + 1).padStart(3, "0")}`,
      nome, codigoBarras, categoria, marca, custo, precoVenda, quantidade, estoqueMinimo,
      sku: `AAS-${String(i + 1).padStart(3, "0")}`, unidade: "UN", localizacao: `Prateleira ${(i % 4) + 1}`, ativo: true,
      ...carimbo(45),
    })),
  );
  set("clientes", [
    { id: "C-001", nome: "Marcos Vinícius Oliveira", telefone: "(13) 99712-4455", email: "marcos.oliveira@email.com", cpfCnpj: "", cidade: "Praia Grande", endereco: "Av. Kennedy, 1200", observacoes: "", ...carimbo(30) },
    { id: "C-002", nome: "Fernanda Lopes Ribeiro", telefone: "(13) 98845-1020", email: "", cpfCnpj: "", cidade: "São Vicente", endereco: "", observacoes: "", ...carimbo(20) },
    { id: "C-003", nome: "Rafael Souza Lima", telefone: "(13) 99120-7788", email: "", cpfCnpj: "", cidade: "Praia Grande", endereco: "", observacoes: "Prefere contato por WhatsApp", ...carimbo(10) },
  ]);
  set("veiculos", [
    { id: "V-001", clienteId: "C-001", placa: "FKD4E21", marca: "Volkswagen", modelo: "Gol G5 1.0", ano: 2012, cor: "Prata", observacoes: "", ...carimbo(30) },
    { id: "V-002", clienteId: "C-002", placa: "GHT2B90", marca: "Chevrolet", modelo: "Onix LT", ano: 2019, cor: "Branco", observacoes: "", ...carimbo(20) },
    { id: "V-003", clienteId: "C-003", placa: "EZQ7731", marca: "Fiat", modelo: "Strada Working", ano: 2016, cor: "Vermelho", observacoes: "", ...carimbo(10) },
  ]);
  set("fornecedores", [
    { id: "F-001", nome: "Distribuidora SomSul", cnpj: "", telefone: "(11) 3333-4040", contato: "Paulo", email: "", ...carimbo(50) },
    { id: "F-002", nome: "Baixada Acessórios Automotivos", cnpj: "", telefone: "(13) 3471-2200", contato: "Renata", email: "", ...carimbo(50) },
  ]);
  const ck = (d: number) => ({ itens: {}, combustivel: "1/2", km: 0, tensaoBateria: "12.4V", pertences: "", observacoes: "", responsavel: "Adriano", dataHora: iso(d) });
  set("ordens", [
    {
      id: "O-001", numero: "OS00001", tipo: "os", clienteId: "C-001", veiculoId: "V-001", status: "Em execução", situacaoOrcamento: "Aprovado",
      emissao: iso(1).slice(0, 10), previsao: iso(-1).slice(0, 10), validadeDias: 7, servicoSolicitado: "Instalação de multimídia 2 DIN e câmera de ré",
      observacoes: "", garantiaDias: 90, tecnico: "Adriano", descontoGeral: 0, orcamentoOrigemId: "", pago: false,
      itens: [
        { id: "I1", tipo: "produto", produtoId: "P-001", descricao: "Central multimídia 7\" Android 2GB", quantidade: 1, valorUnitario: 1190, custoUnitario: 650, desconto: 0, baixado: false },
        { id: "I2", tipo: "servico", produtoId: "", descricao: "Mão de obra instalação multimídia", quantidade: 1, valorUnitario: 180, custoUnitario: 0, desconto: 0, baixado: false },
      ],
      checklistEntrada: ck(1), ...carimbo(1, "Adriano", "U-ADRIANO"),
    },
    {
      id: "O-002", numero: "OR00001", tipo: "orcamento", clienteId: "C-002", veiculoId: "V-002", status: "Aberta", situacaoOrcamento: "Pendente",
      emissao: iso(2).slice(0, 10), previsao: "", validadeDias: 7, servicoSolicitado: "Projeto de som: módulo + sub + caixa",
      observacoes: "", garantiaDias: 90, tecnico: "", descontoGeral: 50, orcamentoOrigemId: "", pago: false,
      itens: [
        { id: "I1", tipo: "produto", produtoId: "P-005", descricao: "Módulo amplificador 4 canais 400W", quantidade: 1, valorUnitario: 599, custoUnitario: 320, desconto: 0, baixado: false },
        { id: "I2", tipo: "produto", produtoId: "P-006", descricao: "Subwoofer 12\" 350W RMS", quantidade: 1, valorUnitario: 520, custoUnitario: 280, desconto: 0, baixado: false },
        { id: "I3", tipo: "servico", produtoId: "", descricao: "Instalação de módulo e sub", quantidade: 1, valorUnitario: 250, custoUnitario: 0, desconto: 0, baixado: false },
      ],
      ...carimbo(2, "Lucas (Balcão)", "U-BALCAO"),
    },
  ]);
  set("lancamentos", [
    { id: "L-001", tipo: "pagar", descricao: "Aluguel do galpão", valor: 2800, vencimento: iso(-5).slice(0, 10), pagoEm: "", formaPagamento: "Boleto", categoria: "Aluguel", observacao: "", origem: "manual", referenciaId: "", baixadoPor: "", ...carimbo(15) },
    { id: "L-002", tipo: "pagar", descricao: "Energia elétrica", valor: 430.5, vencimento: iso(3).slice(0, 10), pagoEm: iso(3).slice(0, 10), formaPagamento: "PIX", categoria: "Contas fixas", observacao: "", origem: "manual", referenciaId: "", baixadoPor: "Dayane Santana", ...carimbo(15) },
    { id: "L-003", tipo: "receber", descricao: "OS00000 - Instalação alarme", valor: 450, vencimento: iso(4).slice(0, 10), pagoEm: iso(4).slice(0, 10), formaPagamento: "Crédito", categoria: "Serviços", observacao: "", origem: "manual", referenciaId: "", baixadoPor: "Dayane Santana", ...carimbo(4) },
  ]);
  window.localStorage.setItem(P + "seed-v1", "1");
}
