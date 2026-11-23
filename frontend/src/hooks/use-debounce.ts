import { useEffect, useState } from 'react';

/** Trả về giá trị sau khi người dùng ngừng gõ `delay` ms */
export function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
