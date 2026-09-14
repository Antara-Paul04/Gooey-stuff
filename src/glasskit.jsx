import { useEffect, useRef, useState } from 'react'
import { Glass } from './glass.jsx'
import { ACTIONS, ICONS, polar, FAN, ARC_R, BOX } from './fab.jsx'
import { DOCK_ICONS, ICON_SEARCH } from './demos.jsx'

/* The glass set: the same eight components, rebuilt as Liquid Glass. No
   goo here — these are rigid lenses that move with springs; the material
   does the talking (see glass.jsx). Sizes match the gooey twins so the two
   sets sit identically on the stage. */

/* a spring as a CSS easing — Chrome's linear() lets a real damped spring
   drive a transition */
function spring(stiffness = 300, damping = 22, mass = 1, steps = 40) {
  const w0 = Math.sqrt(stiffness / mass)
  const z = damping / (2 * Math.sqrt(stiffness * mass))
  const wd = w0 * Math.sqrt(Math.max(0, 1 - z * z))
  const pts = []
  const dur = 1
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * dur
    let x
    if (z < 1) x = 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t))
    else x = 1 - Math.exp(-w0 * t) * (1 + w0 * t)
    pts.push(x.toFixed(4))
  }
  return `linear(${pts.join(', ')})`
}
const POP = spring(260, 18) // overshoots, settles
const GLIDE = spring(220, 24) // no overshoot to speak of
const T_POP = '0.9s'
const T_GLIDE = '0.7s'

/* ---------------------------------------------------------------- menu -- */
export function GlassMenu() {
  const [open, setOpen] = useState(false)
  const [swap, setSwap] = useState(null)
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const pos = FAN.map((a) => polar(a, ARC_R))
  const choose = (a) => {
    setOpen(false)
    setSwap(a.icon)
    timers.current.push(setTimeout(() => setSwap(null), 900))
  }
  return (
    <div className="fab-room glass-menu">
      {ACTIONS.map((a, i) => (
        <Glass
          key={a.id}
          as="button"
          radius={22}
          className={`gm-action${open ? ' out' : ''}`}
          aria-label={a.label}
          tabIndex={open ? 0 : -1}
          onClick={() => choose(a)}
          style={{
            left: BOX.cx - 22,
            top: BOX.cy - 22,
            transform: open ? `translate(${pos[i].x}px, ${pos[i].y}px) scale(1)` : 'translate(0px, 0px) scale(0.35)',
            transition: open
              ? `transform ${T_POP} ${POP} ${i * 55}ms, opacity 0.25s ease ${i * 55}ms`
              : `transform 0.5s ${GLIDE} ${(2 - i) * 40}ms, opacity 0.2s ease ${(2 - i) * 40 + 160}ms`,
          }}
        >
          {a.icon}
        </Glass>
      ))}
      <Glass
        as="button"
        radius={28}
        className="gm-main"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => (swap ? null : setOpen((o) => !o))}
        style={{ left: BOX.cx - 28, top: BOX.cy - 28 }}
      >
        <span className={`gm-plus${open ? ' turned' : ''}${swap ? ' out' : ''}`}>{ICONS.plus}</span>
        <span className={`gm-swap${swap ? ' in' : ''}`}>{swap}</span>
      </Glass>
    </div>
  )
}

/* ---------------------------------------------------------------- dock -- */
export function GlassDock({ variant = 'vertical' }) {
  const [active, setActive] = useState(0)
  const row = variant === 'horizontal'
  return (
    <Glass className={`dock glass-dock${row ? ' row' : ''}`} radius={32} tint={0.05}>
      <Glass
        className="gd-bubble"
        radius={26}
        style={{
          transform: row ? `translateX(${active * 64}px)` : `translateY(${active * 64}px)`,
          transition: `transform ${T_POP} ${POP}`,
        }}
      />
      {DOCK_ICONS.map((it, i) => (
        <button
          key={it.id}
          className={`dock-btn${i === active ? ' on' : ''}`}
          aria-label={it.label}
          aria-pressed={i === active}
          onClick={() => setActive(i)}
        >
          {it.icon}
        </button>
      ))}
    </Glass>
  )
}

/* -------------------------------------------------------------- slider -- */
const SL_W = 280
const SL_THUMB = 30
const SL_SPAN = SL_W - SL_THUMB

