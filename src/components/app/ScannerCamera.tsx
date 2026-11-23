import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Leitura pela câmera do celular/tablet (biblioteca carregada só no navegador). */
export function ScannerCamera({ aberto, onFechar, onCodigo }: { aberto: boolean; onFechar: () => void; onCodigo: (c: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    if (!aberto) return;
    let parar: (() => void) | undefined;
    let cancelado = false;
    let ultimo = "";
    let ultimoEm = 0;
    setErro("");
    void (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelado || !video.current) return;
        const leitor = new BrowserMultiFormatReader();
        const controles = await leitor.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          video.current,
          (res) => {
            if (!res) return;
            const t = res.getText();
            const agora = Date.now();
            if (t === ultimo && agora - ultimoEm < 1500) return; // evita leitura dupla
            ultimo = t;
            ultimoEm = agora;
            onCodigo(t);
          },
        );
        parar = () => controles.stop();
        if (cancelado) parar();
      } catch {
        setErro("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
      }
    })();
    return () => {
      cancelado = true;
      parar?.();
    };
  }, [aberto, onCodigo]);
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ler código pela câmera</DialogTitle>
        </DialogHeader>
        <div className="relative overflow-hidden rounded-md bg-muted">
          <video ref={video} className="aspect-[4/3] w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-destructive shadow-[0_0_12px_var(--color-destructive)]" />
        </div>
        <p className="text-sm text-muted-foreground">{erro || "Aponte para o código de barras. Cada leitura é registrada automaticamente."}</p>
      </DialogContent>
    </Dialog>
  );
}
