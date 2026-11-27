import { useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apagarFoto, enviarFoto, MAX_FOTOS, urlFoto } from "@/lib/fotos";
import { erroMsg } from "./kit";

function Miniatura({ caminho, onAbrir, onRemover }: { caminho: string; onAbrir: (url: string) => void; onRemover: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    let vivo = true;
    setUrl(null);
    setFalhou(false);
    urlFoto(caminho)
      .then((u) => { if (vivo) setUrl(u); })
      .catch(() => { if (vivo) setFalhou(true); });
    return () => { vivo = false; };
  }, [caminho]);
  return (
    <div className="relative h-24 w-24 overflow-hidden rounded-md border bg-muted">
      {url ? (
        <button type="button" className="h-full w-full" onClick={() => onAbrir(url)}>
          <img src={url} alt="Foto da vistoria" className="h-full w-full object-cover" loading="lazy" />
        </button>
      ) : (
        <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-muted-foreground">{falhou ? "Indisponível" : "Carregando…"}</div>
      )}
      <Button type="button" size="icon" variant="destructive" className="nao-imprimir absolute right-1 top-1 h-6 w-6" onClick={onRemover} aria-label="Remover foto">
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function FotosVistoria({ osId, fotos, salvas, onAdicionar, onRemover }: {
  osId: string;
  fotos: string[];
  salvas: string[]; 
  onAdicionar: (novas: string[]) => void;
  onRemover: (caminho: string) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  async function adicionar(lista: FileList | null) {
    if (!lista?.length) return;
    const arquivos = Array.from(lista).slice(0, Math.max(0, MAX_FOTOS - fotos.length));
    if (lista.length > arquivos.length) toast.info(`Limite de ${MAX_FOTOS} fotos por vistoria.`);
    setEnviando(true);
    const novas: string[] = [];
    try {
      for (const [i, arquivo] of arquivos.entries()) novas.push(await enviarFoto(osId, arquivo, i));
    } catch (e) {
      const codigo = String((e as { code?: unknown }).code ?? "");
      toast.error(codigo.startsWith("storage/") ? "Não foi possível enviar a foto (armazenamento não habilitado ou sem permissão)." : erroMsg(e));
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = "";
    }
    if (novas.length) onAdicionar(novas);
  }

  function remover(caminho: string) {
    if (!salvas.includes(caminho)) void apagarFoto(caminho).catch(() => {});
    onRemover(caminho);
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="nao-imprimir flex items-center gap-3">
        <h3 className="text-sm font-semibold">Fotos da vistoria ({fotos.length}/{MAX_FOTOS})</h3>
        <input ref={entrada} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void adicionar(e.target.files)} />
        <Button type="button" size="sm" variant="secondary" disabled={enviando || fotos.length >= MAX_FOTOS} onClick={() => entrada.current?.click()}>
          <Camera className="mr-1 h-4 w-4" />{enviando ? "Enviando…" : "Adicionar fotos"}
        </Button>
      </div>
      {fotos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fotos.map((c) => <Miniatura key={c} caminho={c} onAbrir={setAberta} onRemover={() => remover(c)} />)}
        </div>
      )}
      <Dialog open={!!aberta} onOpenChange={(v) => !v && setAberta(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Foto da vistoria</DialogTitle></DialogHeader>
          {aberta && <img src={aberta} alt="Foto da vistoria" className="max-h-[75vh] w-full rounded object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}