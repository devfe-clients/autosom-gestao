import type { Registro } from "./types";
/** Snapshot balance/history must still match before overwriting a ledger. */
export function validarConflitoFinanceiro(anterior: Registro | undefined, proximo: Registro) {
  if (!anterior) return;
  const valorPago = (r: Registro) => Number(r["valorPago"] ?? (r["pagoEm"] ? r["valor"] : 0));
  const historico = (r: Registro) =>
    (Array.isArray(r["pagamentos"]) ? r["pagamentos"] : []) as { valor: number }[];
  if (
    valorPago(anterior) > 0 &&
    (anterior["valor"] !== proximo["valor"] || anterior["tipo"] !== proximo["tipo"])
  )
    throw new Error("O valor e o tipo de um lançamento com pagamentos não podem ser alterados.");
  const a = historico(anterior);
  const b = historico(proximo);
  const iguais =
    JSON.stringify(a) === JSON.stringify(b) && valorPago(anterior) === valorPago(proximo);
  const append =
    b.length === a.length + 1 &&
    JSON.stringify(a) === JSON.stringify(b.slice(0, -1)) &&
    Math.abs(valorPago(proximo) - valorPago(anterior) - Number(b.at(-1)?.valor)) < 0.001;
  if (!iguais && !append)
    throw new Error("Este lançamento foi atualizado em outra tela. Atualize e tente novamente.");
}
