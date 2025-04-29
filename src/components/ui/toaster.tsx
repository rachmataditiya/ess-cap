import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, AlertCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const Icon = variant === "destructive" ? AlertCircle : 
                    title?.toString().toLowerCase().includes("berhasil") ? CheckCircle2 : 
                    Info;

        return (
          <Toast key={id} {...props} variant={variant}>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Icon className={`h-5 w-5 ${
                  variant === "destructive" ? "text-destructive-foreground" : 
                  title?.toString().toLowerCase().includes("berhasil") ? "text-green-500" : 
                  "text-blue-500"
                }`} />
              </div>
              <div className="flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose />
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
