import { render } from 'preact'
import { App } from './App'
import './styles/tokens.css'
import './styles/global.css'
import './styles/components.css'

render(<App />, document.getElementById('app')!)
