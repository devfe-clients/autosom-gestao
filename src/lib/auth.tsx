import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { appSecundario, auth, firestore } from "./firebase";
import { firebaseConfigurado } from "./firebaseConfig";
import { lerLocal } from "./db/local-adapter";
import { gravar, novoId, registrarEvento, type Autor } from "./db";
import { semearLocal } from "./seed";
import { pode as podePerfil, type Permissao } from "./permissoes";
import type { Perfil, Usuario } from "./schemas";

export type Sessao = { uid: string; nome: string; email: string; perfil: Perfil; podeVerCusto?: boolean };

type Ctx = {
  usuario: Sessao | null;
  autor: Autor;
  carregando: boolean;
  pode: (p: Permissao) => boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  redefinirSenha: (email: string) => Promise<void>;
  criarUsuario: (dados: { nome: string; email: string; senha: string; perfil: Perfil; cargo: string; podeVerCusto?: boolean }) => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);
const CHAVE_LOCAL = "adriano-autosom:sessao";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!firebaseConfigurado || !auth || !firestore) {
      semearLocal();
      const uid = window.localStorage.getItem(CHAVE_LOCAL);
      const u = lerLocal<Usuario>("usuarios").find((x) => x.id === uid && x.ativo);
      setUsuario(u ? { uid: u.id, nome: u.nome, email: u.email, perfil: u.perfil, podeVerCusto: u.podeVerCusto } : null);
      setCarregando(false);
      return;
    }
    const fs = firestore;
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUsuario(null);
        setCarregando(false);
        return;
      }
      const snap = await getDoc(doc(fs, "usuarios", user.uid)).catch(() => null);
      const dados = snap?.data() as Usuario | undefined;
      if (!dados || !dados.ativo) {
        await signOut(auth!);
        setUsuario(null);
      } else {
        setUsuario({ uid: user.uid, nome: dados.nome, email: dados.email, perfil: dados.perfil, podeVerCusto: dados.podeVerCusto });
      }
      setCarregando(false);
    });
  }, []);

  const valor = useMemo<Ctx>(() => {
    const autor: Autor = usuario ? { uid: usuario.uid, nome: usuario.nome } : { uid: "anonimo", nome: "Anônimo" };
    return {
      usuario,
      autor,
      carregando,
      pode: (p) => {
        if (p === "ver-custo") {
          return usuario?.perfil === "proprietaria" || Boolean(usuario?.podeVerCusto);
        }
        return podePerfil(usuario?.perfil, p);
      },
      async entrar(email, senha) {
        const e = email.trim().toLowerCase();
        if (!auth) {
          const u = lerLocal<Usuario>("usuarios").find((x) => x.email.toLowerCase() === e);
          if (!u || u.senhaLocal !== senha) throw new Error("E-mail ou senha incorretos.");
          if (!u.ativo) throw new Error("Usuário desativado. Fale com a proprietária.");
          window.localStorage.setItem(CHAVE_LOCAL, u.id);
          setUsuario({ uid: u.id, nome: u.nome, email: u.email, perfil: u.perfil });
          await registrarEvento({ uid: u.id, nome: u.nome }, "login", "Entrou no sistema");
          return;
        }
        const cred = await signInWithEmailAndPassword(auth, e, senha);
        const snap = await getDoc(doc(firestore!, "usuarios", cred.user.uid));
        const d = snap.data() as Usuario | undefined;
        if (d?.ativo) await registrarEvento({ uid: cred.user.uid, nome: d.nome }, "login", "Entrou no sistema").catch(() => {});
      },
      async sair() {
        if (usuario) await registrarEvento(autor, "logout", "Saiu do sistema").catch(() => {});
        if (!auth) {
          window.localStorage.removeItem(CHAVE_LOCAL);
          setUsuario(null);
          return;
        }
        await signOut(auth);
      },
      async redefinirSenha(email) {
        const e = email.trim().toLowerCase();
        if (!e) throw new Error("Informe o e-mail.");
        if (!auth) throw new Error("Disponível apenas com o Firebase configurado.");
        await sendPasswordResetEmail(auth, e);
      },
      async criarUsuario({ nome, email, senha, perfil, cargo, podeVerCusto = false }) {
        if (!usuario || usuario.perfil !== "proprietaria") throw new Error("Apenas a proprietária cadastra usuários.");
        if (senha.length < 6) throw new Error("A senha precisa ter ao menos 6 caracteres.");
        let id = novoId();
        if (auth) {
          //conta criada num app secundário para não derrubar a sessão da proprietária.
          const a2 = getAuth(appSecundario());
          const cred = await createUserWithEmailAndPassword(a2, email.trim().toLowerCase(), senha);
          await updateProfile(cred.user, { displayName: nome });
          id = cred.user.uid;
          await signOut(a2);
        } else if (lerLocal<Usuario>("usuarios").some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
          throw new Error("Já existe um usuário com esse e-mail.");
        }
        await gravar({
          autor,
          escritas: [
            {
              colecao: "usuarios",
              registro: { id, nome, email: email.trim().toLowerCase(), perfil, cargo, ativo: true, podeVerCusto, ...(auth ? {} : { senhaLocal: senha }) },
            },
          ],
        });
      },
    };
  }, [usuario, carregando]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
