export function trackPortfolioEvent(name, parameters = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false
  window.gtag('event', name, parameters)
  return true
}
