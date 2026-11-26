import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bipador } from "@/components/app/Bipador";
import { Campo, PageHeader, Tabela, TD, erroMsg } from "@/components/app/kit";
import { gravar, novoId, useColecao } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { meta } from "@/lib/meta";
import { brl, dataHoraBR } from "@/lib/calc";
import type { Produto } from "@/lib/schemas";

export const Route = createFileRoute("/bipagem")({
  head: () => meta("Bipar entrada", "Entrada de mercadorias por leitor de código de barras."),
  component: Bipagem,
});

type Leitura = { quando: string; codigo: string; nome: string; saldo: number };
type Modo = "consulta" | "entrada";
type Consulta = { codigo: string; produto: Produto | null };

let audioCtx: AudioContext | null = null;
/**bep curto (web audio): agudo = achou; grave duplo = não encontrado. */
function beep(ok: boolean) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    const ctx = audioCtx;
    if (ctx.state === "suspended") void ctx.resume();
    const notas: [number, number, number][] = ok ? [[1040, 0, 0.12]] : [[220, 0, 0.18], [165, 0.22, 0.28]];
    for (const [freq, inicio, dur] of notas) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = ok ? "sine" : "square";
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + inicio;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.15, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }
  } catch {
  }
}

function CartaoConsulta({ c }: { c: Consulta | null }) {
  if (!c) return <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Aguardando leitura…</div>;
  const p = c.produto;
  if (!p) {
    return (
      <div role="alert" className="rounded-xl border-2 border-destructive bg-destructive/10 p-8 text-center">
        <p className="text-3xl font-extrabold text-destructive">Código não encontrado</p>
        <p className="mt-2 font-mono text-lg">{c.codigo}</p>
        <p className="mt-1 text-sm text-muted-foreground">Produto não cadastrado. Para cadastrar, use <b>Dar Entrada</b>.</p>
      </div>
    );
  }
  const baixo = p.quantidade <= p.estoqueMinimo;
  return (
    <div className="rounded-xl border-2 border-primary/50 bg-card p-6">
      <p className="text-2xl font-bold leading-tight">{p.nome}</p>
      <p className="mt-1 font-mono text-sm text-muted-foreground">{p.codigoBarras}{p.marca ? ` · ${p.marca}` : ""}</p>
      <p className="mt-4 text-6xl font-extrabold text-primary">{brl(p.precoVenda)}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Em estoque</p>
          <p className={`text-3xl font-bold ${p.quantidade <= 0 ? "text-destructive" : baixo ? "text-warning" : ""}`}>
            {p.quantidade} {p.unidade}{p.quantidade <= 0 ? " · sem estoque" : baixo ? " · baixo" : ""}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Localização</p>
          <p className="text-3xl font-bold">{p.localizacao || "Não informada"}</p>
        </div>
      </div>
    </div>
  );
}

function Bipagem() {
  const { autor } = useAuth();
  const { dados: produtos } = useColecao<Produto>("produtos");
  const [modo, setModo] = useState<Modo>("consulta");
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [qtd, setQtd] = useState("1");
  const [log, setLog] = useState<Leitura[]>([]);
  const [novo, setNovo] = useState<{ codigo: string; nome: string; preco: string } | null>(null);
  const onCodigo = useCallback(async (codigo: string) => {
    const p = produtos.find((x) => x.codigoBarras === codigo);
    if (modo === "consulta") {
      setConsulta({ codigo, produto: p ?? null }); 
      beep(!!p);
      return;
    }
    if (!p) { setNovo({ codigo, nome: "", preco: "0" }); toast.warning(`Código ${codigo} não cadastrado`); return; }
    const delta = Math.max(1, Math.floor(Number(qtd) || 1));
    try {
      await gravar({ autor, movimentos: [{ produtoId: p.id, delta, origem: "bipagem", observacao: "Entrada por bipagem" }] });
      setLog((l) => [{ quando: new Date().toISOString(), codigo, nome: p.nome, saldo: p.quantidade + delta }, ...l].slice(0, 100));
      toast.success(`+${delta} ${p.nome}`);
    } catch (e) { toast.error(erroMsg(e)); }
  }, [autor, qtd, modo, produtos]);
  function trocarModo(m: Modo) { setModo(m); setNovo(null); setConsulta(null); }
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
      <PageHeader
        titulo={modo === "consulta" ? "Consultar preço" : "Bipar entrada"}
        descricao={modo === "consulta" ? "Aponte a pistola para ver preço e saldo. Nada é gravado no estoque." : "Cada leitura soma ao estoque e fica registrada com seu nome e horário."}
      />
      <div className="inline-flex gap-1 rounded-lg border p-1">
        {([["consulta", "Consultar Preço"], ["entrada", "Dar Entrada"]] as const).map(([k, r]) => (
          <Button key={k} size="sm" variant={modo === k ? "default" : "ghost"} onClick={() => trocarModo(k)}>{r}</Button>
        ))}
      </div>
      {modo === "entrada" && (
        <div className="flex items-end gap-3">
          <Campo rotulo="Quantidade por leitura" className="w-44"><Input type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} /></Campo>
        </div>
      )}
      <Bipador onCodigo={(c) => void onCodigo(c)} />
      {modo === "consulta" && <CartaoConsulta c={consulta} />}
      {modo === "entrada" && novo && (
        <div className="space-y-3 rounded-lg border border-warning/50 bg-card p-4">
          <p className="text-sm">Código <b className="font-mono">{novo.codigo}</b> não existe. Cadastrar agora?</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Nome do produto" className="sm:col-span-2"><Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></Campo>
            <Campo rotulo="Preço de venda"><Input type="number" value={novo.preco} onChange={(e) => setNovo({ ...novo, preco: e.target.value })} /></Campo>
          </div>
          <div className="flex gap-2"><Button onClick={() => void cadastrar()}>Cadastrar</Button><Button variant="ghost" onClick={() => setNovo(null)}>Ignorar</Button></div>
        </div>
      )}
      {modo === "entrada" && (
        <Tabela cab={["Hora", "Código", "Produto", "Novo saldo"]}>
          {log.map((l, i) => (
            <tr key={i}><td className={TD}>{dataHoraBR(l.quando)}</td><td className={`${TD} font-mono`}>{l.codigo}</td><td className={TD}>{l.nome}</td><td className={TD}>{l.saldo}</td></tr>
          ))}
        </Tabela>
      )}
    </div>
  );
}
