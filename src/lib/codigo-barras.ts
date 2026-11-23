/** Utilitários de código de barras (EAN-13 / EAN-8 / códigos internos). */

export function digitoEAN(semDigito: string): number {
  const nums = semDigito.split("").map(Number);
  // Pesos alternados 1/3 da direita para a esquerda (padrão GS1).
  let soma = 0;
  for (let i = 0; i < nums.length; i++) {
    const peso = (nums.length - i) % 2 === 1 ? 3 : 1;
    soma += (nums[i] ?? 0) * peso;
  }
  return (10 - (soma % 10)) % 10;
}

export function eanValido(codigo: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(codigo)) return false;
  const corpo = codigo.slice(0, -1);
  return digitoEAN(corpo) === Number(codigo.at(-1));
}

/** Normaliza o que o leitor enviou: remove espaços e caracteres de controle. */
export function normalizarCodigo(bruto: string): string {
  return bruto.replace(/[\s\u0000-\u001f]/g, "").trim();
}

/**
 * Gera EAN-13 interno (prefixo 2 = uso restrito na loja, faixa GS1 reservada),
 * para itens sem código de fábrica. Garante que não colide com os existentes.
 */
export function gerarEANInterno(existentes: Iterable<string>, sequencia?: number): string {
  const usados = new Set(existentes);
  let n = sequencia ?? Date.now() % 1_000_000_000;
  for (let tent = 0; tent < 1000; tent++, n++) {
    const corpo = `20${String(n % 10_000_000_000).padStart(10, "0")}`;
    const codigo = corpo + digitoEAN(corpo);
    if (!usados.has(codigo)) return codigo;
  }
  throw new Error("Não foi possível gerar código único.");
}
