// Calculadora "¿merece la pena gradear?".
// Estima el retorno de mandar una carta a gradear (PSA) frente a venderla raw.

// Coste aproximado del servicio PSA (USD) — editable desde la UI.
export const DEFAULT_GRADING_COST = 25

/**
 * @param {number} rawPrice  precio raw (misma divisa que psa10Price)
 * @param {number} psa10Price precio estimado en PSA 10
 * @param {number} gradingCost coste del servicio de gradeo
 * @param {number} psa10Odds  probabilidad estimada de sacar un PSA 10 (0-1)
 */
export function gradingAnalysis({
  rawPrice,
  psa10Price,
  gradingCost = DEFAULT_GRADING_COST,
  psa10Odds = 0.35,
}) {
  if (!rawPrice || !psa10Price) return null

  // Valor esperado: con prob. psa10Odds sacas un PSA 10; si no, asumimos
  // que recuperas el valor raw (conservador, ignora PSA 9 al alza).
  const expectedValue = psa10Odds * psa10Price + (1 - psa10Odds) * rawPrice
  const netIfGraded = expectedValue - gradingCost
  const profitVsRaw = netIfGraded - rawPrice
  const multiple = psa10Price / rawPrice

  let verdict
  if (profitVsRaw > rawPrice * 0.5 && multiple >= 3) verdict = 'worth'
  else if (profitVsRaw > 0) verdict = 'maybe'
  else verdict = 'skip'

  return {
    expectedValue,
    netIfGraded,
    profitVsRaw,
    multiple,
    verdict,
    breakevenPrice: rawPrice + gradingCost, // PSA10 necesario si fuese seguro
  }
}

export const VERDICT_LABEL = {
  worth: { text: 'Merece la pena gradear', tone: 'good' },
  maybe: { text: 'Depende — margen ajustado', tone: 'warn' },
  skip: { text: 'Mejor venderla raw', tone: 'bad' },
}
