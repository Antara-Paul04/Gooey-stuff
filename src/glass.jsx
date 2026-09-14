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

/* bezel height profiles, 0 at the edge → 1 at the inner end of the bezel */
const PROFILES = {
  circle: (x) => (x >= 1 ? 1 : Math.sqrt(1 - (1 - x) * (1 - x))),
  squircle: (x) => (x >= 1 ? 1 : Math.pow(1 - Math.pow(1 - x, 4), 0.25)),
}

const slopeAt = (f, x, b, T) => {
  const e = 1e-3
  return ((f(Math.min(1, x + e)) - f(Math.max(0, x - e))) / (2 * e)) * (T / b)
}

/* lateral shift (px, toward the interior) of the backdrop seen through the
   bezel at fraction x of its width: refract the vertical ray at the surface,
   then let it descend the glass under that point */
function shiftAt(f, x, b, T) {
  if (x >= 1) return 0
  const h = f(x)
  const slope = slopeAt(f, x, b, T)
  const len = Math.hypot(slope, 1)
  const nx = -slope / len
  const nz = 1 / len
  const c1 = nz
  const c2 = Math.sqrt(Math.max(0, 1 - ETA * ETA * (1 - c1 * c1)))
  const k = ETA * c1 - c2
  const tx = k * nx
  const tz = -ETA + k * nz
  return (h * T * tx) / -tz
}

function shiftTable(f, b, T, n = 160) {
  const t = new Float32Array(n + 1)
  let max = 0
  for (let i = 0; i <= n; i++) {
    t[i] = shiftAt(f, i / n, b, T)
    if (t[i] > max) max = t[i]
  }
  return { t, max, n }
}

const lookup = ({ t, n }, x) => {
  if (x <= 0 || x >= 1) return 0
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

/* Tiles for one (radius, depth, thickness, profile). Each pixel packs the
   displacement vector (R, G — 127.5 is zero) and the bezel height (B —
   127.5 is zero, 255 is the flat top). Alpha stays opaque so nothing is
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
        const h = inside ? f(Math.min(1, d / b)) : 0
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

/* -------------------------------------------------------------- <Glass> --
   radius     corner radius (a capsule / circle when it is half the height)
   depth      how far the bezel reaches in from the edge (Figma: Depth)
   thickness  slab height — sets how hard the bezel bends light
   profile    bezel curvature: 'circle' (broad lens) or 'squircle' (Apple's)
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
  const T = thickness ?? Math.round(b * 2)
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
        if (l1) l1.setAttribute('azimuth', st.az.x.toFixed(2))
        if (l2) l2.setAttribute('azimuth', (st.az.x + 180).toFixed(2))
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
              {/* 7 · thickness: the bezel reflects the darker surroundings, then a thin bright line rides its very edge */}
              <feComposite in="lens1" in2="core" operator="arithmetic" k1="0.12" k2="0.88" result="lens2" />
              <feComponentTransfer in="edge" result="edgeLine">
                <feFuncR type="gamma" amplitude="0.45" exponent="7" offset="0" />
                <feFuncG type="gamma" amplitude="0.45" exponent="7" offset="0" />
                <feFuncB type="gamma" amplitude="0.45" exponent="7" offset="0" />
              </feComponentTransfer>
              <feComposite in="lens2" in2="edgeLine" operator="arithmetic" k2="1" k3="1" result="lens2b" />
              {/* 8 · specular: a key light and a faint return light on the bezel */}
              <feSpecularLighting in="hS" surfaceScale={T * 0.9} specularConstant="0.5" specularExponent="64" lightingColor="#fff" result="sp1">
                <feDistantLight ref={(n) => (lightRef.current[0] = n)} azimuth={lit.azimuth} elevation={lit.elevation} />
              </feSpecularLighting>
              <feSpecularLighting in="hS" surfaceScale={T * 0.9} specularConstant="0.26" specularExponent="44" lightingColor="#fff" result="sp2">
                <feDistantLight ref={(n) => (lightRef.current[1] = n)} azimuth={lit.azimuth + 180} elevation={lit.elevation - 6} />
              </feSpecularLighting>
              <feComposite in="lens2b" in2="sp1" operator="arithmetic" k2="1" k3="1" result="lens3" />
              <feComposite in="lens3" in2="sp2" operator="arithmetic" k2="1" k3="1" />
            </filter>
          )}
        </defs>
      </svg>
      {/* an optional coloured film UNDER the glass — part of the backdrop, so the rim and anything riding on top refract it */}
      {film && <span className="gl-film" style={{ background: film }} />}
      <span className="gl-lens" style={{ backdropFilter: filterCss, WebkitBackdropFilter: filterCss }} />
      <span className="gl-body">{children}</span>
    </Tag>
  )
}

/* ------------------------------------------------------------ wallpaper --
   The glass stage backdrop: bold colour fields with real edges, so the
   lensing has something to bend. Sized to the stage. */
const wallCache = new Map()

export function wallpaperURL(w, h) {
  const key = `${w}x${h}`
  if (!wallCache.has(key)) {
    wallCache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(wallpaperSVG(w, h)))
  }
  return wallCache.get(key)
}

function wallpaperSVG(w, h) {
  // continuous colour everywhere: a lens magnifies what is under its centre,
  // so the field must not have dark seams for it to land on
  const field = (id, c, a) =>
    `<radialGradient id="${id}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/><stop offset=".7" stop-color="${c}" stop-opacity="${a * 0.92}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`
  const E = (cx, cy, rx, ry, fill, rot = 0) =>
    `<ellipse cx="${cx * w}" cy="${cy * h}" rx="${rx * w}" ry="${ry * h}" fill="url(#${fill})" transform="rotate(${rot} ${cx * w} ${cy * h})"/>`
  const band = (cx, cy, len, thick, c, a, rot) =>
    `<rect x="${cx * w - len * w}" y="${cy * h - (thick * h) / 2}" width="${2 * len * w}" height="${thick * h}" rx="${(thick * h) / 2}" fill="${c}" fill-opacity="${a}" transform="rotate(${rot} ${cx * w} ${cy * h})"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<linearGradient id="base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b5cff"/><stop offset=".38" stop-color="#7c5cf6"/><stop offset=".68" stop-color="#ff4fa3"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient>
${field('c', '#22d3ee', 0.95)}${field('v', '#8b5cf6', 0.9)}${field('o', '#ff9a4a', 0.95)}${field('p', '#ff4fa3', 0.9)}${field('b', '#3b6dff', 0.95)}
<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="1.3" fill="#fff" fill-opacity=".26"/></pattern>
</defs>
<rect width="100%" height="100%" fill="url(#base)"/>
${E(0.2, 0.3, 0.26, 0.42, 'b', -18)}
${E(0.5, 0.14, 0.2, 0.3, 'v', 8)}
${E(0.82, 0.3, 0.22, 0.4, 'p', 14)}
${E(0.3, 0.88, 0.3, 0.34, 'c', -8)}
${E(0.66, 0.8, 0.22, 0.32, 'o', 0)}
${band(0.36, 0.3, 0.5, 0.05, '#dfe6ff', 0.55, -16)}
${band(0.7, 0.62, 0.42, 0.045, '#ffd6ea', 0.5, 12)}
${band(0.46, 0.84, 0.5, 0.035, '#d3fff9', 0.5, -9)}
<rect width="100%" height="100%" fill="url(#dots)"/>
</svg>`
}
