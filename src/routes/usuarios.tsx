import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Pencil, Plus } from "lucide-react";
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
  const { autor, usuario, criarUsuario, redefinirSenha } = useAuth();
  const { dados } = useColecao<Usuario>("usuarios");
  const [form, setForm] = useState<{ nome: string; email: string; senha: string; perfil: Perfil; cargo: string; podeVerCusto: boolean } | null>(null);
  const [editando, setEditando] = useState<{ id: string; nome: string; email: string; perfil: Perfil; cargo: string; podeVerCusto: boolean } | null>(null);

  async function salvarEdicao() {
    if (!editando) return;
    const original = dados.find((u) => u.id === editando.id);
    if (!original) return;
    const perfilFinal: Perfil = original.id === usuario?.uid ? "proprietaria" : editando.perfil;
    try {
      await gravar({
        autor,
        escritas: [{
          colecao: "usuarios",
          acao: "alterar",
          detalhe: `Atualizou cadastro de ${editando.nome} (${editando.cargo || "sem cargo"})`,
          registro: {
            ...original,
            nome: editando.nome.trim(),
            email: original.email,
            perfil: perfilFinal,
            cargo: editando.cargo.trim(),
            podeVerCusto: perfilFinal === "proprietaria" ? true : editando.podeVerCusto,
          },
        }],
      });
      toast.success("Usuário atualizado com sucesso");
      setEditando(null);
    } catch (e) {
      toast.error(erroMsg(e));
    }
  }

  async function salvar() {
    if (!form) return;
    try { await criarUsuario(form); toast.success("Usuário criado"); setForm(null); } catch (e) { toast.error(erroMsg(e)); }
  }
  async function alternar(u: Usuario) {
    if (u.id === usuario?.uid) return void toast.error("Você não pode desativar a si mesma.");
    try { await gravar({ autor, escritas: [{ colecao: "usuarios", acao: "status", detalhe: `${u.nome} ${u.ativo ? "desativado" : "reativado"}`, registro: { ...u, ativo: !u.ativo } }] }); }
    catch (e) { toast.error(erroMsg(e)); }
  }
  async function alternarCusto(u: Usuario) {
    try {
      await gravar({
        autor,
        escritas: [{ colecao: "usuarios", acao: "alterar", detalhe: `${u.nome}: permissão de ver custo ${!u.podeVerCusto ? "liberada" : "bloqueada"}`, registro: { ...u, podeVerCusto: !u.podeVerCusto } }],
      });
      toast.success("Permissão atualizada");
    } catch (e) { toast.error(erroMsg(e)); }
  }
  async function redefinir(u: { nome: string; email: string }) {
    try {
      await redefinirSenha(u.email);
      toast.success(`E-mail de recuperação enviado para ${u.nome}! Ele receberá o link para cadastrar a nova senha.`);
    } catch (e) { toast.error(erroMsg(e)); }
  }
  return (
    <div className="space-y-4">
      <PageHeader titulo="Usuários" acoes={<Button onClick={() => setForm({ nome: "", email: "", senha: "", perfil: "funcionario", cargo: "", podeVerCusto: false })}><Plus className="mr-1 h-4 w-4" />Novo usuário</Button>} />
      <Tabela cab={["Nome", "E-mail", "Perfil", "Cargo", "Ver Custo", "Situação", ""]}>
        {dados.map((u) => (
          <tr key={u.id}>
            <td className={TD}>{u.nome}</td><td className={TD}>{u.email}</td><td className={TD}>{NOME_PERFIL[u.perfil]}</td><td className={TD}>{u.cargo || "—"}</td>
            <td className={TD}>
              {u.perfil === "proprietaria" ? (
                <span className="text-xs font-semibold text-muted-foreground">Sempre liberado</span>
              ) : (
                <Button size="sm" variant={u.podeVerCusto ? "default" : "outline"} onClick={() => void alternarCusto(u)}>
                  {u.podeVerCusto ? "Liberado" : "Oculto"}
                </Button>
              )}
            </td>
            <td className={TD}>{u.ativo ? "Ativo" : "Inativo"}</td>
            <td className={`${TD} whitespace-nowrap text-right space-x-1`}>
              {usuario?.perfil === "proprietaria" && (
                <Button
                  size="sm"
                  variant="ghost"
                  title="Editar usuário"
                  onClick={() =>
                    setEditando({
                      id: u.id,
                      nome: u.nome,
                      email: u.email,
                      perfil: u.perfil,
                      cargo: u.cargo || "",
                      podeVerCusto: !!u.podeVerCusto,
                    })
                  }
                >
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              )}
              {usuario?.perfil === "proprietaria" && (
                <Button size="sm" variant="ghost" title="Enviar e-mail para cadastrar nova senha" onClick={() => void redefinir(u)}>
                  <KeyRound className="h-4 w-4 mr-1" /> Redefinir senha
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => void alternar(u)}>{u.ativo ? "Desativar" : "Reativar"}</Button>
            </td>
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
              {form.perfil === "funcionario" && (
                <label className="flex items-center gap-2 pt-1 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.podeVerCusto}
                    onChange={(e) => setForm({ ...form, podeVerCusto: e.target.checked })}
                    className="rounded border-input text-primary"
                  />
                  <span>Permitir ver custos e lucros no estoque</span>
                </label>
              )}
            </div>
          )}
          <DialogFooter><Button onClick={() => void salvar()}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editando} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
          {editando && (
            <div className="space-y-3">
              <Campo rotulo="Nome"><Input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} /></Campo>
              <Campo rotulo="E-mail (não editável)"><Input value={editando.email} readOnly disabled /></Campo>
              <Campo rotulo="Cargo"><Input value={editando.cargo} onChange={(e) => setEditando({ ...editando, cargo: e.target.value })} /></Campo>
              <Campo rotulo="Perfil">
                <select
                  className={SEL}
                  value={editando.perfil}
                  disabled={editando.id === usuario?.uid}
                  onChange={(e) => setEditando({ ...editando, perfil: e.target.value as Perfil })}
                >
                  <option value="funcionario">Funcionário</option>
                  <option value="proprietaria">Proprietária</option>
                </select>
              </Campo>
              {editando.perfil === "funcionario" && (
                <label className="flex items-center gap-2 pt-1 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editando.podeVerCusto}
                    onChange={(e) => setEditando({ ...editando, podeVerCusto: e.target.checked })}
                    className="rounded border-input text-primary"
                  />
                  <span>Permitir ver custos e lucros no estoque</span>
                </label>
              )}
            </div>
          )}
          <DialogFooter>
            {editando && (
              <Button type="button" variant="outline" onClick={() => void redefinir(dados.find((x) => x.id === editando.id) ?? editando)}>
                Redefinir senha
              </Button>
            )}
            <Button onClick={() => void salvarEdicao()}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
