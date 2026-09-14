import Gallery from './Gallery.jsx'
import ScrapsApp from './ScrapsApp.jsx'

/* `/` — the Jelly UI component set. `/?app` — the Scraps demo app. */
export default function App() {
  const showApp = new URLSearchParams(location.search).has('app')
  return showApp ? <ScrapsApp /> : <Gallery />
}
