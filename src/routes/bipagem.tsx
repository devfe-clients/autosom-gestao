import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bipador } from "@/components/app/Bipador";
import { Campo, PageHeader, Tabela, TD, erroMsg } from "@/components/app/kit";
import { db, gravar, novoId, type Registro } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { meta } from "@/lib/meta";
import { dataHoraBR } from "@/lib/calc";
import type { Produto } from "@/lib/schemas";

export const Route = createFileRoute("/bipagem")({
  head: () => meta("Bipar entrada", "Entrada de mercadorias por leitor de código de barras."),
  component: Bipagem,
});

type Leitura = { quando: string; codigo: string; nome: string; saldo: number };

function Bipagem() {
  const { autor } = useAuth();
  const [qtd, setQtd] = useState("1");
  const [log, setLog] = useState<Leitura[]>([]);
  const [novo, setNovo] = useState<{ codigo: string; nome: string; preco: string } | null>(null);
  const onCodigo = useCallback(async (codigo: string) => {
    const produtos = await db.listar<Registro>("produtos") as unknown as Produto[];
    const p = produtos.find((x) => x.codigoBarras === codigo);
    if (!p) { setNovo({ codigo, nome: "", preco: "0" }); toast.warning(`Código ${codigo} não cadastrado`); return; }
    const delta = Math.max(1, Math.floor(Number(qtd) || 1));
    try {
      await gravar({ autor, movimentos: [{ produtoId: p.id, delta, origem: "bipagem", observacao: "Entrada por bipagem" }] });
      setLog((l) => [{ quando: new Date().toISOString(), codigo, nome: p.nome, saldo: p.quantidade + delta }, ...l].slice(0, 100));
      toast.success(`+${delta} ${p.nome}`);
    } catch (e) { toast.error(erroMsg(e)); }
  }, [autor, qtd]);
  async function cadastrar() {
    if (!novo) return;
    try {
      await gravar({ autor, escritas: [{ colecao: "produtos", registro: { id: novoId(), nome: novo.nome, codigoBarras: novo.codigo, custo: 0, precoVenda: Number(novo.preco), quantidade: Math.max(1, Number(qtd) || 1), estoqueMinimo: 1 } }] });
      toast.success("Produto cadastrado com o saldo bipado");
      setNovo(null);
    } catch (e) { toast.error(erroMsg(e)); }
  }
  return (
    <div className="space-y-4">
      <PageHeader titulo="Bipar entrada" descricao="Cada leitura soma ao estoque e fica registrada com seu nome e horário." />
      <div className="flex items-end gap-3">
        <Campo rotulo="Quantidade por leitura" className="w-44"><Input type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} /></Campo>
      </div>
      <Bipador onCodigo={(c) => void onCodigo(c)} />
      {novo && (
        <div className="space-y-3 rounded-lg border border-warning/50 bg-card p-4">
          <p className="text-sm">Código <b className="font-mono">{novo.codigo}</b> não existe. Cadastrar agora?</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Nome do produto" className="sm:col-span-2"><Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></Campo>
            <Campo rotulo="Preço de venda"><Input type="number" value={novo.preco} onChange={(e) => setNovo({ ...novo, preco: e.target.value })} /></Campo>
          </div>
          <div className="flex gap-2"><Button onClick={() => void cadastrar()}>Cadastrar</Button><Button variant="ghost" onClick={() => setNovo(null)}>Ignorar</Button></div>
        </div>
      )}
      <Tabela cab={["Hora", "Código", "Produto", "Novo saldo"]}>
        {log.map((l, i) => (
          <tr key={i}><td className={TD}>{dataHoraBR(l.quando)}</td><td className={`${TD} font-mono`}>{l.codigo}</td><td className={TD}>{l.nome}</td><td className={TD}>{l.saldo}</td></tr>
        ))}
      </Tabela>
    </div>
  );
}
