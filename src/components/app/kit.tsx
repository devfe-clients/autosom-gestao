import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function PageHeader({ titulo, descricao, acoes }: { titulo: string; descricao?: string; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-wide md:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function Stat({ rotulo, valor, detalhe, tom = "padrao", icone }: {
  rotulo: string; valor: ReactNode; detalhe?: ReactNode; tom?: "padrao" | "ok" | "alerta" | "perigo"; icone?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
        {rotulo}
        {icone}
      </div>
      <div
        className={cn(
          "mt-2 font-display text-2xl font-bold",
          tom === "ok" && "text-success",
          tom === "alerta" && "text-warning",
          tom === "perigo" && "text-destructive",
        )}
      >
        {valor}
      </div>
      {detalhe && <div className="mt-1 text-xs text-muted-foreground">{detalhe}</div>}
    </div>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Campo({ rotulo, children, className }: { rotulo: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{rotulo}</Label>
      {children}
    </div>
  );
}

const TONS: Record<string, string> = {
  Aberta: "bg-accent text-accent-foreground",
  "Em execução": "bg-primary/20 text-primary",
  "Aguardando peça": "bg-warning/20 text-warning",
  Pronta: "bg-success/20 text-success",
  Entregue: "bg-muted text-muted-foreground",
  Cancelada: "bg-destructive/20 text-destructive",
  Pendente: "bg-warning/20 text-warning",
  Aprovado: "bg-success/20 text-success",
  Recusado: "bg-destructive/20 text-destructive",
  Convertido: "bg-muted text-muted-foreground",
  Pedido: "bg-warning/20 text-warning",
  Recebida: "bg-success/20 text-success",
  Pago: "bg-success/20 text-success",
  "Em aberto": "bg-warning/20 text-warning",
  Vencido: "bg-destructive/20 text-destructive",
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-semibold", TONS[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}

export function erroMsg(e: unknown) {
  return e instanceof Error ? e.message : "Não foi possível concluir a operação.";
}
