import { useLayoutEffect, useRef, useState } from 'react'
import {
  DARK_SHADOW_SM,
  DockDemo,
  GRAPHITE_HI,
  MenuDemo,
  SearchDemo,
  SliderDemo,
  SubmitDemo,
  ToggleDemo,
} from './demos.jsx'
import { BounceLoader, SpinnerDemo } from './loaders.jsx'
import { wallpaperURL } from './glass.jsx'
import {
  GlassDock,
  GlassLab,
  GlassLoader,
  GlassMenu,
  GlassSearch,
  GlassSlider,
  GlassSpinner,
  GlassSubmit,
  GlassToggle,
} from './glasskit.jsx'

/* -------------------------------------------------------------- icons -- */
const NavIcon = {
  lab: (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.2 7.4a4.6 4.6 0 0 1 6.4-1.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  intro: (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 9.2v4.2M10 6.7v.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <circle cx="10" cy="14" r="3.1" fill="currentColor" />
      <circle cx="4.6" cy="8.4" r="2.1" fill="currentColor" opacity=".6" />
      <circle cx="10" cy="5.6" r="2.1" fill="currentColor" opacity=".6" />
      <circle cx="15.4" cy="8.4" r="2.1" fill="currentColor" opacity=".6" />
    </svg>
  ),
  dock: (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <rect x="6.4" y="2.4" width="7.2" height="15.2" rx="3.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="6.2" r="2" fill="currentColor" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <circle cx="8.8" cy="8.8" r="5.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12.6 12.6 16.6 16.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  submit: (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <rect x="2.2" y="6.4" width="15.6" height="7.2" rx="3.6" fill="currentColor" opacity=".35" />
      <circle cx="10" cy="10" r="3.6" fill="currentColor" />
    </svg>
  ),
  slider: (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <path d="M2.6 10h14.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
      <circle cx="12.4" cy="10" r="3.1" fill="currentColor" />
    </svg>
  ),
  toggle: (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <rect x="2.2" y="5.6" width="15.6" height="8.8" rx="4.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13.4" cy="10" r="2.6" fill="currentColor" />
    </svg>
  ),
  spinner: (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <path d="M10 3.4a6.6 6.6 0 1 1-6.4 8.2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  ),
  loader: (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <circle cx="4.4" cy="11.6" r="2.2" fill="currentColor" opacity=".55" />
      <circle cx="10" cy="8.4" r="2.2" fill="currentColor" />
      <circle cx="15.6" cy="11.6" r="2.2" fill="currentColor" opacity=".55" />
    </svg>
  ),
}

/* the wordmark's little goo glyph: two merged droplets */
function Glyph({ size = 25 }) {
  return (
    <svg viewBox="0 0 28 20" width={size} height={(size * 20) / 28} aria-hidden="true">
      <path d="M8 3a7 7 0 0 1 6.2 3.7A7 7 0 1 1 20 17a7 7 0 0 1-6.2-3.7A7 7 0 1 1 8 3z" fill="currentColor" />
    </svg>
  )
}

/* ----------------------------------------------------------- the docs -- */

const DOCS = [
  {
    id: 'menu',
    name: 'Menu',
    blurb:
      'A plus that fans into three actions and swallows them back. The pieces stay tethered to the button as they peel away, so it reads as one body splitting rather than four buttons appearing.',
    glassBlurb:
      'The same fan, cut from glass. Each action is a rigid lens that springs out along the arc, refracting the wallpaper through its bezel as it travels; the plus turns into a cross and back.',
    glassHint: 'Tap the button',
    glassCode: `import { Glass } from './glass'

<Glass as="button" radius={28} onClick={toggle}>+</Glass>

{ACTIONS.map((a, i) => (
  <Glass
    key={a.id}
    as="button"
    radius={22}
    style={{
      transform: open ? \`translate(\${FAN[i].x}px, \${FAN[i].y}px)\` : 'scale(.35)',
      transition: \`transform .9s \${spring(260, 18)} \${i * 55}ms\`,
    }}
  >
    {a.icon}
  </Glass>
))}

// <Glass>: one SVG filter per element, applied with backdrop-filter —
// a convex-squircle bezel, one Snell refraction (η 1.5), dispersion,
// and a specular rim lit from the top-left`,
    render: () => <MenuDemo />,
    glass: () => <GlassMenu />,
    hint: 'Tap the button',
    code: `import { Liquid } from 'liquid-gooey'

<Liquid blur={9} contrast={28} fill="#232329" shadow={SHADOW}>
  {ACTIONS.map((a, i) => (
    <Liquid.Item
      key={a.id}
      x={open ? FAN[i].x : 0}
      y={open ? FAN[i].y : 0}
      scale={open ? 1 : 0.5}
      transition={{ duration: 560, ease: 'cubic-bezier(.66,0,.22,1.28)' }}
      delay={i * 55}
    >
      <button className="action">{a.icon}</button>
    </Liquid.Item>
  ))}

  <Liquid.Item scale={squash} transition="bouncy">
    <button className="fab" onClick={toggle}>+</button>
  </Liquid.Item>
</Liquid>`,
  },
  {
    id: 'dock',
    name: 'Dock',
    blurb:
      'A navigation bar whose active bubble is liquid. Tap an icon and the bubble runs to it, dragging a tail behind and settling with a wobble — as a vertical rail or a horizontal bar.',
    glassBlurb:
      'A frosted glass rail with a clear glass bubble that glides between icons on a spring. The bubble is a real lens, so it refracts the frosted tray beneath it and whatever icon it lands on.',
    glassHint: 'Tap any icon',
    glassCode: `<Glass className="dock" radius={32} depth={16} frost={14}>
  <Glass
    className="bubble"
    radius={26}
    style={{
      transform: \`translateY(\${active * 64}px)\`,
      transition: \`transform .9s \${spring(260, 18)}\`,
    }}
  />
  {ICONS.map((it, i) => (
    <button key={it.id} onClick={() => setActive(i)}>{it.icon}</button>
  ))}
</Glass>

// depth = how far the bezel reaches in (Figma's Depth)
// frost = backdrop blur inside the glass`,
    render: (v) => <DockDemo key={v} variant={v} />,
    glass: (v) => <GlassDock key={v} variant={v} />,
    variants: [
      { id: 'vertical', name: 'Rail' },
      { id: 'horizontal', name: 'Bar' },
    ],
    hint: 'Tap any icon',
    code: `<Liquid blur={8} contrast={26} fill="#2C2C33" shadow={SHADOW}>
  <Liquid.Item
    effect="move"
    move={{ springiness: 0.48, wobble: 0.5, stretch: 0.5, trail: 0.75 }}
  >
    <div className="bubble" style={{ transform: \`translateY(\${active * 64}px)\` }} />
  </Liquid.Item>
</Liquid>

{ICONS.map((it, i) => (
  <button key={it.id} onClick={() => setActive(i)}>{it.icon}</button>
))}`,
  },
  {
    id: 'slider',
    name: 'Slider',
    blurb:
      'The thumb stretches into a tadpole as you drag and rounds back into a droplet when you let go. Switch to Range and the two thumbs fuse into one body when they meet.',
    glassBlurb:
      'A glass thumb on a hairline track. Drag it and the track line bends through the bezel as it passes underneath — the lens refracts the real DOM, not a copy of it.',
    glassHint: 'Drag the knob',
    glassCode: `<Glass
  className="thumb"
  radius={15}
  depth={8}
  thickness={11}
  style={{ transform: \`translateX(\${value * SPAN}px)\` }}
/>

// thickness = the slab height; thicker glass bends the backdrop further`,
    render: (v) => <SliderDemo key={v} variant={v} />,
    glass: (v) => <GlassSlider key={v} variant={v} />,
    variants: [
      { id: 'single', name: 'Single' },
      { id: 'range', name: 'Range' },
    ],
    hint: 'Drag the droplet',
    code: `<Liquid blur={7} contrast={26} fill="#EDEDF1" shadow={SHADOW}>
  {values.map((x, i) => (
    <Liquid.Item
      key={i}
      effect="move"
      move={{ springiness: 0.55, wobble: 0.6, stretch: 0.62, trail: 0.7 }}
    >
      <div
        className="thumb"
        style={{ transform: \`translateX(\${x * span}px) scale(\${drag === i ? 1.18 : 1})\` }}
      />
    </Liquid.Item>
  ))}
</Liquid>`,
  },
  {
    id: 'toggle',
    name: 'Toggle',
    blurb:
      'A rubber knob that whips across the track and overshoots before it settles. The stretch comes from velocity, so a slow drag looks nothing like a fast tap.',
    glassBlurb:
      'A frosted glass track that brightens when it is on, with a clear knob that springs across it and lenses the track as it goes.',
    glassHint: 'Tap to flip',
    glassCode: `<Glass
  as="button"
  className="toggle"
  radius={26}
  frost={12}
  tint={on ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.05)'}
  onClick={() => setOn(!on)}
>
  <Glass
    className="knob"
    radius={19}
    style={{ transform: \`translateX(\${on ? 44 : 0}px)\`, transition: \`transform .9s \${spring(260, 18)}\` }}
  />
</Glass>`,
    render: () => <ToggleDemo />,
    glass: () => <GlassToggle />,
    hint: 'Tap to switch',
    code: `<Liquid blur={7} contrast={26} fill="#EDEDF1" shadow={SHADOW}>
  <Liquid.Item
    effect="move"
    move={{ springiness: 0.5, wobble: 0.68, stretch: 0.55, trail: 0.72 }}
  >
    <div className="knob" style={{ transform: \`translateX(\${on ? 44 : 0}px)\` }} />
  </Liquid.Item>
</Liquid>`,
  },
  {
    id: 'search',
    name: 'Search',
    blurb:
      'A search field that stays a round icon button until you need it. Opening it uses the library\'s shape-change physics: the liquid travels ahead of the size change and the corners round out late, so the pill pours open rather than sliding.',
    glassBlurb:
      'A glass icon button that widens into a frosted search field. The lens re-slices its refraction map as the width animates, so the bezel stays optically correct at every size in between.',
    glassHint: 'Tap the icon',
    glassCode: `<Glass className={open ? 'field open' : 'field'} radius={26} frost={open ? 10 : 0}>
  <button onClick={() => setOpen(!open)}>{searchIcon}</button>
  <input placeholder="Search components" />
</Glass>

.field       { width: 52px; height: 52px; transition: width .5s }
.field.open  { width: 300px }

// the map is 9-sliced (corners + stretched edges), so any width works`,
    render: () => <SearchDemo />,
    glass: () => <GlassSearch />,
    hint: 'Tap the icon',
    code: `<Liquid blur={9} contrast={27} fill="#2C2C33" shadow={SHADOW}>
  <Liquid.Item morph={{ shape: true, bounce: 0.55, contentBlur: 5 }}>
    <div className={open ? 'search open' : 'search'}>
      <button onClick={() => setOpen(!open)}>{searchIcon}</button>
      <input placeholder="Search components" />
    </div>
  </Liquid.Item>
</Liquid>

// the element just changes width; the liquid supplies the physics
.search      { width: 52px }
.search.open { width: 300px; transition: width .42s }`,
  },
  {
    id: 'submit',
    name: 'Submit',
    blurb:
      'The button every form ships: it contracts into a disc while the request is in flight, then opens back up to confirm. Its footprint never changes — the box stays reserved and only the liquid inside it squeezes, so nothing beside it reflows. Watch Cancel: it does not move.',
    glassBlurb:
      'A glass pill that contracts to a disc while it works and widens again to confirm — inside a fixed footprint, so the Cancel beside it never moves.',
    glassHint: 'Tap the button',
    glassCode: `<div className="wrap">   {/* 208×52, reserved for good */}
  <Glass as="button" className={\`submit \${state}\`} radius={26} onClick={go}>
    {state === 'idle' && 'Create account'}
    {state === 'loading' && <Spinner />}
    {state === 'done' && '✓ Done'}
  </Glass>
</div>

.submit         { width: 208px; transition: width .5s }
.submit.loading { width: 52px }
.submit.done    { width: 148px }`,
    render: () => <SubmitDemo />,
    glass: () => <GlassSubmit />,
    hint: 'Tap to submit',
    code: `{/* the wrapper reserves the space; only the skin inside it resizes */}
<div className="wrap">
  <Liquid blur={9} contrast={27} fill="#EDEDF1" shadow={SHADOW}>
    <Liquid.Item morph={{ shape: true, bounce: 0.45, contentBlur: 0 }}>
      <div className={\`skin \${state}\`} />
    </Liquid.Item>
  </Liquid>

  <button className={\`submit \${state}\`} onClick={go}>
    <span className="face idle">Create account</span>
    <span className="face loading"><span className="spinner" /></span>
    <span className="face done">{tick} Done</span>
  </button>
</div>

.wrap         { width: 208px; height: 52px }   /* never changes */
.submit       { position: absolute; inset: 0 } /* hit area, fixed */
.skin         { width: 208px }                 /* the liquid body */
.skin.loading { width: 52px }
.skin.done    { width: 148px }`,
  },
  {
    id: 'spinner',
    name: 'Spinner',
    blurb:
      'A spinner is a tapered arc chasing its own tail — so build the tail out of matter. Droplets sit along one ring, each a step smaller than the one ahead of it, packed close enough that the goo fuses them into a single comma. Change the count and the taper and you get a stubby comma, a long sweep, or two arms.',
    glassBlurb:
      'The comma spinner rebuilt from glass beads: each bead is a small lens, a step behind and a step smaller than the one ahead, chasing around one ring.',
    glassHint: 'Plays on its own',
    glassCode: `{beads.map((_, i) => {
  const d = 24 * (1 - i * 0.13)
  return (
    <div key={i} className="bead" ref={(el) => (beads.current[i] = el)}>
      <Glass radius={d / 2} depth={d / 2} style={{ width: d, height: d }} />   {/* depth = radius: a dome */}
    </div>
  )
})}

// each bead sits a step further back along the ring
const a = t * 2.3 - i * STEP
el.style.transform = \`translate(\${Math.cos(a) * R}px, \${Math.sin(a) * R}px)\``,
    render: (v) => <SpinnerDemo key={v} variant={v} />,
    glass: (v) => <GlassSpinner key={v} variant={v} />,
    variants: [
      { id: 'comet', name: 'Comet' },
      { id: 'arc', name: 'Arc' },
      { id: 'dual', name: 'Dual' },
    ],
    hint: 'Plays on its own',
    code: `const R = 34          // ring radius
const STEP = 0.34     // radians between bodies

<Liquid blur={9} contrast={27} fill="#2C2C33" shadow={SHADOW}>
  {bodies.map((_, i) => (
    <Liquid.Item key={i} observe>
      <div className="dot" ref={(el) => (bodies.current[i] = el)} />
    </Liquid.Item>
  ))}
</Liquid>

// each body sits a step further back along the ring, a step smaller
const a = t * 2.3 - i * STEP
const s = 1 - i * 0.13
el.style.transform =
  \`translate(\${Math.cos(a) * R}px, \${Math.sin(a) * R}px) scale(\${s})\``,
  },
  {
    id: 'loader',
    name: 'Loader',
    blurb:
      'One body splits into three, then the three float in sequence — each lifting as the one before it falls. Nothing ever lands, so it reads as buoyant rather than heavy.',
    glassBlurb:
      'Three glass beads floating in sequence — each lifting as the one before it falls — with the wallpaper sliding through their bezels as they move.',
    glassHint: 'Plays on its own',
    glassCode: `{[0, 1, 2].map((i) => (
  <div key={i} className="bead" ref={(el) => (beads.current[i] = el)}>
    <Glass radius={13} depth={13} thickness={16} style={{ width: 26, height: 26 }} />  {/* a marble */}
  </div>
))}

// one sine, phase-shifted per bead
const y = -Math.sin(w * t - i * 0.82) * 22`,
    render: () => <BounceLoader fill={GRAPHITE_HI} shadow={DARK_SHADOW_SM} />,
    glass: () => <GlassLoader />,
    hint: 'Plays on its own',
    code: `<Liquid blur={8} contrast={26} fill="#2C2C33" shadow={SHADOW}>
  {[0, 1, 2].map((i) => (
    <Liquid.Item
      key={i}
      effect="move"
      move={{ springiness: 0.3, wobble: 0.7, stretch: 0.85, trail: 0.72 }}
    >
      <div className="dot" ref={(el) => (bodies.current[i] = el)} />
    </Liquid.Item>
  ))}
</Liquid>

// one sine, phase-shifted per dot — continuous, so nothing stops dead
const y = -Math.sin(w * t - i * 0.82) * 22`,
  },
]

/* the preview card; in glass mode it paints the generated wallpaper that the
   lenses refract, sized to the card so the two line up */
function Stage({ glass, children }) {
  const ref = useRef(null)
  const [size, setSize] = useState(null)
  useLayoutEffect(() => {
    if (!glass) return
    const el = ref.current
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.round(r.width), h: Math.round(r.height) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [glass])
  const style =
    glass && size
      ? { backgroundImage: `url("${wallpaperURL(size.w, size.h)}")`, backgroundSize: '100% 100%', backgroundOrigin: 'border-box' }
      : undefined
  return (
    <div className="stage" ref={ref} style={style}>
      {glass && <div className="stage-drift" aria-hidden="true" />}
      {children}
    </div>
  )
}

/* a small, honest highlighter: comments, tags, strings, keywords */
function Code({ source }) {
  const parts = source.split(
    /(\/\/[^\n]*|\/\*[^]*?\*\/|<\/?[A-Za-z][\w.]*|"[^"]*"|'[^']*'|\b(?:import|from|const|return|true|false)\b)/g,
  )
  return (
    <pre className="code">
      <code>
        {parts.map((p, i) => {
          if (!p) return null
          let cls = ''
          if (p.startsWith('//') || p.startsWith('/*')) cls = 't-com'
          else if (/^<\/?[A-Za-z]/.test(p)) cls = 't-tag'
          else if (/^["']/.test(p)) cls = 't-str'
          else if (/^(import|from|const|return|true|false)$/.test(p)) cls = 't-kw'
          return (
            <span key={i} className={cls}>
              {p}
            </span>
          )
        })}
      </code>
    </pre>
  )
}

function CopyButton({ text, label = 'Copy code' }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="ghost-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1400)
        } catch {
          /* clipboard unavailable — button stays quiet */
        }
      }}
    >
      <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
        <rect x="6.6" y="6.6" width="9.4" height="9.4" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M13.2 6.2V5a1.6 1.6 0 0 0-1.6-1.6H5A1.6 1.6 0 0 0 3.4 5v6.6A1.6 1.6 0 0 0 5 13.2h1.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      {done ? 'Copied' : label}
    </button>
  )
}

function Intro({ onPick }) {
  return (
    <>
      <div className="doc-head">
        <span className="doc-chip">
          <Glyph size={21} />
        </span>
        <h1>Jelly UI</h1>
        <p className="doc-blurb">
          Eight components in two materials. Gooey: soft bodies built on the Gooey library, where every state change
          is liquid — pieces stretch, tear, trail and merge. Glass: the same eight as Liquid Glass, rigid lenses that
          refract whatever sits behind them. Flip between them with the switch up top.
        </p>
      </div>

      <div className="toolbar">
        <div className="install">
          <span className="install-d">$</span> npm i liquid-gooey
        </div>
        <CopyButton text="npm i liquid-gooey" label="Copy" />
      </div>

      <div className="intro-grid">
        {DOCS.map((d) => (
          <button key={d.id} className="intro-card" onClick={() => onPick(d.id)}>
            <span className="intro-ic">{NavIcon[d.id]}</span>
            <b>{d.name}</b>
          </button>
        ))}
      </div>
    </>
  )
}

export default function Gallery() {
  const [active, setActive] = useState('menu')
  const [tab, setTab] = useState('preview')
  const [variant, setVariant] = useState({})
  const [material, setMaterial] = useState(() =>
    new URLSearchParams(location.search).has('glass') ? 'glass' : 'gooey',
  )
  const doc = DOCS.find((d) => d.id === active)
  const current = doc?.variants ? (variant[doc.id] ?? doc.variants[0].id) : undefined
  const glass = material === 'glass'
  if (!glass && active === 'lab') setActive('intro')

  const pick = (id) => {
    setActive(id)
    setTab('preview')
    document.querySelector('.site')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`site${glass ? ' glass' : ''}`}>
      <header className="topbar">
        <button className="brand" onClick={() => pick('intro')}>
          <Glyph />
          Jelly UI
        </button>
        <nav className="topnav">
          <div className="seg" role="radiogroup" aria-label="Material">
            <button
              role="radio"
              aria-checked={!glass}
              className={`seg-btn${!glass ? ' on' : ''}`}
              onClick={() => setMaterial('gooey')}
            >
              Gooey
            </button>
            <button
              role="radio"
              aria-checked={glass}
              className={`seg-btn${glass ? ' on' : ''}`}
              onClick={() => setMaterial('glass')}
            >
              Glass
            </button>
          </div>
          <span className="pill on">Components</span>
          <a href="https://libraries.dev/gooey" target="_blank" rel="noreferrer">
            Gooey
          </a>
          <a href="https://www.npmjs.com/package/liquid-gooey" target="_blank" rel="noreferrer">
            npm ↗
          </a>
        </nav>
      </header>

      <div className="shell">
        <aside className="sidebar">
          <p className="side-label">Getting started</p>
          <button className={`side-item${active === 'intro' ? ' on' : ''}`} onClick={() => pick('intro')}>
            <span className="side-ic">{NavIcon.intro}</span>
            Introduction
          </button>
          {glass && (
            <button className={`side-item${active === 'lab' ? ' on' : ''}`} onClick={() => pick('lab')}>
              <span className="side-ic">{NavIcon.lab}</span>
              Material
            </button>
          )}

          <p className="side-label">Components</p>
          {DOCS.map((d) => (
            <button key={d.id} className={`side-item${active === d.id ? ' on' : ''}`} onClick={() => pick(d.id)}>
              <span className="side-ic">{NavIcon[d.id]}</span>
              {d.name}
            </button>
          ))}
        </aside>

        <main className="doc">
          {active === 'intro' ? (
            <Intro onPick={pick} />
          ) : active === 'lab' ? (
            <>
              <div className="doc-head">
                <span className="doc-chip">{NavIcon.lab}</span>
                <h1>Material</h1>
                <p className="doc-blurb">
                  The glass on its own, over hard colour. Nothing here is a border or a shadow: the edge is where the
                  bezel bends the bands underneath, the highlight is light on that curve, and the centre stays clear.
                  Move the cursor across a lens — the surface gives slightly and the light follows.
                </p>
              </div>
              <GlassLab />
            </>
          ) : (
            <>
              <div className="doc-head">
                <span className="doc-chip">{NavIcon[doc.id]}</span>
                <h1>{doc.name}</h1>
                <p className="doc-blurb">{glass ? doc.glassBlurb : doc.blurb}</p>
              </div>

              <div className="toolbar">
                <div className="tabs">
                  <button className={`pill${tab === 'preview' ? ' on' : ''}`} onClick={() => setTab('preview')}>
                    Preview
                  </button>
                  <button className={`pill${tab === 'code' ? ' on' : ''}`} onClick={() => setTab('code')}>
                    Code
                  </button>
                </div>
                <CopyButton text={glass ? doc.glassCode : doc.code} />
              </div>

              {tab === 'preview' ? (
                <Stage glass={glass}>
                  {glass ? doc.glass(current) : doc.render(current)}
                  {doc.variants && (
                    <div className="variants">
                      {doc.variants.map((v) => (
                        <button
                          key={v.id}
                          className={`vpill${current === v.id ? ' on' : ''}`}
                          onClick={() => setVariant((prev) => ({ ...prev, [doc.id]: v.id }))}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="stage-hint">{glass ? doc.glassHint : doc.hint}</span>
                </Stage>
              ) : (
                <Code source={glass ? doc.glassCode : doc.code} />
              )}

              <p className="side-label more-label">More in the set</p>
              <div className="more-row">
                {DOCS.filter((d) => d.id !== active).map((d) => (
                  <button key={d.id} className="more-card" onClick={() => pick(d.id)}>
                    <span className="intro-ic">{NavIcon[d.id]}</span>
                    {d.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <footer className="foot">
            <div className="foot-brand">
              <span className="brand dim">
                <Glyph size={21} />
                Jelly UI
              </span>
              <p>Soft-body components for React.</p>
            </div>
            <div className="foot-cols">
              <div>
                <p className="side-label">Components</p>
                {DOCS.slice(0, 5).map((d) => (
                  <button key={d.id} className="foot-link" onClick={() => pick(d.id)}>
                    {d.name}
                  </button>
                ))}
              </div>
              <div>
                <p className="side-label">More</p>
                {DOCS.slice(5).map((d) => (
                  <button key={d.id} className="foot-link" onClick={() => pick(d.id)}>
                    {d.name}
                  </button>
                ))}
              </div>
              <div>
                <p className="side-label">Built with</p>
                <a className="foot-link" href="https://libraries.dev/gooey" target="_blank" rel="noreferrer">
                  Gooey
                </a>
                <a
                  className="foot-link"
                  href="https://www.npmjs.com/package/liquid-gooey"
                  target="_blank"
                  rel="noreferrer"
                >
                  liquid-gooey
                </a>
                <a className="foot-link" href="https://react.dev" target="_blank" rel="noreferrer">
                  React
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
