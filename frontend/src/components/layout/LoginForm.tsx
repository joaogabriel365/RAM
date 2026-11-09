import { useState, type FormEvent } from "react";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useRealtime } from "../../lib/realtime";
import { Button } from "../ui/controls";

const inputClass =
  "h-11 w-full min-w-0 rounded-card border border-line bg-surface-2 px-3 text-sm outline-none placeholder:text-ink-soft/70 focus:border-neon aria-[invalid=true]:border-alert";

/** Usuário + senha de admin. Prefill com o usuário sugerido pelo servidor, quando houver. */
export function LoginForm({ onSuccess, autoFocus = false }: { onSuccess?: () => void; autoFocus?: boolean }) {
  const { login } = useAuth();
  const hintUser = useRealtime((s) => s.info?.setupHint?.user);
  const [username, setUsername] = useState(hintUser ?? "admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm text-ink-soft">Usuário</span>
        <input
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
          aria-label="Usuário"
          className={inputClass}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-ink-soft">Senha</span>
        <input
          type="password"
          autoFocus={autoFocus}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha de admin"
          aria-label="Senha"
          aria-invalid={!!error}
          className={inputClass}
        />
      </label>
      {error && (
        <p className="text-sm text-alert" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" icon="login" className="w-full" disabled={busy || !username.trim() || !password}>
        {busy ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
