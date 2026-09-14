import { useEffect, useRef, useState } from 'react'
import { ACTIONS, ICONS, polar, FAN, ARC_R, BOX } from './fab.jsx'
import { DOCK_ICONS, ICON_SEARCH } from './demos.jsx'
import { spring } from './glasskit.jsx'

/* The console set: the same eight components as hardware. A matte slab of
   a plate, keys cut into it with narrow dark gaps, monospace uppercase
   labels, and one electric-blue backlight as the only colour — the way a
   synth panel or a pedal is built. No goo, no glass: keys press, caps
   slide, LEDs light. */

const POP = spring(260, 18)
const GLIDE = spring(220, 24)

/* a key: `lit` backlights it, `pressed` sinks it */
function Key({ as: Tag = 'button', lit = false, pressed = false, className = '', children, ...rest }) {
  return (
    <Tag className={`ck-key${lit ? ' lit' : ''}${pressed ? ' pressed' : ''} ${className}`} {...rest}>
      <span className="ck-key-face">{children}</span>
    </Tag>
  )
}

/* ---------------------------------------------------------------- menu -- */
export function ConsoleMenu() {
  const [open, setOpen] = useState(false)
  const [swap, setSwap] = useState(null)
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const pos = FAN.map((a) => polar(a, ARC_R + 6))
  const choose = (a) => {
    setOpen(false)
    setSwap(a.icon)
    timers.current.push(setTimeout(() => setSwap(null), 900))
  }
  return (
    <div className="ck-plate ck-menu">
      <div className="fab-room">
        {ACTIONS.map((a, i) => (
          <Key
            key={a.id}
            lit={open}
            className={`ck-action${open ? ' out' : ''}`}
            aria-label={a.label}
            tabIndex={open ? 0 : -1}
            onClick={() => choose(a)}
            style={{
              left: BOX.cx - 24,
              top: BOX.cy - 24,
              transform: open ? `translate(${pos[i].x}px, ${pos[i].y}px) scale(1)` : 'translate(0px, 0px) scale(0.6)',
              transition: open
                ? `transform 0.8s ${POP} ${i * 60}ms, opacity 0.2s ease ${i * 60}ms, background 0.3s ease ${i * 60 + 200}ms, box-shadow 0.3s ease ${i * 60 + 200}ms`
                : `transform 0.45s ${GLIDE} ${(2 - i) * 40}ms, opacity 0.2s ease ${(2 - i) * 40 + 160}ms, background 0.2s ease, box-shadow 0.2s ease`,
            }}
          >
            {a.icon}
          </Key>
        ))}
        <Key
          className="ck-main"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => (swap ? null : setOpen((o) => !o))}
          style={{ left: BOX.cx - 32, top: BOX.cy - 32 }}
        >
          <span className={`gm-plus${open ? ' turned' : ''}${swap ? ' out' : ''}`}>{ICONS.plus}</span>
          <span className={`gm-swap${swap ? ' in' : ''}`}>{swap}</span>
        </Key>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- dock -- */
export function ConsoleDock({ variant = 'vertical' }) {
  const [active, setActive] = useState(0)
  const row = variant === 'horizontal'
  return (
    <div className={`ck-plate ck-dock${row ? ' row' : ''}`}>
      {/* the backlight is one lit cap that slides between keys */}
      <div
        className="ck-litcap"
        style={{
          transform: row ? `translateX(${active * 64}px)` : `translateY(${active * 64}px)`,
          transition: `transform 0.8s ${POP}`,
        }}
      />
      {DOCK_ICONS.map((it, i) => (
        <Key
          key={it.id}
          className={`ck-dockkey${i === active ? ' on' : ''}`}
          aria-label={it.label}
          aria-pressed={i === active}
          onClick={() => setActive(i)}
        >
          {it.icon}
        </Key>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------- slider -- */
const SL_W = 280
const SL_CAP = 34
const SL_SPAN = SL_W - SL_CAP
const LEDS = 12

export function ConsoleSlider({ variant = 'single' }) {
  const range = variant === 'range'
  const [v, setV] = useState(range ? [0.24, 0.68] : [0.62])
  const [drag, setDrag] = useState(-1)
  const trackRef = useRef(null)
  const posFrom = (e) => {
    const rect = trackRef.current.getBoundingClientRect()
    return Math.min(1, Math.max(0, (e.clientX - rect.left - SL_CAP / 2) / SL_SPAN))
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
    <div className="ck-plate ck-fader">
      <div
        ref={trackRef}
        className={`slider-demo ck-fader-track${drag >= 0 ? ' dragging' : ''}`}
        onPointerDown={grab}
        onPointerMove={move}
        onPointerUp={() => setDrag(-1)}
        onPointerCancel={() => setDrag(-1)}
      >
        <div className="ck-slot" />
        {v.map((x, i) => (
          <div
            key={i}
            className="ck-cap"
            style={{
              transform: `translateX(${x * SL_SPAN}px)`,
              transition: drag === i ? 'transform 0.06s linear' : `transform 0.5s ${GLIDE}`,
            }}
          >
            <span className="ck-cap-line" />
          </div>
        ))}
      </div>
      {/* the level, as LEDs */}
      <div className="ck-leds">
        {Array.from({ length: LEDS }, (_, i) => {
          const t = (i + 0.5) / LEDS
          const on = range ? t >= lo && t <= hi : t <= v[0]
          return <span key={i} className={`ck-led${on ? ' on' : ''}`} />
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- toggle -- */
export function ConsoleToggle() {
  const [on, setOn] = useState(true)
  return (
    <div className="ck-plate ck-switch-plate">
      <button className={`ck-switch${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setOn(!on)}>
        <span className="ck-switch-slot">
          <span className="ck-switch-cap" style={{ transform: `translateX(${on ? 46 : 0}px)`, transition: `transform 0.8s ${POP}` }}>
            <span className="ck-cap-line" />
          </span>
        </span>
      </button>
      <span className="ck-label">
        <span className={`ck-led big${on ? ' on' : ''}`} />
        {on ? 'ON' : 'OFF'}
      </span>
    </div>
  )
}

/* -------------------------------------------------------------- search -- */
export function ConsoleSearch() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  return (
    <div className={`ck-plate ck-search${open ? ' open' : ''}`}>
      <Key
        lit={open}
        className="ck-searchkey"
        aria-label={open ? 'Close search' : 'Open search'}
        onClick={() => {
          setOpen((o) => !o)
          if (!open) setTimeout(() => inputRef.current?.focus(), 300)
        }}
      >
        {ICON_SEARCH}
      </Key>
      <div className="ck-display">
        <input ref={inputRef} className="ck-display-input" placeholder="SEARCH COMPONENTS" tabIndex={open ? 0 : -1} />
        <span className="ck-cursor" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- submit -- */
export function ConsoleSubmit() {
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
    <div className="ck-plate ck-submit-plate">
      <div className="submit-row">
        <div className="submit-wrap">
          <Key lit={state === 'done'} pressed={state === 'loading'} className={`ck-submit ${state}`} onClick={go}>
            <span className="submit-face idle">Create account</span>
            <span className="submit-face loading">
              <span className="ck-led on blink" />
              Working
            </span>
            <span className="submit-face done">Done</span>
          </Key>
        </div>
        <Key className="ck-cancel" aria-label="Cancel">
          Cancel
        </Key>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- spinner --
   An LED ring chasing around a knob: the head lights each LED in turn and a
   trail fades behind it; the knob's tick follows the head. */
const RING = 12
const RING_R = 44
const CHASE = {
  comet: { trail: 4, arms: 1 },
  arc: { trail: 8, arms: 1 },
  dual: { trail: 4, arms: 2 },
}

export function ConsoleSpinner({ variant = 'comet' }) {
  const leds = useRef([])
  const knob = useRef(null)
  const cfg = CHASE[variant] ?? CHASE.comet
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const head = ((now - t0) / 1000) * 9 // LEDs per second
      for (let i = 0; i < RING; i++) {
        let a = 0
        for (let arm = 0; arm < cfg.arms; arm++) {
          const h = head + (arm * RING) / cfg.arms
          const behind = (((h - i) % RING) + RING) % RING
          a = Math.max(a, behind < cfg.trail ? 1 - behind / cfg.trail : 0)
        }
        const el = leds.current[i]
        if (el) el.style.setProperty('--a', a.toFixed(3))
      }
      if (knob.current) knob.current.style.transform = `rotate(${((head / RING) * 360).toFixed(1)}deg)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cfg])
  return (
    <div className="ck-plate ck-spin-plate">
      <div className="ck-ring" aria-label="Loading">
        {Array.from({ length: RING }, (_, i) => {
          const a = (i / RING) * Math.PI * 2 - Math.PI / 2
          return (
            <span
              key={i}
              className="ck-led ring"
              ref={(el) => (leds.current[i] = el)}
              style={{ left: `calc(50% + ${(Math.cos(a) * RING_R).toFixed(2)}px)`, top: `calc(50% + ${(Math.sin(a) * RING_R).toFixed(2)}px)` }}
            />
          )
        })}
        <div className="ck-knob" ref={knob}>
          <span className="ck-tick" />
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- loader -- */
export function ConsoleLoader() {
  const leds = useRef([])
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const t = (now - t0) / 1000
      for (let i = 0; i < 3; i++) {
        const el = leds.current[i]
        if (!el) continue
        const a = 0.12 + 0.88 * Math.max(0, Math.sin(t * 4.2 - i * 0.82))
        el.style.setProperty('--a', a.toFixed(3))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="ck-plate ck-loader-plate">
      <div className="ck-loader" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <span key={i} className="ck-led big ring" ref={(el) => (leds.current[i] = el)} />
        ))}
      </div>
    </div>
  )
}
