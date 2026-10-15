import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './prototype.css'
import MatchPrototype from './MatchPrototype'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MatchPrototype />
  </StrictMode>,
)
