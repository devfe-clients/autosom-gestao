import { centavos, somaItens, totalItem } from './calc';
import type { OrdemServico, Venda } from './schemas';
export function totalOrdem(o: OrdemServico) { return centavos(Math.max(0, somaItens(o.itens) - o.descontoGeral)); }
export type ItemRelatorio = { id: string; documento: string; origem: 'os' | 'pdv'; data: string; produtoId: string; descricao: string; tipo: string; quantidade: number; receita: number; custo: number; clienteId: string; clienteNome: string; tecnico: string };
export function itensComerciais(ordens: OrdemServico[], vendas: Venda[]): ItemRelatorio[] {
  const os = ordens.flatMap(o => { const subtotal = somaItens(o.itens); const fator = subtotal > 0 ? totalOrdem(o) / subtotal : 0;
    return o.itens.map(i => ({id:`${o.id}-${i.id}`,documento:o.numero,origem:'os' as const,data:o.emissao,produtoId:i.produtoId,descricao:i.descricao,tipo:i.tipo,quantidade:i.quantidade,receita:centavos(totalItem(i)*fator),custo:centavos(i.custoUnitario*i.quantidade),clienteId:o.clienteId,clienteNome:'',tecnico:o.tecnico})); });
  const pdv = vendas.flatMap(v => v.itens.map((i,index) => ({id:`${v.id}-${index}`,documento:v.numero,origem:'pdv' as const,data:v.data,produtoId:i.produtoId,descricao:i.descricao,tipo:'produto',quantidade:i.quantidade,receita:centavos(i.quantidade*i.valorUnitario*(v.subtotal>0?v.total/v.subtotal:0)),custo:centavos(i.quantidade*i.custoUnitario),clienteId:'',clienteNome:v.clienteNome,tecnico:v.criadoPorNome ?? ''})));
  return [...os,...pdv];
}
export function margemSobreVenda(receita: number, custo: number) { return receita>0 ? (receita-custo)/receita*100 : null; }
