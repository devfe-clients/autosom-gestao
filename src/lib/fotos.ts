import { firebaseConfigurado } from "./firebaseConfig";

const CLOUD_NAME = (import.meta.env["VITE_CLOUDINARY_CLOUD_NAME"] as string | undefined)?.trim() ?? "";
const UPLOAD_PRESET = (import.meta.env["VITE_CLOUDINARY_UPLOAD_PRESET"] as string | undefined)?.trim() ?? "";
const cloudinaryConfigurado = CLOUD_NAME !== "" && UPLOAD_PRESET !== "";
export const fotosHabilitadas = cloudinaryConfigurado || !firebaseConfigurado;

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

export async function enviarFoto(osId: string, arquivo: File): Promise<string> {
  const blob = await comprimirImagem(arquivo);
  if (!cloudinaryConfigurado) {
    if (firebaseConfigurado) throw new Error("Envio de fotos ainda não configurado.");
    return comoDataURL(blob);
  }
  const form = new FormData();
  form.append("file", blob, `vistoria.${blob.type === "image/webp" ? "webp" : "jpg"}`);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("tags", `os-${osId}`); 
  let resp: Response;
  try {
    resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error("Sem conexão para enviar a foto. Tente novamente.");
  }
  const dados = (await resp.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
  if (!resp.ok) {
    throw new Error(dados?.error?.message ? `Falha no envio da foto: ${dados.error.message}` : `Falha no envio da foto (${resp.status}).`);
  }
  const url = dados?.secure_url ?? "";
  if (!url.startsWith("https://res.cloudinary.com/")) throw new Error("Resposta inesperada do serviço de imagens.");
  return url;
}