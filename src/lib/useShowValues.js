/**
 * useShowValues — Estado global para exibir/ocultar valores monetários.
 * Persiste no localStorage sob a chave "showValues".
 */
import { useState, useEffect, useCallback } from 'react';

const LS_KEY = 'showValues';
const listeners = new Set();
let globalState = localStorage.getItem(LS_KEY) !== 'false'; // default true

function notifyAll(val) {
  listeners.forEach(fn => fn(val));
}

export function useShowValues() {
  const [show, setShow] = useState(globalState);

  useEffect(() => {
    const handler = (val) => setShow(val);
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  const toggle = useCallback(() => {
    const next = !globalState;
    globalState = next;
    localStorage.setItem(LS_KEY, String(next));
    notifyAll(next);
  }, []);

  return { show, toggle };
}

/**
 * fmtVal — formata um valor monetário respeitando o estado global.
 * Para exportações (PDF/Excel), passar show=true explicitamente.
 */
export function fmtVal(v, show) {
  if (!show) return 'R$ ••••';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}