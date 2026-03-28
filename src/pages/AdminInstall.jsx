import { useEffect } from 'react'

export default function AdminInstall() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

    if (isStandalone) {
      window.location.replace('/admin')
    }
  }, [])

  return (
    <div className="min-h-screen bg-blue-50">
      <main className="mx-auto max-w-2xl px-4 py-12">
        <section className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <h1 className="mb-3 text-2xl font-bold text-slate-900">Admin App fuer Home-Bildschirm</h1>
          <p className="mb-6 text-sm text-slate-600">
            Diese Seite ist nur fuer die Installation des Admin-Icons gedacht.
          </p>

          <ol className="list-decimal space-y-2 pl-5 text-slate-700">
            <li>Safari auf dem iPhone oeffnen und diese URL aufrufen.</li>
            <li>Unten auf Teilen tippen.</li>
            <li>Zum Home-Bildschirm waehlen.</li>
            <li>Das neue Icon startet danach direkt die Admin-Seite.</li>
          </ol>

          <a
            href="/admin"
            className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Direkt zu /admin
          </a>
        </section>
      </main>
    </div>
  )
}
