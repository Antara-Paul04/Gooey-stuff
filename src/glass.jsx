import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'

/* ================================================================ glass ==
   Liquid Glass as an optical material. The mental model is Apple's: light
   bends through a curved transparent slab. Everything the eye reads as
   "glass" here is derived from that, in layers:

     backdrop            what is really behind the element (backdrop-filter)
     refraction          a displacement field traced through a convex bezel
                         (Snell, η 1.5): the rim magnifies the interior
                         outward, the centre is calm
     flex                a cursor-following bulge added to that field, with
                         spring inertia — the gel give
     scattering          a faint softening that only lives in the bezel,
                         where real glass scatters
     ambient colour      a little of the blurred surroundings mixed in — the
                         material takes the colour of what is under it
     thickness           the bezel absorbs a touch more light than the top
     specular            feSpecularLighting on the bezel height field, one
                         key light plus a faint return light; the light
                         direction leans with the cursor
     label               the element's own children

   One SVG filter per element, 9-sliced so any width/height (including
   animating ones) shares one tile set per corner radius. Chromium only:
   Safari/Firefox ignore url() in backdrop-filter. */

const DPR = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1
const ETA = 1 / 1.5

/* The bend across the bezel: full at the very edge, easing to nothing at the
   inner end of the bezel (Apple's rim distorts most right at the boundary).
   `power` shapes the fall-off. */
const PROFILES = {
  circle: (x) => Math.pow(Math.max(0, 1 - x), 1.6),
  squircle: (x) => Math.pow(Math.max(0, 1 - x), 2.2),
}

function shiftTable(f, b, T, n = 160) {
  const t = new Float32Array(n + 1)
  let max = 0
  for (let i = 0; i <= n; i++) {
    t[i] = T * f(i / n)
    if (t[i] > max) max = t[i]
  }
  return { t, max, n }
}

const lookup = ({ t, n }, x) => {
  if (x <= 0) return t[0]
  if (x >= 1) return 0
  const q = x * n
  const i = Math.floor(q)
  return t[i] + (t[i + 1] - t[i]) * (q - i)
}

/* inside distance + inward unit gradient for a rounded box */
function rbox(x, y, W, H, r) {
  const qx = Math.abs(x - W / 2) - (W / 2 - r)
  const qy = Math.abs(y - H / 2) - (H / 2 - r)
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  const outer = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0)
  const d = r - outer
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

const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)))
const cache = new Map()

/* Tiles for one (radius, depth, shift, profile). Each pixel packs the
   displacement vector (R, G — 127.5 is zero) and the distance in from the
   rim across the bezel (B — 127.5 is the edge, 255 the inner end). Alpha stays opaque so nothing is
   premultiplied away. */
