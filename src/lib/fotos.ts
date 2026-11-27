import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";
import { firebaseConfigurado } from "./firebaseConfig";

export const MAX_FOTOS = 6;
const ALVO_BYTES = 180 * 1024;
const TENTATIVAS: [number, number][] = [[1280, 0.72], [1280, 0.6], [1024, 0.55], [800, 0.5]];

const paraBlob = (canvas: HTMLCanvasElement, tipo: string, qualidade: number) =>
  new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, qualidade));

const comoDataURL = (b: Blob) =>
  new Promise<string>((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => erro(r.error);
    r.readAsDataURL(b);
  });

async function abrir(arquivo: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(arquivo);
  }
}

export async function comprimirImagem(arquivo: File): Promise<Blob> {
  const bmp = await abrir(arquivo);
  try {
    let melhor: Blob | null = null;
    for (const [lado, qualidade] of TENTATIVAS) {
      const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bmp.width * escala));
      canvas.height = Math.max(1, Math.round(bmp.height * escala));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível processar a imagem.");
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      let blob = await paraBlob(canvas, "image/webp", qualidade);
      if (!blob || blob.type !== "image/webp") blob = await paraBlob(canvas, "image/jpeg", qualidade);
      if (!blob) throw new Error("Não foi possível comprimir a imagem.");
      melhor = blob;
      if (blob.size <= ALVO_BYTES) break;
    }
    if (!melhor) throw new Error("Não foi possível comprimir a imagem.");
    return melhor;
  } finally {
    bmp.close();
  }
}

export async function enviarFoto(osId: string, arquivo: File, indice = 0): Promise<string> {
  const blob = await comprimirImagem(arquivo);
  if (!storage) {
    if (firebaseConfigurado) throw new Error("Armazenamento de fotos indisponível.");
    return comoDataURL(blob);
  }
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const caminho = `os/${osId}/${Date.now()}-${indice}.${ext}`;
  await uploadBytes(ref(storage, caminho), blob, { contentType: blob.type });
  return caminho;
}

export async function urlFoto(caminho: string): Promise<string> {
  if (caminho.startsWith("data:") || !storage) return caminho;
  return getDownloadURL(ref(storage, caminho));
}

export async function apagarFoto(caminho: string): Promise<void> {
  if (caminho.startsWith("data:") || !storage) return;
  await deleteObject(ref(storage, caminho));
}