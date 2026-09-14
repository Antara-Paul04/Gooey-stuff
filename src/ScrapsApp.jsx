import { useRef, useState } from 'react'
import { GooFab, QUARTER, QUARTER_R } from './fab.jsx'

const KICKER_DATE = new Date()
  .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  .toUpperCase()

export default function ScrapsApp() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [toastA, setToastA] = useState(null) // last action, kept for exit animation
  const [toastOn, setToastOn] = useState(false)
  const fabRef = useRef(null)

  const onToast = (a) => {
    if (a) {
      setToastA(a)
      setToastOn(true)
    } else {
      setToastOn(false)
    }
  }

  return (
    <div className="page">
      <div className="phone">
        <div className="screen">
          <div className="status" aria-hidden="true">
            <span>9:41</span>
            <svg viewBox="0 0 40 12" width="40" height="12">
              <path d="M2 8.6a8.6 8.6 0 0 1 11.6 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="7.8" cy="10.4" r="1.15" fill="currentColor" />
              <rect x="19.5" y="2" width="16" height="8" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".55" />
              <rect x="21.3" y="3.8" width="9.5" height="4.4" rx="1.3" fill="currentColor" />
            </svg>
          </div>

          <header className="app-head">
            <div>
              <p className="kicker">{KICKER_DATE}</p>
              <h1>Scraps</h1>
            </div>
            <span className="avatar" aria-hidden="true">
              A
            </span>
          </header>

          <main className="list" aria-hidden="true">
            <p className="group">Today</p>
            <article className="row">
              <div className="row-head">
                <h2>Film is ready</h2>
                <time>9:12</time>
              </div>
              <p>Bild Lab closes at six — bring the paper ticket.</p>
            </article>
            <article className="row">
              <div className="row-head">
                <h2>Book the darkroom</h2>
                <time>8:47</time>
              </div>
              <p>Ask about Thursday evenings.</p>
            </article>
            <p className="group">Earlier</p>
            <article className="row">
              <div className="row-head">
                <h2>Nana&rsquo;s soup</h2>
                <time>Mon</time>
              </div>
              <p>The leek goes in last — write it down properly.</p>
            </article>
            <article className="row">
              <div className="row-head">
                <h2>Friday pack list</h2>
                <time>Fri</time>
              </div>
              <p>Charger, three rolls of film, the good socks.</p>
            </article>
          </main>

          <button
            className="scrim"
            data-on={menuOpen || undefined}
            tabIndex={-1}
            aria-hidden="true"
            onPointerDown={() => fabRef.current?.close()}
          />

          {/* corner-anchored: the 200px stage centres its blob at x=100, so
              pull the box right by (200 - 100 - 28) to sit 20px off the edge */}
          <GooFab
            ref={fabRef}
            angles={QUARTER}
            radius={QUARTER_R}
            onOpenChange={setMenuOpen}
            onToast={onToast}
            style={{ right: -52, bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}
          />

          <div className="toast" data-on={toastOn || undefined} role="status">
            {toastA && (
              <>
                <span className="toast-ic">{toastA.icon}</span>
                <b>{toastA.toast}</b>
              </>
            )}
          </div>

          <div className="home-bar" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
