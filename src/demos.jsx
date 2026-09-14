import { useEffect, useRef, useState } from 'react'
import { Liquid } from 'liquid-gooey'
import { GooFab } from './fab.jsx'

/* Cinematic graphite material: dark surfaces on a near-black atmosphere,
   white iconography, no color. Separation comes from machined edge light —
   a faint top rim + deep ambient shadow on the merged silhouette. */
export const GRAPHITE = '#232329'
export const GRAPHITE_HI = '#2C2C33' // the active/floating body, one step lighter
export const DARK_SHADOW =
  '0 18px 40px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1.5px 2px rgba(255, 255, 255, 0.11), inset 0 -4px 10px rgba(0, 0, 0, 0.42)'
export const DARK_SHADOW_SM =
  '0 10px 24px rgba(0, 0, 0, 0.55), 0 1px 4px rgba(0, 0, 0, 0.5), inset 0 1px 1.5px rgba(255, 255, 255, 0.12), inset 0 -2.5px 6px rgba(0, 0, 0, 0.4)'
/* porcelain: the light goo bodies (slider thumb, toggle knob) — white rim
   light is invisible on white, so depth comes from a soft dark underbelly */
export const PORCELAIN = '#EDEDF1'
export const PORCELAIN_SHADOW =
  '0 8px 20px rgba(0, 0, 0, 0.5), 0 1px 4px rgba(0, 0, 0, 0.45), inset 0 1.5px 2px rgba(255, 255, 255, 0.95), inset 0 -3px 6px rgba(0, 0, 0, 0.16)'
const gooLayer = { position: 'absolute', inset: 0, pointerEvents: 'none' }
/* item wrappers are `display: contents`, so children lay out as direct kids of
   the group — centring the group is what makes a body grow/shrink about its
   own middle instead of pinning its left edge */
const gooCenter = { ...gooLayer, display: 'grid', placeItems: 'center' }

/* Shape-change tuned for small controls: `travel` flings a droplet ahead of
   the size change and `contentBlur` smears the label — both read as liquid at
   poster scale and as a glitch on a 52px button. Keep the spring, drop the
   theatrics. */
