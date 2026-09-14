import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Liquid } from 'liquid-gooey'

/* ---------------------------------------------------------------- tuning --
   The goo. blur vs. gap decides how far pieces bridge; contrast decides how
   sharp the liquid edge is. Shadow renders on the MERGED silhouette (inset
   layers paint inside the edge — that's the jelly depth, not gloss). */
export const GOO = {
  blur: 9,
  contrast: 28,
  fill: '#4E6BE8',
  /* small neutral shadow + soft-silicone insets — the material can be
     colorful, the environment must not glow */
  shadow:
    '0 3px 10px rgba(45, 62, 120, 0.16), 0 1px 3px rgba(35, 50, 100, 0.1), inset 0 2px 3px rgba(255, 255, 255, 0.25), inset 0 -3px 6px rgba(30, 50, 160, 0.16)',
  /* no waviness — at this scale edge noise reads as bad anti-aliasing, and
     the motion already supplies the organic character */
}

/* ?slow=3 stretches every spring and delay uniformly — slow-motion for
   inspecting (or recording) the goo. Same shapes, k× slower. */
export const SLOW = Math.max(1, Number(new URLSearchParams(location.search).get('slow')) || 1)
const slowed = (s) => ({ stiffness: s.stiffness / (SLOW * SLOW), damping: s.damping / SLOW, mass: 1 })

/* ------------------------------------------------------------- geometry --
   The stage is a fixed 200×148 box with the main blob's centre at (100,106);
   actions fan out along an arc around it. Callers place the box with `style`
   (see ScrapsApp for the corner-anchored offset). */
export const BOX = { w: 200, h: 148, cx: 100, cy: 106 }
const R_MAIN = 28 // main blob radius at rest
const R_ACT = 22 // action blob radius at rest
export const ARC_R = 70 // default: a tight family cluster around the button
/* Adjacent actions must stay apart: the chord between two of them is
   2·r·sin(Δ/2), and once that drops under ~44+blur they fuse into one lumpy
   mass. At r=70 that means keeping Δ ≥ ~50°. */
/* degrees CCW from the +x axis: a semicircular fan by default */
export const FAN = [156, 90, 24]
/* corner-anchored: 48° apart at r=86 so the three never touch each other */
export const QUARTER = [176, 128, 80]
export const QUARTER_R = 86
const CLOSED_SCALE = 0.5 // droplet size while hiding inside the main blob

export const polar = (deg, r = ARC_R) => ({
  x: Math.cos((deg * Math.PI) / 180) * r,
  y: -Math.sin((deg * Math.PI) / 180) * r,
})

/* Choreography. The fan sweeps open (first blob leads, the others follow
   around the arc) and swallows in reverse. Staggers are dropped when a
   gesture interrupts mid-flight — a delayed retarget freezes blobs in air. */
const OPEN_DELAY = [0, 55, 110].map((d) => d * SLOW)
const CLOSE_DELAY = [110, 55, 0].map((d) => d * SLOW)
/* springs front-load velocity, which teleports the birth moment — travel out
   on a slow-start overshoot curve instead: peel … whip … wobble into place */
const OPEN_TRAVEL = { duration: 560 * SLOW, ease: 'cubic-bezier(0.66, 0, 0.22, 1.28)' }
const CLOSE_SPRING = slowed({ stiffness: 280, damping: 23 }) // brisk, settles clean
const SNAPPY = slowed({ stiffness: 550, damping: 32 })
const WOBBLE = slowed({ stiffness: 280, damping: 11 }) // release / gulp wobble
const ABSORB = slowed({ stiffness: 240, damping: 21 }) // chosen blob gliding home

export const ICONS = {
  plus: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M12 5.4v13.2M5.4 12h13.2" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path d="M12 3.6l1.9 6.5 6.5 1.9-6.5 1.9-1.9 6.5-1.9-6.5L3.6 12l6.5-1.9z" fill="currentColor" />
    </svg>
  ),
  pen: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path
        d="M5 19l1-3.8L16.6 4.6a2.05 2.05 0 0 1 2.9 2.9L8.9 18.1 5 19z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="3.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9.2 9.4h5.6M9.2 13.4h3.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

