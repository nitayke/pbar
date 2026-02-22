type Props = {
  nameInput: string;
  onNameInputChange: (value: string) => void;
  onSubmit: () => void;
  message: string | null;
};

export default function WelcomeScreen({
  nameInput,
  onNameInputChange,
  onSubmit,
  message,
}: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 px-4">
      <div className="glass w-full max-w-xl rounded-3xl border border-cyan-400/30 bg-slate-900/85 p-8 shadow-2xl shadow-cyan-900/20">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.5em] text-cyan-300/80">WELCOME</div>
          <h2 className="mt-3 text-3xl font-bold text-white">ברוך הבא ל־PBAR</h2>
          <p className="mt-2 text-sm text-slate-300">כדי להתחיל, איך קוראים לך?</p>
        </div>

        <div className="mt-7 space-y-3">
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => onNameInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
            placeholder="הכנס שם"
            className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-center text-base text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20"
          />
          <button
            type="button"
            onClick={onSubmit}
            className="btn-hover w-full rounded-xl border border-emerald-400/70 bg-emerald-500/10 px-4 py-3 text-sm uppercase tracking-[0.25em] text-emerald-200"
          >
            המשך
          </button>
          {message && (
            <div className="text-center text-xs text-amber-200">{message}</div>
          )}
        </div>
      </div>
    </div>
  );
}
