import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { eanValido } from "@/lib/codigo-barras";

export function CodigoBarras({ valor, altura = 50, largura = 1.6, fonte = 12 }: { valor: string; altura?: number; largura?: number; fonte?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current || !valor) return;
    const formato = /^\d{13}$/.test(valor) && eanValido(valor) ? "EAN13" : /^\d{8}$/.test(valor) && eanValido(valor) ? "EAN8" : "CODE128";
    try {
      JsBarcode(ref.current, valor, { format: formato, height: altura, width: largura, fontSize: fonte, margin: 2, background: "#ffffff", lineColor: "#000000" });
    } catch {
      JsBarcode(ref.current, valor, { format: "CODE128", height: altura, width: largura, fontSize: fonte, margin: 2 });
    }
  }, [valor, altura, largura, fonte]);
  return <svg ref={ref} />;
}
