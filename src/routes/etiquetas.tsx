import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodigoBarras } from "@/components/app/CodigoBarras";
import { PageHeader, Tabela, TD } from "@/components/app/kit";
import { useColecao } from "@/lib/db";
import { meta } from "@/lib/meta";
import { brl } from "@/lib/calc";
import type { Produto } from "@/lib/schemas";

export const Route = createFileRoute("/etiquetas")({
  head: () => meta("Etiquetas", "Impressão de etiquetas com código de barras."),
  component: Etiquetas,
});

function Etiquetas() {
  const { dados } = useColecao<Produto>("produtos");
  const [qtd, setQtd] = useState<Record<string, number>>({});
  const [busca, setBusca] = useState("");
  const lista = dados.filter((p) => p.codigoBarras && p.nome.toLowerCase().includes(busca.toLowerCase()));
  const fila = dados.flatMap((p) => Array.from({ length: qtd[p.id] ?? 0 }, () => p));
  return (
    <div>
      <div className="nao-imprimir space-y-4">
        <PageHeader titulo="Etiquetas" descricao="Escolha quantas etiquetas de cada produto e imprima." acoes={<Button disabled={!fila.length} onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Imprimir {fila.length}</Button>} />
        <Input className="max-w-sm" placeholder="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Tabela cab={["Produto", "Código", "Preço", "Qtd etiquetas"]}>
          {lista.map((p) => (
            <tr key={p.id}>
              <td className={TD}>{p.nome}</td><td className={`${TD} font-mono text-xs`}>{p.codigoBarras}</td><td className={TD}>{brl(p.precoVenda)}</td>
              <td className={TD}><Input type="number" min={0} className="w-24" value={qtd[p.id] ?? 0} onChange={(e) => setQtd({ ...qtd, [p.id]: Math.max(0, Math.min(200, Number(e.target.value) || 0)) })} /></td>
            </tr>
          ))}
        </Tabela>
        {fila.length > 0 && <h2 className="font-display text-lg font-bold">Pré-visualização</h2>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
        {fila.map((p, i) => (
          <div key={i} className="break-inside-avoid rounded border bg-card p-2 text-center print:border-foreground">
            <p className="truncate text-xs font-semibold">{p.nome}</p>
            <CodigoBarras valor={p.codigoBarras} altura={36} largura={1.3} fonte={10} />
            <p className="font-display text-sm font-bold">{brl(p.precoVenda)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
