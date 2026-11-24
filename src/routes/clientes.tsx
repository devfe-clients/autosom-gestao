import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, PageHeader, Tabela, TD, Vazio, erroMsg } from "@/components/app/kit";
import { gravar, novoId, useColecao } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { meta } from "@/lib/meta";
import type { Cliente, Veiculo } from "@/lib/schemas";

export const Route = createFileRoute("/clientes")({
  head: () => meta("Clientes", "Cadastro de clientes da Adriano Auto Som."),
  component: Clientes,
});

const VAZIO = { nome: "", cpfCnpj: "", telefone: "", email: "", endereco: "", cidade: "Praia Grande", observacoes: "" };

function Clientes() {
  const { autor, pode } = useAuth();
  const { dados } = useColecao<Cliente>("clientes");
  const { dados: veiculos } = useColecao<Veiculo>("veiculos");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<(typeof VAZIO & { id?: string; criadoEm?: string }) | null>(null);
  const lista = dados
    .filter((c) => `${c.nome} ${c.telefone} ${c.cpfCnpj ?? ""}`.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  async function salvar() {
    if (!form) return;
    try {
      await gravar({ autor, escritas: [{ colecao: "clientes", registro: { ...form, id: form.id ?? novoId() } }] });
      toast.success("Cliente salvo");
      setForm(null);
    } catch (e) { toast.error(erroMsg(e)); }
  }
  async function excluir(c: Cliente) {
    if (veiculos.some((v) => v.clienteId === c.id)) return toast.error("Cliente possui veículos cadastrados.");
    if (!confirm(`Excluir ${c.nome}?`)) return;
    try { await gravar({ autor, remocoes: [{ colecao: "clientes", id: c.id, detalhe: `Cliente ${c.nome} excluído` }] }); toast.success("Excluído"); }
    catch (e) { toast.error(erroMsg(e)); }
  }
  const set = (k: keyof typeof VAZIO) => (e: { target: { value: string } }) => setForm((f) => f && { ...f, [k]: e.target.value });
  return (
    <div>
      <PageHeader titulo="Clientes" descricao={`${dados.length} cadastrados`} acoes={<Button onClick={() => setForm({ ...VAZIO })}><Plus className="mr-1 h-4 w-4" />Novo cliente</Button>} />
      <Input className="mb-4 max-w-sm" placeholder="Buscar por nome, telefone ou CPF" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {lista.length === 0 ? <Vazio>Nenhum cliente encontrado.</Vazio> : (
        <Tabela cab={["Nome", "Telefone", "CPF/CNPJ", "Veículos", ""]}>
          {lista.map((c) => (
            <tr key={c.id}>
              <td className={TD}>{c.nome}</td>
              <td className={TD}>{c.telefone}</td>
              <td className={TD}>{c.cpfCnpj || "—"}</td>
              <td className={TD}>{veiculos.filter((v) => v.clienteId === c.id).map((v) => v.placa).join(", ") || "—"}</td>
              <td className={`${TD} text-right`}>
                <Button size="icon" variant="ghost" onClick={() => setForm({ ...VAZIO, ...c } as never)}><Pencil className="h-4 w-4" /></Button>
                {pode("excluir") && <Button size="icon" variant="ghost" onClick={() => void excluir(c)}><Trash2 className="h-4 w-4" /></Button>}
              </td>
            </tr>
          ))}
        </Tabela>
      )}
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form?.id ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Nome completo" className="sm:col-span-2"><Input value={form.nome} onChange={set("nome")} /></Campo>
              <Campo rotulo="Telefone"><Input value={form.telefone} onChange={set("telefone")} placeholder="(13) 99999-9999" /></Campo>
              <Campo rotulo="CPF/CNPJ"><Input value={form.cpfCnpj} onChange={set("cpfCnpj")} /></Campo>
              <Campo rotulo="E-mail" className="sm:col-span-2"><Input value={form.email} onChange={set("email")} /></Campo>
              <Campo rotulo="Endereço"><Input value={form.endereco} onChange={set("endereco")} /></Campo>
              <Campo rotulo="Cidade"><Input value={form.cidade} onChange={set("cidade")} /></Campo>
              <Campo rotulo="Observações" className="sm:col-span-2"><Textarea value={form.observacoes} onChange={set("observacoes")} /></Campo>
            </div>
          )}
          <DialogFooter><Button onClick={() => void salvar()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
