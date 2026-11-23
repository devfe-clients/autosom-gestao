import { useCallback, useRef, useState } from "react";
import { Camera, ScanBarcode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScannerCamera } from "./ScannerCamera";
import { useLeitorCodigo } from "@/hooks/use-leitor-codigo";
import { normalizarCodigo } from "@/lib/codigo-barras";
import { cn } from "@/lib/utils";

/**
 * Campo de bipagem: aceita leitor USB/sem fio (com ou sem o campo focado),
 * digitação manual + Enter, ou câmera.
 */
export function Bipador({ onCodigo, placeholder = "Bipe ou digite o código e pressione Enter", destaque, className }: {
  onCodigo: (codigo: string) => void; placeholder?: string; destaque?: string; className?: string;
}) {
  const [valor, setValor] = useState("");
  const [camera, setCamera] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const enviar = useCallback((c: string) => {
    const n = normalizarCodigo(c);
    if (n) onCodigo(n);
  }, [onCodigo]);
  useLeitorCodigo(enviar);
  return (
    <div className={cn("rounded-lg border-2 border-primary/40 bg-card p-3", className)}>
      <div className="flex items-center gap-2">
        <ScanBarcode className="h-6 w-6 shrink-0 text-primary" />
        <Input
          ref={ref}
          data-bipador="1"
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              enviar(valor);
              setValor("");
            }
          }}
          placeholder={placeholder}
          className="h-11 font-mono text-lg"
          aria-label="Código de barras"
        />
        <Button type="button" variant="secondary" size="icon" className="h-11 w-11 shrink-0" onClick={() => setCamera(true)} aria-label="Ler pela câmera">
          <Camera className="h-5 w-5" />
        </Button>
      </div>
      <div className="vu-stripe mt-2 h-1 opacity-40" />
      {destaque && <p className="mt-2 text-xs text-muted-foreground">{destaque}</p>}
      <ScannerCamera aberto={camera} onFechar={() => setCamera(false)} onCodigo={enviar} />
    </div>
  );
}
