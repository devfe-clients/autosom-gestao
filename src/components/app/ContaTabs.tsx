import { Button } from "@/components/ui/button";
import type { Conta } from "@/lib/financeiro";
export function ContaTabs({ conta, onChange }: { conta: Conta; onChange: (conta: Conta) => void }) {
  return (
    <div
      className="flex flex-wrap gap-1 border-b pb-3"
      role="tablist"
      aria-label="Conta financeira"
    >
      {(["empresa", "pessoal"] as const).map((c) => (
        <Button
          key={c}
          role="tab"
          aria-selected={conta === c}
          variant={conta === c ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(c)}
        >
          {c === "empresa" ? "Empresa (Adriano Auto Som)" : "Pessoal (Dayane)"}
        </Button>
      ))}
    </div>
  );
}
