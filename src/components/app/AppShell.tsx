import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Activity, BarChart3, Car, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, Package, ScanBarcode,
  ShieldCheck, ShoppingBag, ShoppingCart, Speaker, Tag, Users, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { modoBanco } from "@/lib/db";
import { NOME_PERFIL, type Permissao } from "@/lib/permissoes";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoginScreen } from "./LoginScreen";

type Item = { to: string; label: string; icon: typeof Package; perm: Permissao };
const GRUPOS: { titulo: string; itens: Item[] }[] = [
  { titulo: "Operação", itens: [
    { to: "/", label: "Painel", icon: LayoutDashboard, perm: "painel" },
    { to: "/pdv", label: "PDV / Balcão", icon: ShoppingBag, perm: "pdv" },
    { to: "/os", label: "Ordens de serviço", icon: ClipboardList, perm: "os" },
    { to: "/orcamentos", label: "Orçamentos", icon: FileText, perm: "orcamentos" },
    { to: "/clientes", label: "Clientes", icon: Users, perm: "clientes" },
    { to: "/veiculos", label: "Veículos", icon: Car, perm: "veiculos" },
  ] },
  { titulo: "Estoque", itens: [
    { to: "/estoque", label: "Estoque", icon: Package, perm: "estoque" },
    { to: "/bipagem", label: "Bipar entrada", icon: ScanBarcode, perm: "estoque" },
    { to: "/etiquetas", label: "Etiquetas", icon: Tag, perm: "etiquetas" },
    { to: "/compras", label: "Compras", icon: ShoppingCart, perm: "compras" },
  ] },
  { titulo: "Gestão", itens: [
    { to: "/financeiro", label: "Financeiro", icon: Wallet, perm: "financeiro" },
    { to: "/relatorios", label: "Relatórios", icon: BarChart3, perm: "relatorios" },
    { to: "/auditoria", label: "Atividades", icon: Activity, perm: "auditoria" },
    { to: "/usuarios", label: "Usuários", icon: ShieldCheck, perm: "usuarios" },
  ] },
];
const TODOS = GRUPOS.flatMap((g) => g.itens);

function useEhOrcamento() {
  return useRouterState({
    select: (s) => s.location.pathname.includes("orcamento") || (s.location.search as { t?: unknown }).t === "orcamento",
  });
}

function permDaRota(path: string, ehOrcamento: boolean): Permissao | null {
  if (path === "/") return "painel";
  if (ehOrcamento) return "orcamentos";
  if (path.startsWith("/os")) return "os";
  const item = TODOS.find((i) => i.to !== "/" && path.startsWith(i.to));
  return item?.perm ?? null;
}

function Nav({ onNav }: { onNav?: (() => void) | undefined }) {
  const { pode } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const ehOrcamento = useEhOrcamento();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto p-3">
      {GRUPOS.map((g) => {
        const itens = g.itens.filter((i) => pode(i.perm));
        if (!itens.length) return null;
        return (
          <div key={g.titulo}>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{g.titulo}</p>
            {itens.map((i) => {
              const ativo = i.to === "/" ? path === "/"
                : i.to === "/orcamentos" ? ehOrcamento
                : i.to === "/os" ? path.startsWith("/os") && !ehOrcamento
                : path.startsWith(i.to);
              return (
                <Link key={i.to} to={i.to} onClick={onNav}
                  className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    ativo ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
                  <i.icon className="h-4 w-4" />
                  {i.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function Lateral({ onNav }: { onNav?: () => void }) {
  const { usuario, sair } = useAuth();
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground"><Speaker className="h-6 w-6" /></div>
        <div className="leading-tight">
          <p className="font-display text-sm font-bold tracking-widest">ADRIANO AUTO SOM</p>
          <p className="text-[11px] text-muted-foreground">Sistema de gestão</p>
        </div>
      </div>
      <Nav onNav={onNav} />
      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 px-1">
          <p className="truncate text-sm font-semibold">{usuario?.nome}</p>
          <p className="text-xs text-muted-foreground">{usuario && NOME_PERFIL[usuario.perfil]} · {modoBanco === "firebase" ? "Nuvem" : "Modo local"}</p>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => void sair()}><LogOut className="mr-2 h-4 w-4" />Sair</Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, carregando, pode } = useAuth();
  const [aberto, setAberto] = useState(false);
  const ehOrcamento = useEhOrcamento();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (carregando) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>;
  if (!usuario) return <LoginScreen />;
  const perm = permDaRota(path, ehOrcamento);
  const permitido = !perm || pode(perm);
  return (
    <div className="flex min-h-screen">
      <aside className="nao-imprimir sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border lg:block"><Lateral /></aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="nao-imprimir flex items-center gap-3 border-b px-4 py-3 lg:hidden">
          <Sheet open={aberto} onOpenChange={setAberto}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Menu"><Menu /></Button></SheetTrigger>
            <SheetContent side="left" className="w-64 p-0"><Lateral onNav={() => setAberto(false)} /></SheetContent>
          </Sheet>
          <span className="font-display font-bold tracking-widest">ADRIANO AUTO SOM</span>
        </header>
        <main className="flex-1 p-4 md:p-8">
          {permitido ? children : (
            <div className="mx-auto mt-20 max-w-md text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
              <h1 className="mt-4 text-xl font-bold">Acesso restrito</h1>
              <p className="mt-2 text-sm text-muted-foreground">Esta área é exclusiva da proprietária.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
