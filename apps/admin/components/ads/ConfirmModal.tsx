import React from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import clsx from "clsx";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger" | "success";
  isLoading?: boolean;
  error?: string | null;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmVariant = "primary",
  isLoading = false,
  error,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl z-10 space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          {description && (
            <div className="text-sm text-zinc-400 leading-relaxed">
              {description}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={clsx(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 active:scale-95",
              confirmVariant === "danger"
                ? "bg-rose-600 hover:bg-rose-500"
                : confirmVariant === "success"
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-teal-600 hover:bg-teal-500"
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
