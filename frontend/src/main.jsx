import React from 'react'
import ReactDOM from 'react-dom/client'
import MainAppRouter from './MainAppRouter.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MainAppRouter />
  </React.StrictMode>,
)
