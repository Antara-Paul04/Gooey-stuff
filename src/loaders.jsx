import { useEffect, useRef } from 'react'
import { Liquid } from 'liquid-gooey'

/* The loader: one blob splits into three, then they stay three and rise and
   fall in sequence — dot one lifts, and as it drops the next takes over.
   Two decisions keep it floaty rather than heavy:
     · the motion is one continuous sine, so nothing ever stops dead at the
       bottom (a hard landing is what reads as weight), and
     · the deformation is the library's `move` effect, not a hand-rolled
       impact squash: the liquid lags its dot, stretches with velocity and
       drags a droplet tail, so each body behaves like a drop suspended in
       fluid instead of a ball hitting a floor. */

const gooLayer = { position: 'absolute', inset: 0, pointerEvents: 'none' }
const GRAPHITE_HI_S = '#2C2C33'
const SHADOW_S =
  '0 10px 24px rgba(0, 0, 0, 0.55), 0 1px 4px rgba(0, 0, 0, 0.5), inset 0 1px 1.5px rgba(255, 255, 255, 0.12), inset 0 -2.5px 6px rgba(0, 0, 0, 0.4)'

const SPACING = 38 // px between dot centres once split
const AMP = 22 // px of rise and fall either side of the midline
const PERIOD = 1.5 // seconds for one full float — unhurried, but with enough
// speed through the middle for the liquid to actually deform
const LAG = 0.82 // radians each dot trails the one before it
const SPLIT = 0.66 // the one-time intro: one body becoming three

/* heavy-syrup chase: the surface arrives late, overshoots, and tails */
const FLOAT = { springiness: 0.3, wobble: 0.7, stretch: 0.85, trail: 0.72 }

export function BounceLoader({ fill, shadow }) {
  const bodies = useRef([])
  const stageRef = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf
    /* the clock starts when the loader scrolls into view, so the split is
       seen rather than spent while the page is still up at the hero */
    let t0 = null
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && t0 === null) t0 = performance.now()
      },
      { threshold: 0.35 },
    )
    if (stageRef.current) io.observe(stageRef.current)

    const w = (Math.PI * 2) / PERIOD
    const tick = (now) => {
      if (t0 === null) {
        // parked: one merged body, waiting to be scrolled into view
        for (const el of bodies.current) if (el) el.style.transform = 'translate(0px, 0px)'
        raf = requestAnimationFrame(tick)
        return
      }
      const t = (now - t0) / 1000
      /* intro: the three ride out of one another, easing with a touch of
         overshoot so the split reads as liquid, not a slide */
      const p = Math.min(1, t / SPLIT)
      const spread = SPACING * (1 - (1 - p) ** 3 + 0.1 * Math.sin(p * Math.PI))
      const ft = Math.max(0, t - SPLIT * 0.72) // start floating as the split lands

      for (let i = 0; i < 3; i++) {
        const el = bodies.current[i]
        if (!el) continue
        const phase = w * ft - i * LAG
        const ease = Math.min(1, ft / 0.5)
        const y = -Math.sin(phase) * AMP * ease
        /* stretch peaks mid-travel and relaxes at the turns — continuous, so
           the body is always easing rather than arriving and stopping */
        const v = Math.abs(Math.cos(phase)) * ease
        const sy = (1 + 0.17 * v).toFixed(3)
        const sx = (1 - 0.11 * v).toFixed(3)
        el.style.transform = `translate(${((i - 1) * spread).toFixed(2)}px, ${y.toFixed(2)}px) scale(${sx}, ${sy})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [])

  return (
    <div className="loader-stage" ref={stageRef} aria-label="Loading">
      <Liquid blur={8} contrast={26} fill={fill} shadow={shadow} style={gooLayer}>
        {[0, 1, 2].map((i) => (
          <Liquid.Item key={i} effect="move" move={FLOAT}>
            <div className="loader-body bounce-dot" ref={(el) => (bodies.current[i] = el)} />
          </Liquid.Item>
        ))}
      </Liquid>
    </div>
  )
}

/* ------------------------------------------------------------- spinner --
   A spinner is a tapered arc chasing its own tail. Built from blobs sitting
   on one ring, close enough that the goo fuses them into a single comma —
   each one a step smaller than the last, so the arc thins toward the tail. */
const SPIN_R = 34 // ring radius
const SPIN_STEP = 0.34 // radians between bodies in an arm
const ARM = 6 // bodies per arm

/* Each variant is the same trick with different numbers: bodies strung along
   the ring, every one a step smaller, fused by the goo into one comma. */
const SPIN = {
  comet: { n: 6, step: 0.34, taper: 0.13, arms: 1 }, // a short, fat comma
  arc: { n: 10, step: 0.34, taper: 0.075, arms: 1 }, // a long sweeping arc
  dual: { n: 6, step: 0.34, taper: 0.13, arms: 2 }, // the comma, twice, opposed
}

export function SpinnerDemo({ variant = 'comet', fill = GRAPHITE_HI_S, shadow = SHADOW_S }) {
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
        const a = spin + Math.floor(i / cfg.n) * Math.PI - k * cfg.step
        const sc = 1 - k * cfg.taper
        el.style.transform = `translate(${(Math.cos(a) * SPIN_R).toFixed(2)}px, ${(Math.sin(a) * SPIN_R).toFixed(2)}px) scale(${sc.toFixed(3)})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [count, cfg])

  return (
    <div className="spin-stage" aria-label="Loading">
      <Liquid blur={9} contrast={27} fill={fill} shadow={shadow} style={gooLayer}>
        {Array.from({ length: count }, (_, i) => (
          <Liquid.Item key={i} observe>
            <div className="spin-dot" ref={(el) => (bodies.current[i] = el)} />
          </Liquid.Item>
        ))}
      </Liquid>
    </div>
  )
}