export const ACTIONS = [
  { id: 'create', label: 'Create', toast: 'New scrap', icon: ICONS.spark },
  { id: 'write', label: 'Write', toast: 'New note', icon: ICONS.pen },
  { id: 'file', label: 'Add file', toast: 'Add a file', icon: ICONS.file },
]

/* ------------------------------------------------------------- tethers --
   The necks. Nine tiny `observe` droplets — three per (main ↔ action) pair,
   a star rather than a chain, because in a fan every action is pulled from
   the plus along its own ray. A rAF loop parks each bead along that ray
   between the two facing edges, scaled by the live gap, so the goo filter
   merges bead + neighbours into a neck that stretches, thins and snaps.
   Beads only live while their pair is actually moving, so the resting fan
   (and the resting button) stay clean. */
const TETHER = {
  reach: 34, // px of pair gap the thread can span before it snaps
  fracs: [0.22, 0.5, 0.72], // bead positions along the edge-to-edge span
  weights: [0.9, 0.64, 0.9], // the thread thins in the middle, like real liquid
  attack: 0.5, // threads form the instant a pair starts stretching/approaching
  decay: 0.12, // and melt away ~150ms after the pair stops changing
}

function useTethers(groupRef, dotRefs) {
  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    const mainEl = group.querySelector('.main-slot')
    const slotEls = [...group.querySelectorAll('.action-slot')]
    const pairs = [0, 1, 2].map(() => ({ act: 0, prevGap: null }))
    let raf
    const center = (el, r0) => {
      const t = getComputedStyle(el).transform
      const m = t && t !== 'none' ? new DOMMatrixReadOnly(t) : { a: 1, m41: 0, m42: 0 }
      return { x: BOX.cx + (m.m41 || 0), y: BOX.cy + (m.m42 || 0), r: r0 * (m.a || 1) }
    }
    const tick = () => {
      const A = center(mainEl, R_MAIN)
      for (let j = 0; j < 3; j++) {
        const B = center(slotEls[j], R_ACT)
        const p = pairs[j]
        const dx = B.x - A.x
        const dy = B.y - A.y
        const dist = Math.hypot(dx, dy) || 0.001
        const gap = dist - A.r - B.r
        /* a thread is only alive while the pair is stretching apart or
           closing in — a settled pair releases its neck quickly */
        const stretchRate = p.prevGap == null ? 0 : Math.abs(gap - p.prevGap)
        p.prevGap = gap
        p.act = Math.max(0, Math.min(1, p.act + (stretchRate > 0.45 ? TETHER.attack : -TETHER.decay)))
        let k = p.act * Math.max(0, 1 - gap / TETHER.reach)
        if (gap < -6) k *= Math.max(0, (gap + 30) / 24) // buried inside a merge — stand down
        k = Math.min(1, k)
        const ux = dx / dist
        const uy = dy / dist
        const ax = A.x + ux * A.r // main's edge, facing the action
        const ay = A.y + uy * A.r
        const bx = B.x - ux * B.r // the action's edge, facing home
        const by = B.y - uy * B.r
        for (let d = 0; d < 3; d++) {
          const dot = dotRefs.current[j * 3 + d]
          if (!dot) continue
          const f = TETHER.fracs[d]
          const px = ax + (bx - ax) * f
          const py = ay + (by - ay) * f
          const s = Math.max(0.001, k * TETHER.weights[d]) ** 0.9
          dot.style.transform = `translate(${(px - BOX.cx).toFixed(2)}px, ${(py - BOX.cy).toFixed(2)}px) scale(${s.toFixed(3)})`
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [groupRef, dotRefs])
}

/* Gen-guarded timers: any new gesture cancels every pending step, so an
   interrupted sequence can never fire a stale state change later. */
function useSequencer() {
  const gen = useRef(0)
  const timers = useRef([])
  const api = useRef({
    cancel() {
      gen.current++
      timers.current.forEach(clearTimeout)
      timers.current = []
    },
    after(ms, fn) {
      const g = gen.current
      timers.current.push(
        setTimeout(() => {
          if (g === gen.current) fn()
        }, ms),
      )
    },
  })
  useEffect(() => () => api.current.cancel(), [])
  return api.current
}

/* The gooey FAB. Self-contained: goo group + its own state machine.
   280×200 stage, main blob centred at (140,172) — place it with `style`.
   `angles` picks the fan shape, `goo` overrides the material.
   onOpenChange(bool) fires on open/close; onToast(action|null) drives an
   optional confirmation toast in the host. */
export const GooFab = forwardRef(function GooFab(
  { style, onOpenChange, onToast, goo, angles = FAN, radius = ARC_R },
  outerRef,
) {
  const gooProps = { ...GOO, ...goo }
  const POS = angles.map((a) => polar(a, radius))
  const [phase, setPhase] = useState('closed') // closed | open | selecting
  const [chosen, setChosen] = useState(null) // action object while selecting
  const [absorbing, setAbsorbing] = useState(false) // chosen blob traveling home
  const [settled, setSettled] = useState(true) // false while blobs are in transit
  const [stagger, setStagger] = useState(true) // dropped on interrupted gestures
  const [swapIcon, setSwapIcon] = useState(null) // main button briefly "becomes" the action
  const [main, setMain] = useState({ s: 1, t: WOBBLE })
  const [pressed, setPressed] = useState(null)
  const seq = useSequencer()
  const after = (ms, fn) => seq.after(ms * SLOW, fn)
  const groupRef = useRef(null)
  const dotRefs = useRef([])
  useTethers(groupRef, dotRefs)

  const open = phase === 'open'

  /* Idle breathing while closed — barely-there, so the blob reads as alive. */
  useEffect(() => {
    if (phase !== 'closed') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let up = false
    let started = false
    const breathe = () => {
      up = !up
      setMain({ s: up ? 1.026 : 0.998, t: { duration: 2400, ease: 'ease-in-out' } })
    }
    const idle = setTimeout(() => {
      started = true
      breathe()
    }, 1400)
    const loop = setInterval(() => started && breathe(), 2400)
    return () => {
      clearTimeout(idle)
      clearInterval(loop)
    }
  }, [phase])

  const toggle = () => {
    const interrupted = !settled || phase === 'selecting'
    seq.cancel()
    onToast?.(null)
    setChosen(null)
    setAbsorbing(false)
    setSwapIcon(null)
    setPressed(null)
    setStagger(!interrupted) // a delayed retarget freezes mid-air — never stagger an interrupt
    setSettled(false)
    if (phase === 'open' || phase === 'selecting') {
      setPhase('closed')
      onOpenChange?.(false)
      after(interrupted ? 480 : 640, () => setSettled(true))
      /* the swallow: little gulp as the fan pours back in */
      setMain({ s: 0.96, t: SNAPPY })
      after(230, () => setMain({ s: 1.07, t: SNAPPY }))
      after(340, () => setMain({ s: 1, t: WOBBLE }))
    } else {
      setPhase('open')
      onOpenChange?.(true)
      after(interrupted ? 560 : 740, () => setSettled(true))
      /* anticipation: squash down, then release as the arc extrudes */
      setMain({ s: 0.88, t: SNAPPY })
      after(95, () => setMain({ s: 1, t: WOBBLE }))
    }
  }

  const choose = (action) => {
    if (phase !== 'open') return
    seq.cancel()
    setPhase('selecting')
    onOpenChange?.(false)
    setChosen(action)
    setAbsorbing(false)
    setSettled(false)
    setPressed(null)
    after(300, () => setAbsorbing(true)) // pop first, then glide home
    after(620, () => {
      setSwapIcon(action.id) // the main blob "becomes" the chosen action
      setMain({ s: 1.12, t: SNAPPY })
    })
    after(720, () => setMain({ s: 1, t: WOBBLE }))
    after(760, () => onToast?.(action))
    after(2150, () => onToast?.(null))
    after(2420, () => {
      setChosen(null)
      setAbsorbing(false)
      setSwapIcon(null)
      setPhase('closed')
      setSettled(true)
    })
  }

  useImperativeHandle(outerRef, () => ({ close: () => (phase === 'open' || phase === 'selecting') && toggle() }))

  /* Esc closes — handy on desktop while recording */
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && (phase === 'open' || phase === 'selecting') && toggle()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* dev hook for scripted stress-testing */
  useEffect(() => {
    window.__fab = { toggle, choose: (i) => choose(ACTIONS[i]), phase }
  })

  const itemProps = (i) => {
    const a = ACTIONS[i]
    const isChosen = phase === 'selecting' && chosen?.id === a.id
    const up = open || (isChosen && !absorbing)
    let scale = up ? (isChosen ? 1.16 : 1) : CLOSED_SCALE
    if (pressed === a.id) scale *= 0.92
    let transition
    let delay = 0
    if (phase === 'selecting') {
      transition = isChosen ? (absorbing ? ABSORB : WOBBLE) : CLOSE_SPRING
      delay = isChosen ? 0 : i * 45
    } else if (open) {
      transition = pressed === a.id ? SNAPPY : OPEN_TRAVEL // stiff squash in, slow-peel travel out
      delay = !settled && stagger ? OPEN_DELAY[i] : 0
    } else {
      transition = CLOSE_SPRING
      delay = !settled && stagger ? CLOSE_DELAY[i] : 0
    }
    return { x: up ? POS[i].x : 0, y: up ? POS[i].y : 0, scale, transition, delay }
  }

  const mainScale = pressed === 'main' ? main.s * 0.92 : main.s

  return (
    <div
      className="goofab"
      style={{ position: 'absolute', width: BOX.w, height: BOX.h, pointerEvents: 'none', ...style }}
    >
      <Liquid
        {...gooProps}
        ref={groupRef}
        data-open={open || undefined}
        className="fab-goo"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
          <Liquid.Item key={`tether-${j}`} observe>
            <div className="tether-dot" aria-hidden="true" ref={(el) => (dotRefs.current[j] = el)} />
          </Liquid.Item>
        ))}
        {ACTIONS.map((a, i) => (
          <Liquid.Item key={a.id} className="lg-slot action-slot" {...itemProps(i)}>
            <button
              className={`dot-btn${phase === 'selecting' && chosen?.id === a.id ? ' keep' : ''}${
                phase === 'selecting' && chosen?.id === a.id && absorbing ? ' absorb' : ''
              }`}
              aria-label={a.label}
              tabIndex={open ? 0 : -1}
              style={{ transitionDelay: open && !settled && stagger ? `${OPEN_DELAY[i] + 175 * SLOW}ms` : '0ms' }}
              onPointerDown={() => open && setPressed(a.id)}
              onPointerUp={() => setPressed(null)}
              onPointerLeave={() => pressed === a.id && setPressed(null)}
              onClick={() => choose(a)}
            >
              <span className="ic">{a.icon}</span>
            </button>
          </Liquid.Item>
        ))}
        <Liquid.Item
          className="lg-slot main-slot"
          x={0}
          y={0}
          scale={mainScale}
          transition={pressed === 'main' ? SNAPPY : main.t}
        >
          <button
            className="main-btn"
            aria-label={open ? 'Close menu' : 'Open create menu'}
            aria-expanded={open}
            onPointerDown={() => setPressed('main')}
            onPointerUp={() => setPressed(null)}
            onPointerLeave={() => pressed === 'main' && setPressed(null)}
            onClick={toggle}
          >
            <span className={`ic plus${open || phase === 'selecting' ? ' turned' : ''}${swapIcon ? ' out' : ''}`}>
              {ICONS.plus}
            </span>
            {ACTIONS.map((a) => (
              <span key={a.id} className={`ic swap${swapIcon === a.id ? ' in' : ''}`}>
                {a.icon}
              </span>
            ))}
          </button>
        </Liquid.Item>
      </Liquid>
    </div>
  )
})
