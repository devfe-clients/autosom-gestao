import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, PageHeader, SEL, Tabela, TD, erroMsg } from "@/components/app/kit";
import { gravar, useColecao } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { meta } from "@/lib/meta";
import { NOME_PERFIL } from "@/lib/permissoes";
import type { Perfil, Usuario } from "@/lib/schemas";

export const Route = createFileRoute("/usuarios")({
  head: () => meta("Usuários", "Acessos da equipe da Adriano Auto Som."),
  component: Usuarios,
});

function Usuarios() {
  const { autor, usuario, criarUsuario } = useAuth();
  const { dados } = useColecao<Usuario>("usuarios");
  const [form, setForm] = useState<{ nome: string; email: string; senha: string; perfil: Perfil; cargo: string } | null>(null);
  async function salvar() {
    if (!form) return;
    try { await criarUsuario(form); toast.success("Usuário criado"); setForm(null); } catch (e) { toast.error(erroMsg(e)); }
  }
  async function alternar(u: Usuario) {
    if (u.id === usuario?.uid) return void toast.error("Você não pode desativar a si mesma.");
    try { await gravar({ autor, escritas: [{ colecao: "usuarios", acao: "status", detalhe: `${u.nome} ${u.ativo ? "desativado" : "reativado"}`, registro: { ...u, ativo: !u.ativo } }] }); }
    catch (e) { toast.error(erroMsg(e)); }
  }
  return (
    <div className="space-y-4">
      <PageHeader titulo="Usuários" acoes={<Button onClick={() => setForm({ nome: "", email: "", senha: "", perfil: "funcionario", cargo: "" })}><Plus className="mr-1 h-4 w-4" />Novo usuário</Button>} />
      <Tabela cab={["Nome", "E-mail", "Perfil", "Cargo", "Situação", ""]}>
        {dados.map((u) => (
          <tr key={u.id}>
            <td className={TD}>{u.nome}</td><td className={TD}>{u.email}</td><td className={TD}>{NOME_PERFIL[u.perfil]}</td><td className={TD}>{u.cargo || "—"}</td>
            <td className={TD}>{u.ativo ? "Ativo" : "Inativo"}</td>
            <td className={TD}><Button size="sm" variant="secondary" onClick={() => void alternar(u)}>{u.ativo ? "Desativar" : "Reativar"}</Button></td>
          </tr>
        ))}
      </Tabela>
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <Campo rotulo="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Campo>
              <Campo rotulo="E-mail"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Campo>
              <Campo rotulo="Senha inicial"><Input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} /></Campo>
              <Campo rotulo="Perfil"><select className={SEL} value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value as Perfil })}><option value="funcionario">Funcionário</option><option value="proprietaria">Proprietária</option></select></Campo>
              <Campo rotulo="Cargo"><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></Campo>
            </div>
          )}
          <DialogFooter><Button onClick={() => void salvar()}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
