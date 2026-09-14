import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PHOTO } from './photo.js'

/* ================================================================= lens ==
   One lens, the way nicholasgamolin.com/playground/liquid-glass does it.

   A canvas rasterises the lens shape into a PNG: red is horizontal bend,
   green is vertical bend, 50 % grey is no bend. The magnitude follows the
   signed distance to the rim — full at the edge, falling to nothing across
   the bevel, so the middle of the lens stays flat and the bevel keeps an
   even width around the corners. That PNG is dropped into an SVG filter
   that is applied to the CONTENT itself (`filter: url(#…)`), three
   feDisplacementMap passes at slightly different strengths for red, green
   and blue, screen-blended back together. Everything outside the lens sees
   a neutral map and is left alone. Moving the lens just moves where the map
   is sampled — the map itself is only rebuilt when the shape changes.

   The specular rim is a second canvas laid over the lens: SVG filters work
   in premultiplied alpha, and a highlight encoded next to the displacement
   is crushed exactly at the rim, where it matters. */

const DPR = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1

/* signed distance to a rounded rectangle (inside positive) and the inward unit gradient */
function rbox(x, y, W, H, r) {
  const qx = Math.abs(x - W / 2) - (W / 2 - r)
  const qy = Math.abs(y - H / 2) - (H / 2 - r)
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  const d = r - (Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0))
  let gx, gy
  if (qx > 0 && qy > 0) {
    const l = Math.hypot(qx, qy) || 1
    gx = -(qx / l) * Math.sign(x - W / 2)
    gy = -(qy / l) * Math.sign(y - H / 2)
  } else if (qx > qy) {
    gx = -Math.sign(x - W / 2)
    gy = 0
  } else {
    gx = 0
    gy = -Math.sign(y - H / 2)
  }
  return { d, gx, gy }
}

/* Displacement map. `bevel` is the width of the curved rim in px, `shift`
   the bend at the rim in px, `power` how quickly it settles toward the flat
   middle. Channels are encoded at ±64 around 128 rather than the full
   range: Chrome converts the map to the display profile before sampling and
   under-bends near the extremes, so the scale is doubled instead. */
export function lensMap(W, H, r, bevel, shift, power = 2) {
  const K = 64
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(W, H)
  const px = img.data
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const { d, gx, gy } = rbox(i + 0.5, j + 0.5, W, H, r)
      const o = (j * W + i) * 4
      let vx = 0
      let vy = 0
      if (d > 0 && d < bevel) {
        // the bend points inward: through a curved rim you see the inside of
        // the lens pulled out toward the edge
        const m = Math.pow(1 - d / bevel, power) * shift
        vx = gx * m
        vy = gy * m
      }
      px[o] = Math.round(128 + (K * vx) / shift)
      px[o + 1] = Math.round(128 + (K * vy) / shift)
      px[o + 2] = 128
      px[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return { url: c.toDataURL('image/png'), scale: (shift * 255) / K }
}

/* Specular rim: light on the curved bevel. The surface tilts most at the
   rim; a key light from the upper left and a faint return light from the
   opposite side are evaluated against that tilt. Nothing is drawn on the
   flat middle. */
export function lensSpecular(W, H, r, bevel, opts = {}) {
  const { azimuth = -118, elevation = 30, power = 26, tilt = 68, intensity = 0.85 } = opts
  const c = document.createElement('canvas')
  c.width = Math.round(W * DPR)
  c.height = Math.round(H * DPR)
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(c.width, c.height)
  const px = img.data
  const az = (azimuth * Math.PI) / 180
  const el = (elevation * Math.PI) / 180
  const L1 = [Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)]
  const L2 = [-L1[0], -L1[1], L1[2]]
  const half = (L) => {
    const v = [L[0], L[1], L[2] + 1]
    const l = Math.hypot(...v)
    return v.map((k) => k / l)
  }
  const H1 = half(L1)
  const H2 = half(L2)
  const tiltMax = (tilt * Math.PI) / 180
  for (let j = 0; j < c.height; j++) {
    for (let i = 0; i < c.width; i++) {
      const { d, gx, gy } = rbox((i + 0.5) / DPR, (j + 0.5) / DPR, W, H, r)
      const o = (j * c.width + i) * 4
      const cover = Math.max(0, Math.min(1, d + 0.5))
      if (cover <= 0 || d >= bevel) continue
      const t = d / bevel
      const a = tiltMax * Math.pow(1 - t, 1.6)
      const N = [-gx * Math.sin(a), -gy * Math.sin(a), Math.cos(a)]
      const dot = (A, B) => Math.max(0, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])
      let s = Math.pow(dot(N, H1), power) + 0.35 * Math.pow(dot(N, H2), power * 1.3)
      s = Math.min(1, s * intensity) * cover
      px[o] = px[o + 1] = px[o + 2] = 255
      px[o + 3] = Math.round(255 * s)
    }
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL('image/png')
}

const spring = (st, target, k, damp, dt) => {
  st.v += (target - st.x) * k * dt
  st.v *= Math.exp(-damp * dt)
  st.x += st.v * dt
}

/* ------------------------------------------------------------ <LensLab> --
   The test scene: a photograph, black type, hairlines and a gradient under
   one lens that follows the cursor. */