export function glassTiles(r, b, T, profileName) {
  const key = `${r}|${b}|${T}|${profileName}|${DPR}`
  if (cache.has(key)) return cache.get(key)
  const f = PROFILES[profileName] ?? PROFILES.circle
  const table = shiftTable(f, b, T)
  const S = Math.max(1, Math.ceil(table.max * 1.04))
  const s = Math.max(r, b) + 1
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  const paint = (w, h, at) => {
    c.width = Math.max(1, Math.round(w * DPR))
    c.height = Math.max(1, Math.round(h * DPR))
    const img = ctx.createImageData(c.width, c.height)
    const px = img.data
    for (let j = 0; j < c.height; j++) {
      for (let i = 0; i < c.width; i++) {
        const { d, gx, gy } = at((i + 0.5) / DPR, (j + 0.5) / DPR)
        const inside = d > 0
        const m = inside ? lookup(table, d / b) : 0
        const h = inside ? Math.min(1, d / b) : 0
        const o = (j * c.width + i) * 4
        px[o] = clamp255(127.5 + (127.5 * m * gx) / S)
        px[o + 1] = clamp255(127.5 + (127.5 * m * gy) / S)
        px[o + 2] = clamp255(127.5 + 127.5 * h)
        px[o + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    return c.toDataURL('image/png')
  }
  const B = 4 * s
  const win = (ox, oy) => (x, y) => rbox(x + ox, y + oy, B, B, r)
  const out = {
    S,
    s,
    tiles: {
      tl: paint(s, s, win(0, 0)),
      tr: paint(s, s, win(B - s, 0)),
      bl: paint(s, s, win(0, B - s)),
      br: paint(s, s, win(B - s, B - s)),
      t: paint(1, s, win(2 * s, 0)),
      b: paint(1, s, win(2 * s, B - s)),
      l: paint(s, 1, win(0, 2 * s)),
      r: paint(s, 1, win(B - s, 2 * s)),
    },
  }
  cache.set(key, out)
  return out
}

/* The flex: a soft bulge the cursor presses into the surface. Encoded like
   the tiles (same S), at full strength — the filter scales it per frame. */
export function bumpTile(R, S, shift, height) {
  const key = `bump|${R}|${S}|${shift}|${height}|${DPR}`
  if (cache.has(key)) return cache.get(key)
  const c = document.createElement('canvas')
  const n = Math.round(2 * R * DPR)
  c.width = c.height = n
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(n, n)
  const px = img.data
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / DPR - R
      const y = (j + 0.5) / DPR - R
      const rr = Math.hypot(x, y) / R
      const o = (j * n + i) * 4
      let vx = 0
      let vy = 0
      let h = 0
      if (rr < 1) {
        const u = 1 - rr * rr
        h = u * u
        // gradient of the dome, normalised so its peak is `shift` px inward
        const g = (4 * rr * u) / 1.54
        vx = (-x / (rr * R || 1)) * g * shift
        vy = (-y / (rr * R || 1)) * g * shift
      }
      px[o] = clamp255(127.5 + (127.5 * vx) / S)
      px[o + 1] = clamp255(127.5 + (127.5 * vy) / S)
      px[o + 2] = clamp255(127.5 + 127.5 * h * height)
      px[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const url = c.toDataURL('image/png')
  cache.set(key, url)
  return url
}

/* ------------------------------------------------------------- pointer --
   One listener, one animation loop, shared by every glass element. Each
   element eases its own bulge position/strength and light direction toward
   the cursor with a damped spring, and the loop sleeps when everything has
   settled. */
const pointer = { x: -1e5, y: -1e5 }
const live = new Set()
let raf = 0
let last = 0
if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX
    pointer.y = e.clientY
    wake()
  })
  window.addEventListener('pointerleave', () => {
    pointer.x = -1e5
    pointer.y = -1e5
    wake()
  })
  document.addEventListener('mouseleave', () => {
    pointer.x = -1e5
    pointer.y = -1e5
    wake()
  })
}
function wake() {
  if (!raf) {
    last = performance.now()
    raf = requestAnimationFrame(loop)
  }
}
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  let busy = false
  for (const el of live) if (el.step(dt)) busy = true
  raf = busy ? requestAnimationFrame(loop) : 0
}
const spring = (st, target, k, damp, dt) => {
  st.v += (target - st.x) * k * dt
  st.v *= Math.exp(-damp * dt)
  st.x += st.v * dt
}

const DEFAULT_LIGHT = { azimuth: -118, elevation: 28, lean: 34 }

/* R ← 0.5 + sign · (dx·Lx + dy·Ly): the map's bend vector dotted with the
   light direction, so the rim lights up where it bends toward the light */
function faceValues(azimuth, sign) {
  const a = (azimuth * Math.PI) / 180
  const lx = sign * Math.cos(a)
  const ly = sign * Math.sin(a)
  const c = 0.5 - 0.5 * (lx + ly)
  return `${lx.toFixed(4)} ${ly.toFixed(4)} 0 0 ${c.toFixed(4)}  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1`
}

