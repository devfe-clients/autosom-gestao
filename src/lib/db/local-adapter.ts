import { validarConflitoFinanceiro } from "./financeiro-conflito";
import { aplicarMovimentos } from "./motor-estoque";
import type { ColecaoNome, DBAdapter, Pacote, Registro } from "./types";

/** Adaptador local (navegador) para desenvolvimento e demonstração. */
const PREFIXO = "adriano-autosom:";
const listeners = new Map<ColecaoNome, Set<() => void>>();
const canal = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("adriano-autosom") : null;
canal?.addEventListener("message", (e: MessageEvent<ColecaoNome[]>) =>
  e.data.forEach((c) => listeners.get(c)?.forEach((cb) => cb())),
);

export function lerLocal<T>(colecao: ColecaoNome): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(PREFIXO + colecao) || "[]") as T[];
  } catch {
    return [];
  }
}
function escrever(colecao: ColecaoNome, dados: unknown[]) {
  window.localStorage.setItem(PREFIXO + colecao, JSON.stringify(dados));
}
function notificar(cols: ColecaoNome[]) {
  cols.forEach((c) => listeners.get(c)?.forEach((cb) => cb()));
  canal?.postMessage(cols);
}

export const localAdapter: DBAdapter = {
  nome: "local",
  async listar<T extends Registro>(colecao: ColecaoNome) {
    return lerLocal<T>(colecao);
  },
  observar(colecao, cb) {
    if (!listeners.has(colecao)) listeners.set(colecao, new Set());
    listeners.get(colecao)?.add(cb);
    return () => listeners.get(colecao)?.delete(cb);
  },
  async commit(p: Pacote) {
    // Monta o estado em memória primeiro; só grava se tudo passar (atomicidade).
    const cache = new Map<ColecaoNome, Registro[]>();
    const col = (c: ColecaoNome) => {
      if (!cache.has(c)) cache.set(c, lerLocal<Registro>(c));
      return cache.get(c) ?? [];
    };
    const upsert = (c: ColecaoNome, r: Registro) => {
      const arr = col(c);
      const i = arr.findIndex((x) => x.id === r.id);
      if (i >= 0) arr[i] = { ...arr[i], ...r };
      else arr.unshift(r);
    };
    for (const e of p.escritas) {
      if (e.colecao === "lancamentos" || e.colecao === "lancamentosPessoais") validarConflitoFinanceiro(col(e.colecao).find(x => x.id === e.registro.id), e.registro);
      upsert(e.colecao, e.registro);
    }
    if (p.movimentos.length) {
      const mapa = new Map(col("produtos").map((x) => [x.id, x]));
      const r = aplicarMovimentos(mapa, p.movimentos, p.autor, p.agora);
      [...r.produtos, ...r.movimentos].forEach((e) => upsert(e.colecao, e.registro));
      p.auditorias.push(...r.auditorias);
    }
    for (const rm of p.remocoes) cache.set(rm.colecao, col(rm.colecao).filter((x) => x.id !== rm.id));
    const aud = col("auditoria");
    aud.unshift(...(p.auditorias as unknown as Registro[]));
    cache.set("auditoria", aud.slice(0, 5000));
    for (const [c, dados] of cache) escrever(c, dados);
    notificar([...cache.keys()]);
  },
};
