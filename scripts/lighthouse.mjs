/**
 * LIGHTHOUSE
 * ==========
 *
 * Corre la auditoría sobre el build de producción y escupe las cuatro notas.
 *
 * ⚠ Se audita `astro preview`, NO `astro dev`. En desarrollo Vite sirve los
 *   módulos sin empaquetar ni minificar y la nota de rendimiento no significa
 *   nada.
 *
 * Uso:  npm run build && npx astro preview --port 4400
 *       node scripts/lighthouse.mjs [url]
 */

import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'

const URL = process.argv[2] ?? 'http://localhost:4400'

const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })

try {
  for (const dispositivo of ['mobile', 'desktop']) {
    const resultado = await lighthouse(URL, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      formFactor: dispositivo,
      screenEmulation:
        dispositivo === 'desktop'
          ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
          : undefined,
      throttling: dispositivo === 'desktop' ? { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 } : undefined,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    })

    const { categories, audits } = resultado.lhr

    console.log(`\n─── ${dispositivo.toUpperCase()} ──────────────────────────`)
    for (const [clave, categoria] of Object.entries(categories)) {
      const nota = Math.round(categoria.score * 100)
      const marca = nota >= 90 ? '✓' : nota >= 50 ? '~' : '✗'
      console.log(`  ${marca} ${categoria.title.padEnd(16)} ${nota}`)
    }

    console.log(
      `    LCP ${audits['largest-contentful-paint'].displayValue} · ` +
        `CLS ${audits['cumulative-layout-shift'].displayValue} · ` +
        `TBT ${audits['total-blocking-time'].displayValue} · ` +
        `peso ${audits['total-byte-weight'].displayValue}`
    )

    // Quién es el LCP: es lo que casi siempre manda la nota de rendimiento.
    const lcp = audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]
    if (lcp?.node?.snippet) console.log(`      LCP: ${lcp.node.snippet.slice(0, 100)}`)

    // Lo que baja la nota, si baja
    const flojos = Object.values(audits)
      .filter((a) => a.score !== null && a.score < 0.9 && a.details?.overallSavingsMs > 100)
      .sort((a, b) => b.details.overallSavingsMs - a.details.overallSavingsMs)
      .slice(0, 4)
    flojos.forEach((a) => console.log(`      · ${a.title} (${Math.round(a.details.overallSavingsMs)}ms)`))

    // Y qué falla de accesibilidad, que se arregla con código y no con suerte.
    const a11y = categories.accessibility.auditRefs
      .map((ref) => audits[ref.id])
      .filter((a) => a.score !== null && a.score < 1)
    a11y.forEach((a) => console.log(`      a11y · ${a.title}`))
  }
} finally {
  /**
   * ⚠ El `kill` de chrome-launcher borra su carpeta temporal, y en Windows eso
   *   falla con EPERM bastante seguido porque Chrome todavía tiene archivos
   *   abiertos. Es basura en %TEMP%, no un problema de la auditoría: si se deja
   *   propagar, tira el script DESPUÉS de haber medido todo y no se ve ni una
   *   nota.
   */
  try {
    await chrome.kill()
  } catch {
    /* la limpieza puede fallar; las notas ya se imprimieron */
  }
}

console.log('')
