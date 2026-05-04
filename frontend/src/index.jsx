import React from 'react'
import { createRoot } from 'react-dom/client'

function App(){
  return <h1>NTG Frontend — Hello World</h1>
}

const root = document.getElementById('root') || document.body.appendChild(document.createElement('div'))
createRoot(root).render(<App />)
