import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClose: () => void;
};

/** Reusable fullscreen backdrop that closes on outside click and centers its content. */
export default function Modal({ children, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4"
      onClick={onClose}
    >
      <div
        className="glass max-h-[90vh] w-full overflow-y-auto rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
