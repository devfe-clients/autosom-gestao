import { useEffect, useRef } from "react";
import { normalizarCodigo } from "@/lib/codigo-barras";

/**
 * Leitor USB/Bluetooth (emulação de teclado): os leitores "digitam" o código muito
 * rápido e enviam Enter no final. Capturamos isso na página inteira, sem precisar
 * clicar num campo. Digitação humana (lenta) e campos de texto comuns são ignorados.
 */
export function useLeitorCodigo(onCodigo: (codigo: string) => void, ativo = true) {
  const cb = useRef(onCodigo);
  cb.current = onCodigo;
  useEffect(() => {
    if (!ativo) return;
    let buffer = "";
    let ultimo = 0;
    const handler = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      const emCampo =
        alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable) && !alvo.dataset["bipador"];
      if (emCampo) return;
      const agora = performance.now();
      if (agora - ultimo > 80) buffer = "";
      ultimo = agora;
      if (e.key === "Enter") {
        const codigo = normalizarCodigo(buffer);
        buffer = "";
        if (codigo.length >= 4) {
          e.preventDefault();
          cb.current(codigo);
        }
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [ativo]);
}

/** Bipe curto de confirmação (ok) ou erro. */
export function bipe(tipo: "ok" | "erro" = "ok") {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = tipo === "ok" ? 1800 : 220;
    o.type = tipo === "ok" ? "sine" : "square";
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (tipo === "ok" ? 0.08 : 0.3));
  } catch {
    /* sem áudio */
  }
}