/* -------------------------------------------------------------- <Glass> --
   radius     corner radius (a capsule / circle when it is half the height)
   depth      how far the bezel reaches in from the edge (Figma: Depth)
   thickness  the bend at the very edge, in px
   profile    how the bend eases inward: 'circle' (gentler) or 'squircle' (tighter)
   frost      optional backdrop blur (a layer, never the effect)
   dispersion per-channel stagger of the refraction
   flex       whether the cursor presses into the surface */
export function Glass({
  as: Tag = 'div',
  radius = 26,
  depth,
  thickness,
  profile = 'circle',
  frost = 0,
  dispersion = 0.02,
  saturate = 1,
  tint = 0.04,
  ambient = 0,
  scatter = 0,
  flex = true,
  film,
  filmInset = 0,
  light,
  className = '',
  style,
  children,
  ...rest
}) {
  const uid = useId().replace(/:/g, '')
  const fid = `gl${uid}`
  const rootRef = useRef(null)
  const bumpRef = useRef(null)
  const funcRef = useRef([])
  const lightRef = useRef([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const b = depth ?? Math.max(5, Math.round(radius * 0.38))
  const T = thickness ?? Math.max(4, Math.round(b * 0.85))
  const lit = light ?? DEFAULT_LIGHT
  const g = useMemo(() => glassTiles(radius, b, T, profile), [radius, b, T, profile])
  const R = Math.round(radius * 1.7)
  const bump = useMemo(() => bumpTile(R, g.S, Math.min(g.S * 0.35, 4), 0.22), [R, g.S])

  useLayoutEffect(() => {
    const el = rootRef.current
    // layout size, not the transformed box: a scaled-down element still
    // needs its filter laid out at full size
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* the flex + light response */
  useEffect(() => {
    if (!flex) return
    const el = rootRef.current
    const st = { bx: { x: 0, v: 0 }, by: { x: 0, v: 0 }, k: { x: 0, v: 0 }, az: { x: lit.azimuth, v: 0 } }
    let seeded = false
    const node = {
      step(dt) {
        const rect = el.getBoundingClientRect()
        if (rect.width === 0) return false
        const lx = pointer.x - rect.left
        const ly = pointer.y - rect.top
        const cx = rect.width / 2
        const cy = rect.height / 2
        // distance outside the box, in px
        const dx = Math.max(rect.left - pointer.x, 0, pointer.x - rect.right)
        const dy = Math.max(rect.top - pointer.y, 0, pointer.y - rect.bottom)
        const dist = Math.hypot(dx, dy)
        const reach = Math.max(28, Math.min(rect.width, rect.height) * 0.8)
        const kT = dist <= 0 ? 1 : Math.max(0, 1 - dist / reach)
        if (!seeded) {
          st.bx.x = cx
          st.by.x = cy
          seeded = true
        }
        if (kT > 0) {
          spring(st.bx, Math.max(-R, Math.min(rect.width + R, lx)), 260, 18, dt)
          spring(st.by, Math.max(-R, Math.min(rect.height + R, ly)), 260, 18, dt)
        }
        spring(st.k, kT * kT, 90, 13, dt)
        // the light leans toward the cursor, within a modest cone
        const toward = (Math.atan2(ly - cy, lx - cx) * 180) / Math.PI
        let azT = lit.azimuth
        if (kT > 0) {
          let delta = ((toward - lit.azimuth + 540) % 360) - 180
          delta = Math.max(-lit.lean, Math.min(lit.lean, delta))
          azT = lit.azimuth + delta * kT
        }
        spring(st.az, azT, 60, 11, dt)

        const k = Math.max(0, Math.min(1, st.k.x))
        const bi = bumpRef.current
        if (bi) {
          const sz = R * (1.6 + 0.5 * k)
          bi.setAttribute('x', (st.bx.x - sz / 2).toFixed(2))
          bi.setAttribute('y', (st.by.x - sz / 2).toFixed(2))
          bi.setAttribute('width', sz.toFixed(2))
          bi.setAttribute('height', sz.toFixed(2))
        }
        for (const fn of funcRef.current) {
          if (!fn) continue
          fn.setAttribute('slope', k.toFixed(4))
          fn.setAttribute('intercept', (0.5 * (1 - k)).toFixed(4))
        }
        const [l1, l2] = lightRef.current
        if (l1) l1.setAttribute('values', faceValues(st.az.x, -1))
        if (l2) l2.setAttribute('values', faceValues(st.az.x, 1))
        const moving =
          kT > 0 || Math.abs(st.k.x) > 0.002 || Math.abs(st.k.v) > 0.01 || Math.abs(st.az.x - lit.azimuth) > 0.05 || Math.abs(st.az.v) > 0.05
        return moving
      },
    }
    live.add(node)
    wake()
    return () => live.delete(node)
  }, [flex, R, lit])

  const { w, h } = size
  const s = g.s
  const mid = (n) => Math.max(0, n - 2 * s)
  const scale = 2 * g.S
  const filterCss = `url(#${fid})${frost > 0 ? ` blur(${frost}px)` : ''} saturate(${saturate})`
  const seed = R * 1.6

  return (
    <Tag ref={rootRef} className={`gl ${className}`} style={{ borderRadius: radius, ...style }} {...rest}>
      <svg className="gl-defs" aria-hidden="true" focusable="false">
        <defs>
          {w > 0 && (
            <filter
              id={fid}
              x="0"
              y="0"
              width={w}
              height={h}
              filterUnits="userSpaceOnUse"
              primitiveUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              {/* 1 · the refraction field, 9-sliced */}
              <feFlood floodColor="rgb(128,128,128)" result="flat" />
              <feImage href={g.tiles.tl} x="0" y="0" width={s} height={s} preserveAspectRatio="none" result="tl" />
              <feImage href={g.tiles.tr} x={w - s} y="0" width={s} height={s} preserveAspectRatio="none" result="tr" />
              <feImage href={g.tiles.bl} x="0" y={h - s} width={s} height={s} preserveAspectRatio="none" result="bl" />
              <feImage href={g.tiles.br} x={w - s} y={h - s} width={s} height={s} preserveAspectRatio="none" result="br" />
              <feImage href={g.tiles.t} x={s} y="0" width={mid(w)} height={s} preserveAspectRatio="none" result="et" />
              <feImage href={g.tiles.b} x={s} y={h - s} width={mid(w)} height={s} preserveAspectRatio="none" result="eb" />
              <feImage href={g.tiles.l} x="0" y={s} width={s} height={mid(h)} preserveAspectRatio="none" result="el" />
              <feImage href={g.tiles.r} x={w - s} y={s} width={s} height={mid(h)} preserveAspectRatio="none" result="er" />
              <feMerge result="map">
                <feMergeNode in="flat" />
                <feMergeNode in="et" />
                <feMergeNode in="eb" />
                <feMergeNode in="el" />
                <feMergeNode in="er" />
                <feMergeNode in="tl" />
                <feMergeNode in="tr" />
                <feMergeNode in="bl" />
                <feMergeNode in="br" />
              </feMerge>
              {/* 2 · the flex: the cursor's bulge, scaled per frame, added to the field */}
              <feFlood floodColor="rgb(128,128,128)" result="bflat" />
              <feImage
                ref={bumpRef}
                href={bump}
                x={w / 2 - seed / 2}
                y={h / 2 - seed / 2}
                width={seed}
                height={seed}
                preserveAspectRatio="none"
                result="bimg"
              />
              <feMerge result="bfull">
                <feMergeNode in="bflat" />
                <feMergeNode in="bimg" />
              </feMerge>
              <feComponentTransfer in="bfull" result="bump">
                <feFuncR ref={(n) => (funcRef.current[0] = n)} type="linear" slope="0" intercept="0.5" />
                <feFuncG ref={(n) => (funcRef.current[1] = n)} type="linear" slope="0" intercept="0.5" />
                <feFuncB ref={(n) => (funcRef.current[2] = n)} type="linear" slope="0" intercept="0.5" />
              </feComponentTransfer>
              <feComposite in="map" in2="bump" operator="arithmetic" k2="1" k3="1" k4="-0.5" result="field" />
              {/* 3 · refraction, one pass per channel for dispersion */}
              <feDisplacementMap in="SourceGraphic" in2="field" scale={scale * (1 - dispersion)} xChannelSelector="R" yChannelSelector="G" result="dr" />
              <feDisplacementMap in="SourceGraphic" in2="field" scale={scale} xChannelSelector="R" yChannelSelector="G" result="dg" />
              <feDisplacementMap in="SourceGraphic" in2="field" scale={scale * (1 + dispersion)} xChannelSelector="R" yChannelSelector="G" result="db" />
              <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cr" />
              <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cg" />
              <feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cb" />
              <feComposite in="cr" in2="cg" operator="arithmetic" k2="1" k3="1" result="crg" />
              <feComposite in="crg" in2="cb" operator="arithmetic" k2="1" k3="1" result="bent" />
              {/* 4 · the bezel height, as alpha, and its complement as a mask */}
              <feColorMatrix in="field" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 2 0 -1" result="hA" />
              <feGaussianBlur in="hA" stdDeviation="0.7" result="hS" />
              <feColorMatrix in="hS" type="matrix" values="0 0 0 -1 1  0 0 0 -1 1  0 0 0 -1 1  0 0 0 0 1" result="edge" />
              <feColorMatrix in="hS" type="matrix" values="0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1" result="core" />
              {/* 5 · scattering lives in the bezel only (off by default: clear glass) */}
              <feGaussianBlur in="bent" stdDeviation={scatter} result="soft" />
              <feComposite in="soft" in2="edge" operator="arithmetic" k1="1" result="softE" />
              <feComposite in="bent" in2="core" operator="arithmetic" k1="1" result="bentC" />
              <feComposite in="softE" in2="bentC" operator="arithmetic" k2="1" k3="1" result="lens0" />
              {/* 6 · translucent material: a breath of white and the ambient colour of the surroundings */}
              <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="amb" />
              <feComposite in="lens0" in2="amb" operator="arithmetic" k2={1 - tint - ambient} k3={ambient} k4={tint} result="lens1" />
              {/* 7 · thickness: the rim holds a little less light than the top */}
              <feComposite in="lens1" in2="core" operator="arithmetic" k1="0.12" k2="0.88" result="lens2" />
              {/* 8 · the shine: a thin line riding the very edge, lit where the rim bends toward the
                  light (top-left) with a fainter return along the opposite arc — read straight off
                  the refraction map, so it follows the geometry and the cursor's lean */}
              <feColorMatrix ref={(n) => (lightRef.current[0] = n)} in="field" type="matrix" values={faceValues(lit.azimuth, -1)} result="f1r" />
              <feComponentTransfer in="f1r" result="f1">
                <feFuncR type="linear" slope="2.4" intercept="-1.2" />
              </feComponentTransfer>
              <feColorMatrix ref={(n) => (lightRef.current[1] = n)} in="field" type="matrix" values={faceValues(lit.azimuth, 1)} result="f2r" />
              <feComponentTransfer in="f2r" result="f2">
                <feFuncR type="linear" slope="1.4" intercept="-0.7" />
              </feComponentTransfer>
              <feComposite in="f1" in2="f2" operator="arithmetic" k2="1" k3="1" result="faceR" />
              <feColorMatrix in="faceR" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="face" />
              <feComponentTransfer in="edge" result="edgeThin">
                <feFuncR type="gamma" amplitude="1" exponent="3" offset="0" />
                <feFuncG type="gamma" amplitude="1" exponent="3" offset="0" />
                <feFuncB type="gamma" amplitude="1" exponent="3" offset="0" />
              </feComponentTransfer>
              <feComposite in="face" in2="edgeThin" operator="arithmetic" k1="0.95" result="shine" />
              <feComponentTransfer in="edge" result="contour">
                <feFuncR type="gamma" amplitude="0.16" exponent="8" offset="0" />
                <feFuncG type="gamma" amplitude="0.16" exponent="8" offset="0" />
                <feFuncB type="gamma" amplitude="0.16" exponent="8" offset="0" />
              </feComponentTransfer>
              <feComposite in="lens2" in2="shine" operator="arithmetic" k2="1" k3="1" result="lens3" />
              <feComposite in="lens3" in2="contour" operator="arithmetic" k2="1" k3="1" result="lens4" />
              {/* 9 · keep the backdrop's own alpha: while a freshly animating layer has no backdrop yet, the additive terms would otherwise paint solid black */}
              <feComposite in="lens4" in2="SourceGraphic" operator="in" />
            </filter>
          )}
        </defs>
      </svg>
      {/* an optional coloured film UNDER the glass — part of the backdrop, so the rim and anything riding on top refract it */}
      {film && (
        <span
          className="gl-film"
          style={{ background: film, inset: filmInset, borderRadius: Math.max(0, radius - filmInset) }}
        />
      )}
      {/* the filter only exists once the element has been measured — a backdrop-filter pointing at a missing filter paints black */}
      <span className="gl-lens" style={w > 0 ? { backdropFilter: filterCss, WebkitBackdropFilter: filterCss } : undefined} />
      <span className="gl-body">{children}</span>
    </Tag>
  )
}

/* ------------------------------------------------------------ blueprint --
   The glass stage ground: Apple's hero shows the material on a plain light
   surface with hairline guides and colour bars running under the glass —
   the bend shows on the lines, no photograph needed. Sized to the stage. */
const bpCache = new Map()

export function blueprintURL(w, h) {
  const key = `${w}x${h}`
  if (!bpCache.has(key)) {
    bpCache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(blueprintSVG(w, h)))
  }
  return bpCache.get(key)
}

function blueprintSVG(w, h) {
  const cx = w / 2
  const cy = h / 2
  const line = 'stroke="#b4b4bf" stroke-width="1" fill="none" stroke-opacity=".75"'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1e5cf5"/><stop offset=".22" stop-color="#22c1e8"/><stop offset=".45" stop-color="#d23bd6"/><stop offset=".68" stop-color="#ff4d4d"/><stop offset=".86" stop-color="#ff9a2e"/><stop offset="1" stop-color="#8fd82e"/></linearGradient>
<linearGradient id="blue" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2f7cf6"/><stop offset="1" stop-color="#3b8cff"/></linearGradient>
</defs>
<rect width="100%" height="100%" fill="#e9e9ee"/>
<circle cx="${cx}" cy="${cy}" r="${h * 0.19}" ${line}/>
<circle cx="${cx}" cy="${cy}" r="${h * 0.34}" ${line}/>
<circle cx="${cx - w * 0.3}" cy="${cy - h * 0.16}" r="${h * 0.22}" ${line}/>
<circle cx="${cx + w * 0.3}" cy="${cy + h * 0.12}" r="${h * 0.26}" ${line}/>
<rect x="${cx - w * 0.26}" y="${cy - h * 0.14}" width="${w * 0.52}" height="${h * 0.28}" rx="${h * 0.14}" ${line}/>
<line x1="0" y1="${cy}" x2="${w}" y2="${cy}" ${line}/>
<line x1="${cx}" y1="0" x2="${cx}" y2="${h}" ${line}/>
<line x1="0" y1="${cy - h * 0.3}" x2="${w}" y2="${cy - h * 0.3}" ${line}/>
<line x1="0" y1="${cy + h * 0.3}" x2="${w}" y2="${cy + h * 0.3}" ${line}/>
<rect x="${cx - w * 0.5}" y="${cy + h * 0.085}" width="${w * 0.42}" height="${h * 0.095}" rx="${h * 0.0475}" fill="url(#blue)"/>
<rect x="${cx + w * 0.02}" y="${cy - h * 0.16}" width="${w * 0.48}" height="${h * 0.11}" rx="${h * 0.055}" fill="url(#bar)"/>
</svg>`
}