export function GlassSlider({ variant = 'single' }) {
  const range = variant === 'range'
  const [v, setV] = useState(range ? [0.24, 0.68] : [0.62])
  const [drag, setDrag] = useState(-1)
  const trackRef = useRef(null)
  const posFrom = (e) => {
    const rect = trackRef.current.getBoundingClientRect()
    return Math.min(1, Math.max(0, (e.clientX - rect.left - SL_THUMB / 2) / SL_SPAN))
  }
  const grab = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = posFrom(e)
    const i = v.length === 1 ? 0 : Math.abs(v[0] - p) <= Math.abs(v[1] - p) ? 0 : 1
    setDrag(i)
    setV((prev) => prev.map((x, j) => (j === i ? p : x)))
  }
  const move = (e) => {
    if (drag < 0) return
    const p = posFrom(e)
    setV((prev) => prev.map((x, j) => (j === drag ? p : x)))
  }
  const lo = Math.min(...v)
  const hi = Math.max(...v)
  return (
    <div
      ref={trackRef}
      className={`slider-demo glass-slider${drag >= 0 ? ' dragging' : ''}`}
      onPointerDown={grab}
      onPointerMove={move}
      onPointerUp={() => setDrag(-1)}
      onPointerCancel={() => setDrag(-1)}
    >
      <div className="slider-track">
        <div
          className="slider-fill"
          style={{
            left: range ? `${lo * SL_SPAN + SL_THUMB / 2}px` : 0,
            width: range ? `${(hi - lo) * SL_SPAN}px` : `${v[0] * SL_SPAN + SL_THUMB / 2}px`,
          }}
        />
      </div>
      {v.map((x, i) => (
        <Glass
          key={i}
          className="gs-thumb"
          radius={15}
          style={{
            transform: `translateX(${x * SL_SPAN}px) scale(${drag === i ? 1.12 : 1})`,
            transition: drag === i ? 'transform 0.06s linear' : `transform 0.5s ${GLIDE}`,
          }}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------- toggle --
   A flat track — grey off, green on — and only the knob is glass: a clear
   disc riding on the colour, bending its edge as it crosses. */
export function GlassToggle() {
  const [on, setOn] = useState(true)
  return (
    <button className={`toggle glass-toggle${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setOn(!on)}>
      <Glass
        className="gt-knob"
        radius={22}
        depth={10}
        thickness={14}
        tint={0.03}
        style={{ transform: `translateX(${on ? 44 : 0}px)`, transition: `transform ${T_POP} ${POP}` }}
      />
    </button>
  )
}

/* -------------------------------------------------------------- search -- */
export function GlassSearch() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  return (
    <div className="search glass-search">
      <Glass
        className={`gsearch${open ? ' open' : ''}`}
        radius={26}
        tint={open ? 0.06 : 0.04}
      >
        <button
          className="search-ic"
          aria-label={open ? 'Close search' : 'Open search'}
          onClick={() => {
            setOpen((o) => !o)
            if (!open) setTimeout(() => inputRef.current?.focus(), 260)
          }}
        >
          {ICON_SEARCH}
        </button>
        <input ref={inputRef} className="search-input" placeholder="Search components" tabIndex={open ? 0 : -1} />
      </Glass>
    </div>
  )
}

/* -------------------------------------------------------------- submit -- */
export function GlassSubmit() {
  const [state, setState] = useState('idle')
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const go = () => {
    if (state !== 'idle') return
    setState('loading')
    timers.current.push(setTimeout(() => setState('done'), 1500))
    timers.current.push(setTimeout(() => setState('idle'), 3400))
  }
  return (
    <div className="submit-row">
      <div className="submit-wrap glass-submit">
        <Glass as="button" className={`gsubmit ${state}`} radius={26} onClick={go}>
          <span className="submit-face idle">Create account</span>
          <span className="submit-face loading">
            <span className="submit-spin" />
          </span>
          <span className="submit-face done">
            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
              <path d="m5.6 12.4 4 4 8.8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Done
          </span>
        </Glass>
      </div>
      <span className="submit-ghost">Cancel</span>
    </div>
  )
}

/* ------------------------------------------------------------- spinner --
   Rigid beads can't fuse into a comma, so the glass spinner spaces them out
   around the ring, each a step smaller than the one ahead — the classic
   tapering dot spinner, cut from glass. */
const SPIN_R = 34
const SPIN = {
  comet: { n: 8, taper: 0.075, arms: 1, head: 20 },
  arc: { n: 12, taper: 0.045, arms: 1, head: 18 },
  dual: { n: 5, taper: 0.11, arms: 2, head: 20 },
}

/* beads are too small for a flat top — make them full domes (marbles):
   the bezel spans the whole radius and the slab is a little thicker */
const marble = (d) => ({ radius: d / 2, depth: d / 2, thickness: Math.round(d * 0.8), tint: 0.06, flex: false })

export function GlassSpinner({ variant = 'comet' }) {
  const bodies = useRef([])
  const cfg = SPIN[variant] ?? SPIN.comet
  const count = cfg.n * cfg.arms
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const spin = ((now - t0) / 1000) * 2.3
      for (let i = 0; i < count; i++) {
        const el = bodies.current[i]
        if (!el) continue
        const k = i % cfg.n
        const step = (Math.PI * 2) / (cfg.n * cfg.arms)
        const a = spin + Math.floor(i / cfg.n) * Math.PI - k * step
        el.style.transform = `translate(${(Math.cos(a) * SPIN_R).toFixed(2)}px, ${(Math.sin(a) * SPIN_R).toFixed(2)}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [count, cfg])
  return (
    <div className="spin-stage glass-spin" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => {
        const k = i % cfg.n
        const d = Math.max(10, Math.round(cfg.head * (1 - k * cfg.taper)))
        return (
          <div key={i} className="gsp-bead" ref={(el) => (bodies.current[i] = el)} style={{ width: d, height: d, margin: -d / 2 }}>
            <Glass {...marble(d)} style={{ width: d, height: d }} />
          </div>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------- loader -- */
const AMP = 22
const PERIOD = 1.5
const LAG = 0.82
const SPACING = 40

export function GlassLoader() {
  const bodies = useRef([])
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf
    const t0 = performance.now()
    const w = (Math.PI * 2) / PERIOD
    const tick = (now) => {
      const t = (now - t0) / 1000
      for (let i = 0; i < 3; i++) {
        const el = bodies.current[i]
        if (!el) continue
        const y = -Math.sin(w * t - i * LAG) * AMP
        el.style.transform = `translate(${((i - 1) * SPACING).toFixed(1)}px, ${y.toFixed(2)}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="loader-stage glass-loader" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="gld-bead" ref={(el) => (bodies.current[i] = el)}>
          <Glass {...marble(26)} style={{ width: 26, height: 26 }} />
        </div>
      ))}
    </div>
  )
}
