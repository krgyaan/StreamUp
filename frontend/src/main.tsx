import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Footer from "./components/Footer"
import { Header } from "./components/Header"
import { BrowserRouter } from "react-router-dom"
import { ToastProvider } from './lib/use-toast.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ToastProvider>
            <BrowserRouter>
                <Header />
                <App />
                <Footer />
            </BrowserRouter>
        </ToastProvider>
    </StrictMode>,
)
