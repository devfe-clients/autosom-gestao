import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, StatusBadge, Tabela, TD, Vazio } from "./kit";
import { useColecao } from "@/lib/db";
import { brl, dataBR, somaItens } from "@/lib/calc";
import type { Cliente, OrdemServico, Veiculo } from "@/lib/schemas";

export function ListaOrdens({ tipo }: { tipo: "os" | "orcamento" }) {
  const { dados } = useColecao<OrdemServico>("ordens");
  const { dados: clientes } = useColecao<Cliente>("clientes");
  const { dados: veiculos } = useColecao<Veiculo>("veiculos");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const os = tipo === "os";
  const search: { t?: "orcamento" } = os ? {} : { t: "orcamento" };
  const cli = (id: string) => clientes.find((c) => c.id === id)?.nome ?? "—";
  const placa = (id: string) => veiculos.find((v) => v.id === id)?.placa ?? "";
  const lista = dados
    .filter((o) => o.tipo === tipo)
    .filter((o) => !status || (os ? o.status : o.situacaoOrcamento) === status)
    .filter((o) => `${o.numero} ${cli(o.clienteId)} ${placa(o.veiculoId)}`.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => b.numero.localeCompare(a.numero));
  const opcoes = os ? ["Aberta", "Em execução", "Aguardando peça", "Pronta", "Entregue", "Cancelada"] : ["Pendente", "Aprovado", "Recusado", "Convertido"];
  return (
    <div className="space-y-4">
      <PageHeader titulo={os ? "Ordens de serviço" : "Orçamentos"} acoes={
        <Button asChild><Link to="/os/$id" params={{ id: os ? "nova-os" : "novo-orcamento" }}><Plus className="mr-1 h-4 w-4" />{os ? "Nova OS" : "Novo orçamento"}</Link></Button>
      } />
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Nº, cliente ou placa" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Button size="sm" variant={!status ? "default" : "secondary"} onClick={() => setStatus("")}>Todas</Button>
        {opcoes.map((s) => <Button key={s} size="sm" variant={status === s ? "default" : "secondary"} onClick={() => setStatus(s)}>{s}</Button>)}
      </div>
      {lista.length === 0 ? <Vazio>Nenhum registro.</Vazio> : (
        <Tabela cab={["Nº", "Emissão", "Cliente", "Placa", "Total", "Situação", "Pago"]}>
          {lista.map((o) => (
            <tr key={o.id} className="hover:bg-muted/40">
              <td className={TD}><Link to="/os/$id" params={{ id: o.id }} search={search} className="font-mono font-semibold text-primary underline-offset-2 hover:underline">{o.numero}</Link></td>
              <td className={TD}>{dataBR(o.emissao)}</td>
              <td className={TD}>{cli(o.clienteId)}</td>
              <td className={`${TD} font-mono`}>{placa(o.veiculoId) || "—"}</td>
              <td className={TD}>{brl(somaItens(o.itens) - o.descontoGeral)}</td>
              <td className={TD}><StatusBadge status={os ? o.status : o.situacaoOrcamento} /></td>
              <td className={TD}>{o.pago ? "Sim" : "—"}</td>
            </tr>
          ))}
        </Tabela>
      )}
    </div>
  );
}
