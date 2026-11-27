import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

import { firebaseConfigurado, validarFirebaseConfig } from "./firebaseConfig";

export const firebaseApp: FirebaseApp | null =
  firebaseConfigurado && typeof window !== "undefined"
    ? getApps().length > 0
      ? getApp()
      : initializeApp(validarFirebaseConfig())
    : null;

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const firestore: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;

export function appSecundario(): FirebaseApp {
  const existente = getApps().find((a) => a.name === "cadastro-usuarios");
  return existente ?? initializeApp(validarFirebaseConfig(), "cadastro-usuarios");
}

export { firebaseConfigurado };
