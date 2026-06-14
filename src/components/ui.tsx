"use client";

import { useCallback, useEffect, useState } from "react";

/* ----------------------------- Toast ----------------------------- */
export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);
  const node = toast ? (
    <div className="fixed bottom-6 right-6 bg-vb-navy text-white text-sm rounded-vb px-4 py-2.5 shadow-lg z-[60]">
      {toast}
    </div>
  ) : null;
  return { show, node };
}

/* ----------------------------- Modal ----------------------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-vb-panel rounded-vb shadow-xl w-full ${
          wide ? "max-w-3xl" : "max-w-md"
        } max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-vb-border">
          <h3 className="font-heading font-semibold text-vb-navy">{title}</h3>
          <button onClick={onClose} className="text-vb-muted hover:text-vb-text text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------- Confirm dialog ------------------------ */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-vb-text mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-vb border border-vb-border px-4 py-2 text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-vb px-4 py-2 text-sm font-semibold text-white ${
            destructive ? "bg-red-600 hover:bg-red-700" : "bg-vb-navy hover:bg-vb-navy-dark"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* --------------------------- Side panel -------------------------- */
export function SidePanel({
  open,
  onClose,
  title,
  children,
  actions,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className={`relative bg-vb-bg w-full h-full shadow-2xl overflow-y-auto ${
          wide ? "max-w-none" : "max-w-3xl"
        }`}
      >
        <div className="sticky top-0 bg-vb-navy text-white px-5 py-3 flex items-center justify-between z-10">
          <h3 className="font-heading font-semibold">{title}</h3>
          <div className="flex items-center gap-3">
            {actions}
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">
              ×
            </button>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
