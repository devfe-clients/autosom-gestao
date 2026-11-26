import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, PageHeader, SEL, Tabela, TD, Vazio, erroMsg } from "@/components/app/kit";
import { gravar, novoId, useColecao } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { meta } from "@/lib/meta";
import type { Cliente, OrdemServico, Veiculo } from "@/lib/schemas";

export const Route = createFileRoute("/veiculos")({
  head: () => meta("Veículos", "Veículos dos clientes, com placa e histórico de serviços."),
  component: Veiculos,
});

const VAZIO = { clienteId: "", placa: "", marca: "", modelo: "", ano: String(new Date().getFullYear()), cor: "", observacoes: "" };

function Veiculos() {
  const { autor, pode } = useAuth();
  const { dados } = useColecao<Veiculo>("veiculos");
  const { dados: clientes } = useColecao<Cliente>("clientes");
  const { dados: ordens } = useColecao<OrdemServico>("ordens");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<(typeof VAZIO & { id?: string }) | null>(null);
  const nomeCli = (id: string) => clientes.find((c) => c.id === id)?.nome ?? "—";
  const lista = dados.filter((v) => `${v.placa} ${v.modelo} ${v.marca} ${nomeCli(v.clienteId)}`.toLowerCase().includes(busca.toLowerCase()));
  async function salvar() {
    if (!form) return;
    try {
      await gravar({ autor, escritas: [{ colecao: "veiculos", registro: { ...form, id: form.id ?? novoId() } }] });
      toast.success("Veículo salvo");
      setForm(null);
    } catch (e) { toast.error(erroMsg(e)); }
  }
  async function excluir(v: Veiculo) {
    if (ordens.some((o) => o.veiculoId === v.id)) return void toast.error("Veículo possui OS vinculadas.");
    if (!confirm(`Excluir ${v.placa}?`)) return;
    try { await gravar({ autor, remocoes: [{ colecao: "veiculos", id: v.id, detalhe: `Veículo ${v.placa} excluído` }] }); }
    catch (e) { toast.error(erroMsg(e)); }
  }
  const set = (k: keyof typeof VAZIO) => (e: { target: { value: string } }) => setForm((f) => f && { ...f, [k]: e.target.value });
  return (
    <div>
      <PageHeader titulo="Veículos" descricao={`${dados.length} cadastrados`} acoes={<Button onClick={() => setForm({ ...VAZIO })}><Plus className="mr-1 h-4 w-4" />Novo veículo</Button>} />
      <Input className="mb-4 max-w-sm" placeholder="Buscar por placa, modelo ou cliente" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {lista.length === 0 ? <Vazio>Nenhum veículo encontrado.</Vazio> : (
        <Tabela cab={["Placa", "Veículo", "Ano", "Cliente", "OS", ""]}>
          {lista.map((v) => (
            <tr key={v.id}>
              <td className={`${TD} font-mono font-semibold`}>{v.placa}</td>
              <td className={TD}>{v.marca} {v.modelo} {v.cor && `· ${v.cor}`}</td>
              <td className={TD}>{v.ano}</td>
              <td className={TD}>{nomeCli(v.clienteId)}</td>
              <td className={TD}>{ordens.filter((o) => o.veiculoId === v.id).length}</td>
              <td className={`${TD} text-right`}>
                <Button size="icon" variant="ghost" onClick={() => setForm({ ...VAZIO, ...v, ano: String(v.ano), cor: v.cor ?? "", observacoes: v.observacoes ?? "" })}><Pencil className="h-4 w-4" /></Button>
                {pode("excluir") && <Button size="icon" variant="ghost" onClick={() => void excluir(v)}><Trash2 className="h-4 w-4" /></Button>}
              </td>
            </tr>
          ))}
        </Tabela>
      )}
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form?.id ? "Editar veículo" : "Novo veículo"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Cliente" className="sm:col-span-2">
                <select className={SEL} value={form.clienteId} onChange={set("clienteId")}>
                  <option value="">Selecione…</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Placa"><Input value={form.placa} onChange={set("placa")} className="font-mono uppercase" /></Campo>
              <Campo rotulo="Ano"><Input type="number" value={form.ano} onChange={set("ano")} /></Campo>
              <Campo rotulo="Marca"><Input value={form.marca} onChange={set("marca")} /></Campo>
              <Campo rotulo="Modelo"><Input value={form.modelo} onChange={set("modelo")} /></Campo>
              <Campo rotulo="Cor"><Input value={form.cor} onChange={set("cor")} /></Campo>
              <Campo rotulo="Observações"><Input value={form.observacoes} onChange={set("observacoes")} /></Campo>
            </div>
          )}
          <DialogFooter><Button onClick={() => void salvar()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
