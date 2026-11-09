/** localStorage que nunca quebra a página (modo anônimo, armazenamento bloqueado etc.). */
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      /* sem armazenamento: segue sem lembrar */
    }
  },
};
