import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Stat } from "@/components/app/kit";
import { useColecao } from "@/lib/db";
import type { OrdemServico, Produto } from "@/lib/schemas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — Adriano Auto Som" },
      { name: "description", content: "Visão geral da operação da Adriano Auto Som." },
      { property: "og:title", content: "Painel — Adriano Auto Som" },
      { property: "og:description", content: "Visão geral da operação da Adriano Auto Som." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { dados: produtos } = useColecao<Produto>("produtos");
  const { dados: ordens } = useColecao<OrdemServico>("ordens");
  const baixo = produtos.filter((p) => p.quantidade <= p.estoqueMinimo).length;
  const abertas = ordens.filter((o) => o.tipo === "os" && !["Entregue", "Cancelada"].includes(o.status)).length;
  return (
    <div>
      <PageHeader titulo="Painel" descricao="Visão geral da operação" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat rotulo="Produtos" valor={produtos.length} />
        <Stat rotulo="Estoque baixo" valor={baixo} tom={baixo ? "alerta" : "ok"} />
        <Stat rotulo="OS abertas" valor={abertas} />
      </div>
    </div>
  );
}
