import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import App from './App'
import { ThemeProvider } from './theme'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ThemeProvider><MotionConfig reducedMotion="user"><App /></MotionConfig></ThemeProvider></React.StrictMode>)
