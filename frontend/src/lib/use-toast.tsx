import React, { createContext, useContext, useState } from "react"

type ToastVariant = "default" | "destructive"

type ToastData = {
  id: number
  title?: string
  description?: string
  variant?: ToastVariant
}

type ToastContextType = {
  toasts: ToastData[]
  toast: (toast: Omit<ToastData, "id">) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

let toastId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const toast = ({ title, description, variant = "default" }: Omit<ToastData, "id">) => {
    const id = ++toastId
    const newToast = { id, title, description, variant }
    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      dismiss(id)
    }, 4000)
  }

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 left-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-72 p-4 rounded-md shadow-lg text-white animate-slideIn
              ${t.variant === "destructive" ? "bg-red-600" : "bg-gray-800"}`}
          >
            <div className="flex justify-between items-center">
              <div>
                {t.title && <p className="font-semibold">{t.title}</p>}
                {t.description && <p className="text-sm">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="ml-4 text-white hover:text-black">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}

export const toast = (data: Omit<ToastData, "id">) => {
  const event = new CustomEvent("custom-toast", { detail: data })
  window.dispatchEvent(event)
}

// Bootstrap hook to catch global toasts
export function useToastListener() {
  const { toast } = useToast()

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      toast(detail)
    }

    window.addEventListener("custom-toast", handler)
    return () => window.removeEventListener("custom-toast", handler)
  }, [toast])
}
