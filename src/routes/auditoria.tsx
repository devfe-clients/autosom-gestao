import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PageHeader, SEL, Tabela, TD, Vazio } from "@/components/app/kit";
import { useColecao } from "@/lib/db";
import { meta } from "@/lib/meta";
import { dataHoraBR } from "@/lib/calc";
import type { EventoAuditoria } from "@/lib/schemas";

export const Route = createFileRoute("/auditoria")({
  head: () => meta("Atividades", "Registro em tempo real de tudo que cada funcionário fez no sistema."),
  component: Auditoria,
});

function Auditoria() {
  const { dados } = useColecao<EventoAuditoria>("auditoria");
  const [usuario, setUsuario] = useState("");
  const [busca, setBusca] = useState("");
  const [dia, setDia] = useState("");
  const usuarios = [...new Set(dados.map((d) => d.usuarioNome))].sort();
  const lista = dados
    .filter((d) => (!usuario || d.usuarioNome === usuario) && (!dia || d.data.slice(0, 10) === dia) && `${d.detalhe} ${d.acao}`.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 500);
  return (
    <div className="space-y-4">
      <PageHeader titulo="Atividades" descricao="Atualiza sozinho: quem fez, o quê e quando." />
      <div className="flex flex-wrap gap-2">
        <select className={`${SEL} w-48`} value={usuario} onChange={(e) => setUsuario(e.target.value)}><option value="">Todos os usuários</option>{usuarios.map((u) => <option key={u}>{u}</option>)}</select>
        <input type="date" className={`${SEL} w-44`} value={dia} onChange={(e) => setDia(e.target.value)} />
        <Input className="max-w-xs" placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {lista.length === 0 ? <Vazio>Nenhuma atividade.</Vazio> : (
        <Tabela cab={["Data e hora", "Usuário", "Ação", "Detalhe"]}>
          {lista.map((d) => (
            <tr key={d.id}><td className={`${TD} whitespace-nowrap`}>{dataHoraBR(d.data)}</td><td className={TD}>{d.usuarioNome}</td><td className={TD}><span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold">{d.acao}</span></td><td className={TD}>{d.detalhe}</td></tr>
          ))}
        </Tabela>
      )}
    </div>
  );
}
