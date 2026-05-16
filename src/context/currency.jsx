import { createContext, useContext, useEffect, useState } from 'react'
import { loadRates, convert, formatMoney } from '../lib/currency.js'
import { getSettings, saveSettings } from '../lib/storage.js'

const CurrencyContext = createContext(null)

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(
    getSettings().currency || 'EUR'
  )
  const [rates, setRates] = useState({ USD: 1, EUR: 0.92, JPY: 155 })

  useEffect(() => {
    loadRates().then(setRates)
  }, [])

  function setCurrency(code) {
    setCurrencyState(code)
    saveSettings({ currency: code })
  }

  // fmt(importe, divisaOrigen) -> texto en la divisa elegida.
  function fmt(amount, from = 'USD') {
    return formatMoney(convert(amount, from, currency, rates), currency)
  }

  // toCurrency(importe, divisaOrigen) -> número en la divisa elegida.
  function toCurrency(amount, from = 'USD') {
    return convert(amount, from, currency, rates)
  }

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, rates, fmt, toCurrency }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency fuera de CurrencyProvider')
  return ctx
}
