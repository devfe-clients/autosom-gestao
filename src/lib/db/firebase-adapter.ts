import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
} from "firebase/firestore";
import { firestore } from "../firebase";
import { aplicarMovimentos } from "./motor-estoque";
import type { ColecaoNome, DBAdapter, Pacote, Registro } from "./types";

const LIMITE: Partial<Record<ColecaoNome, number>> = { auditoria: 500, movimentos: 1000 };
const CAMPO_ORDEM: Partial<Record<ColecaoNome, string>> = { auditoria: "data" };

function limpar(r: Registro) {
  // Firestore não aceita undefined.
  const { id: _id, ...resto } = r;
  return Object.fromEntries(Object.entries(resto).filter(([, v]) => v !== undefined));
}

export const firebaseAdapter: DBAdapter = {
  nome: "firebase",
  async listar<T extends Registro>(colecao: ColecaoNome): Promise<T[]> {
    if (!firestore) throw new Error("Firebase não inicializado.");
    const snap = await getDocs(
      query(
        collection(firestore, colecao),
        orderBy(CAMPO_ORDEM[colecao] ?? "criadoEm", "desc"),
        limit(LIMITE[colecao] ?? 2000),
      ),
    );
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T);
  },
  observar(colecao, cb) {
    if (!firestore) return () => {};
    return onSnapshot(collection(firestore, colecao), () => cb(), () => cb());
  },
  async commit(p: Pacote) {
    const fs = firestore;
    if (!fs) throw new Error("Firebase não inicializado.");
    // Transação: o saldo é lido no servidor e o Firestore repete tudo em caso de conflito
    // (dois caixas bipando o mesmo item ao mesmo tempo nunca geram saldo errado).
    await runTransaction(fs, async (tx) => {
      const auditorias = [...p.auditorias];
      const extras: { colecao: ColecaoNome; registro: Registro }[] = [];
      if (p.movimentos.length) {
        const ids = [...new Set(p.movimentos.map((m) => m.produtoId))];
        const mapa = new Map<string, Registro>();
        for (const id of ids) {
          const pendente = p.escritas.find((e) => e.colecao === "produtos" && e.registro.id === id);
          const snap = await tx.get(doc(fs, "produtos", id));
          if (snap.exists()) mapa.set(id, { ...snap.data(), ...(pendente?.registro ?? {}), id, quantidade: snap.data()["quantidade"] });
          else if (pendente) mapa.set(id, pendente.registro);
        }
        const r = aplicarMovimentos(mapa, p.movimentos, p.autor, p.agora);
        extras.push(...r.movimentos, ...r.produtos);
        auditorias.push(...r.auditorias);
      }
      const escritasFinais = p.escritas.filter(
        (e) => !(e.colecao === "produtos" && extras.some((x) => x.colecao === "produtos" && x.registro.id === e.registro.id)),
      );
      for (const e of [...escritasFinais, ...extras]) {
        tx.set(doc(fs, e.colecao, e.registro.id), limpar(e.registro), { merge: true });
      }
      for (const rm of p.remocoes) tx.delete(doc(fs, rm.colecao, rm.id));
      for (const a of auditorias) tx.set(doc(fs, "auditoria", a.id), limpar(a as unknown as Registro));
    });
  },
};
