import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfigurado, validarFirebaseConfig } from "./firebaseConfig";

/** Serviços do Firebase no navegador. Ficam nulos no servidor ou sem variáveis de ambiente (modo local). */
export const firebaseApp: FirebaseApp | null =
  firebaseConfigurado && typeof window !== "undefined"
    ? getApps().length > 0
      ? getApp()
      : initializeApp(validarFirebaseConfig())
    : null;

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const firestore: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage: FirebaseStorage | null = firebaseApp ? getStorage(firebaseApp) : null;

/** App secundário para a proprietária criar contas de funcionários sem perder a própria sessão. */
export function appSecundario(): FirebaseApp {
  const existente = getApps().find((a) => a.name === "cadastro-usuarios");
  return existente ?? initializeApp(validarFirebaseConfig(), "cadastro-usuarios");
}

export { firebaseConfigurado };