const SHAPE = {
  shape: true,
  bounce: 0.45,
  contentBlur: 0,
  /* the default size spring (170/11.5) lags far enough that the icon or label
     briefly sits outside its own liquid — stiffen it so the surface hugs the
     box, and let `bounce` supply the overshoot instead */
  advanced: { evolve: { travel: 0, roundness: 0.2, sizeStiffness: 330, sizeDamping: 17 } },
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* a rAF loop that only runs while the component is mounted */
function useClock(fn, deps = []) {
  useEffect(() => {
    if (reduced()) return
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      fn((now - t0) / 1000)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/* ---------------------------------------------------------------- menu -- */
export function MenuDemo() {
  return (
    <div className="fab-room">
      <GooFab goo={{ fill: GRAPHITE, shadow: DARK_SHADOW }} style={{ left: 0, top: 0 }} />
    </div>
  )
}

/* ---------------------------------------------------------------- dock -- */
export const DOCK_ICONS = [
  {
    id: 'home',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
        <path
          d="M4.5 10.2 12 4l7.5 6.2V19a1.6 1.6 0 0 1-1.6 1.6H6.1A1.6 1.6 0 0 1 4.5 19v-8.8z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'grid',
    label: 'Spaces',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <rect x="4.5" y="4.5" width="6.4" height="6.4" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13.1" y="4.5" width="6.4" height="6.4" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="4.5" y="13.1" width="6.4" height="6.4" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13.1" y="13.1" width="6.4" height="6.4" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'pen',
    label: 'Studio',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M5 19l1-3.8L16.6 4.6a2.05 2.05 0 0 1 2.9 2.9L8.9 18.1 5 19z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'me',
    label: 'You',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="10.4" r="2" fill="currentColor" />
        <path d="M8.4 15.6a3.9 3.9 0 0 1 7.2 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function DockDemo({ variant = 'vertical' }) {
  const [active, setActive] = useState(0)
  const row = variant === 'horizontal'
  return (
    <div className={`dock${row ? ' row' : ''}`}>
      <Liquid blur={8} contrast={26} fill={GRAPHITE_HI} shadow={DARK_SHADOW_SM} style={gooLayer}>
        <Liquid.Item effect="move" move={{ springiness: 0.48, wobble: 0.5, stretch: 0.5, trail: 0.75 }}>
          <div
            className="dock-bubble"
            style={{ transform: row ? `translateX(${active * 64}px)` : `translateY(${active * 64}px)` }}
          />
        </Liquid.Item>
      </Liquid>
      {DOCK_ICONS.map((it, i) => (
        <button
          key={it.id}
          className={`dock-btn${i === active ? ' on' : ''}`}
          aria-label={it.label}
          onClick={() => setActive(i)}
        >
          {it.icon}
        </button>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------- slider -- */
const SL_W = 280
const SL_THUMB = 30
const SL_SPAN = SL_W - SL_THUMB

export function SliderDemo({ variant = 'single' }) {
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
    // pick whichever thumb is nearer to the touch
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
      className={`slider-demo${drag >= 0 ? ' dragging' : ''}`}
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
      <Liquid blur={7} contrast={26} fill={PORCELAIN} shadow={PORCELAIN_SHADOW} style={gooLayer}>
        {v.map((x, i) => (
          <Liquid.Item key={i} effect="move" move={{ springiness: 0.55, wobble: 0.6, stretch: 0.62, trail: 0.7 }}>
            <div
              className="slider-thumb"
              style={{ transform: `translateX(${x * SL_SPAN}px) scale(${drag === i ? 1.18 : 1})` }}
            />
          </Liquid.Item>
        ))}
      </Liquid>
    </div>
  )
}

/* -------------------------------------------------------------- toggle -- */
export function ToggleDemo() {
  const [on, setOn] = useState(true)
  return (
    <button className={`toggle${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setOn(!on)}>
      <Liquid blur={7} contrast={26} fill={PORCELAIN} shadow={PORCELAIN_SHADOW} style={gooLayer}>
        <Liquid.Item effect="move" move={{ springiness: 0.5, wobble: 0.68, stretch: 0.55, trail: 0.72 }}>
          <div className="toggle-knob" style={{ transform: `translateX(${on ? 44 : 0}px)` }} />
        </Liquid.Item>
      </Liquid>
    </button>
  )
}


/* -------------------------------------------------------------- search -- */
/* Closed it is a button, so it keeps the raised treatment. Open it is a text
   field, and a field is a groove: the toggle track's own fill, its hairline as
   an inset ring, its inset top shadow — and nothing else. No drop shadow, and
   no bottom highlight either, since that is what was puffing it back up. */
const FIELD_FILL = '#151518' // the toggle track's fill, exactly
const FIELD_SHADOW =
  'inset 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 2px 6px rgba(0, 0, 0, 0.55)' 

export const ICON_SEARCH = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <circle cx="10.6" cy="10.6" r="6.1" fill="none" stroke="currentColor" strokeWidth="1.9" />
    <path d="M15.2 15.2 20 20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
)

/* A search field that lives as a round icon button until you need it, then
   stretches open. `morph.shape` is the library's shape-change physics: the
   liquid mass travels ahead of the size change and the corners round out
   late, so the pill pours open instead of sliding. */
export function SearchDemo() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  return (
    <div className="search">
      <Liquid
        blur={9}
        contrast={27}
        fill={open ? FIELD_FILL : GRAPHITE_HI}
        shadow={open ? FIELD_SHADOW : DARK_SHADOW_SM}
        style={gooCenter}
      >
        <Liquid.Item morph={SHAPE}>
          <div className={`search-body${open ? ' open' : ''}`}>
            <button
              className="search-ic"
              aria-label={open ? 'Close search' : 'Open search'}
              onClick={() => {
                setOpen((o) => !o)
                if (!open) setTimeout(() => inputRef.current?.focus(), 240)
              }}
            >
              {ICON_SEARCH}
            </button>
            <input ref={inputRef} className="search-input" placeholder="Search components" tabIndex={open ? 0 : -1} />
          </div>
        </Liquid.Item>
      </Liquid>
    </div>
  )
}

/* -------------------------------------------------------------- submit -- */
/* The submit button every form ships. The catch with a button that squeezes is
   that a changing width reflows whatever sits next to it, so the footprint here
   is FIXED: `.submit-wrap` reserves 208x52 forever and only the liquid skin
   inside it contracts. The Cancel beside it never moves — that is the proof. */
export function SubmitDemo() {
  const [state, setState] = useState('idle') // idle | loading | done
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
      <div className="submit-wrap">
        <Liquid blur={9} contrast={27} fill={PORCELAIN} shadow={PORCELAIN_SHADOW} style={gooCenter}>
          <Liquid.Item morph={SHAPE}>
            <div className={`submit-skin ${state}`} />
          </Liquid.Item>
        </Liquid>
        <button className={`submit ${state}`} onClick={go}>
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
        </button>
      </div>
      <span className="submit-ghost">Cancel</span>
    </div>
  )
}