const LW = 300
const LH = 200
const LR = 48
const BEVEL = 58 // width of the curved rim, px
const SHIFT = 17 // bend at the rim, px
const POWER = 1.7 // how quickly the bend settles toward the flat middle
const CHROMA = 0.012 // per-channel spread of the bend — a hint, not a rainbow
const BLUR = 0.25 // px, inside the glass only
const TINT = 0.03

export function LensLab() {
  const uid = useId().replace(/:/g, '')
  const fid = `lensf${uid}`
  const sceneRef = useRef(null)
  const lensRef = useRef(null)
  const map = useMemo(() => lensMap(LW, LH, LR, BEVEL, SHIFT, POWER), [])
  const spec = useMemo(() => lensSpecular(LW, LH, LR, BEVEL), [])

  /* the lens follows the pointer; the filter rides on the lens, so the map
     never moves — the backdrop moves under it */
  useEffect(() => {
    const el = sceneRef.current
    const st = { x: { x: el.clientWidth * 0.3, v: 0 }, y: { x: el.clientHeight * 0.5, v: 0 } }
    const target = { x: st.x.x, y: st.y.x }
    let raf = 0
    let last = 0
    const place = () => {
      const x = st.x.x - LW / 2
      const y = st.y.x - LH / 2
      if (lensRef.current) lensRef.current.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`
    }
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      spring(st.x, target.x, 320, 24, dt)
      spring(st.y, target.y, 320, 24, dt)
      place()
      const still = Math.abs(st.x.x - target.x) < 0.05 && Math.abs(st.y.x - target.y) < 0.05 && Math.abs(st.x.v) < 0.5 && Math.abs(st.y.v) < 0.5
      raf = still ? 0 : requestAnimationFrame(tick)
    }
    const wake = () => {
      if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      target.x = Math.max(LW / 2 - 40, Math.min(r.width - LW / 2 + 40, e.clientX - r.left))
      target.y = Math.max(LH / 2 - 40, Math.min(r.height - LH / 2 + 40, e.clientY - r.top))
      wake()
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerdown', onMove)
    place()
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  const S = map.scale
  const backdrop = `url(#${fid}) blur(${BLUR}px)`

  return (
    <div className="lens-scene" ref={sceneRef}>
      <svg className="lens-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter
            id={fid}
            x="0"
            y="0"
            width={LW}
            height={LH}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feImage href={map.url} x="0" y="0" width={LW} height={LH} preserveAspectRatio="none" result="map" />
            {/* refraction — three passes, one per channel, screened back together */}
            <feDisplacementMap in="SourceGraphic" in2="map" scale={S * (1 - CHROMA)} xChannelSelector="R" yChannelSelector="G" result="dr" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={S} xChannelSelector="R" yChannelSelector="G" result="dg" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={S * (1 + CHROMA)} xChannelSelector="R" yChannelSelector="G" result="db" />
            <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cr" />
            <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cg" />
            <feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cb" />
            <feBlend in="cr" in2="cg" mode="screen" result="crg" />
            <feBlend in="crg" in2="cb" mode="screen" result="bent" />
            {/* the material: a breath of light through the glass */}
            <feComponentTransfer in="bent">
              <feFuncR type="linear" slope={1 - TINT} intercept={TINT} />
              <feFuncG type="linear" slope={1 - TINT} intercept={TINT} />
              <feFuncB type="linear" slope={1 - TINT} intercept={TINT} />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div className="lens-content">
        <img className="lens-photo" src={PHOTO} alt="" draggable="false" />
        <div className="lens-right">
          <div className="lens-type">
            <span className="lens-word">Bend</span>
            <span className="lens-sub">Light through a curved rim</span>
          </div>
          <div className="lens-lines" />
          <div className="lens-gradient" />
        </div>
      </div>

      <div className="lens-glass" ref={lensRef} aria-hidden="true">
        <span className="lens-refract" style={{ backdropFilter: backdrop, WebkitBackdropFilter: backdrop }} />
        <img className="lens-spec" src={spec} alt="" draggable="false" />
      </div>
      <span className="stage-hint lens-hint">Move the cursor — the lens follows</span>
    </div>
  )
}

/* ---------------------------------------------------------- <DragPhoto> --
   A photograph on the component stage, draggable, sitting under the glass
   components — drag it through a lens to see the material bend it. */
export function DragPhoto() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const stage = el.parentElement
    const pos = { x: stage.clientWidth * 0.5 - 250, y: stage.clientHeight * 0.5 - 30 }
    let grab = null
    const place = () => {
      el.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px)`
    }
    const down = (e) => {
      grab = { x: e.clientX - pos.x, y: e.clientY - pos.y }
      el.setPointerCapture(e.pointerId)
      el.classList.add('dragging')
      e.preventDefault()
    }
    const move = (e) => {
      if (!grab) return
      const w = stage.clientWidth
      const h = stage.clientHeight
      pos.x = Math.max(-el.offsetWidth * 0.7, Math.min(w - el.offsetWidth * 0.3, e.clientX - grab.x))
      pos.y = Math.max(-el.offsetHeight * 0.7, Math.min(h - el.offsetHeight * 0.3, e.clientY - grab.y))
      place()
    }
    const up = () => {
      grab = null
      el.classList.remove('dragging')
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    place()
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [])
  return (
    <div className="stage-photo" ref={ref} aria-label="Drag the photograph">
      <img src={PHOTO} alt="" draggable="false" />
      <span className="stage-photo-tag">drag me</span>
    </div>
  )
}
