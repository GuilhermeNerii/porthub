import { useState, useEffect, useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
import type { HydratedProject } from '../data/schema';

interface Props {
  projects: HydratedProject[];
}

export default function CommandPalette({ projects }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const handleCustomOpen = () => setOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('porthub:open-cmd', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('porthub:open-cmd', handleCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 20);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  const fuse = useMemo(
    () =>
      new Fuse(projects, {
        keys: ['name', 'game', 'originalPlatform', 'tags'],
        threshold: 0.35,
      }),
    [projects]
  );

  const results = useMemo(() => {
    if (!query.trim()) return projects.slice(0, 8);
    return fuse.search(query.trim()).slice(0, 8).map((r) => r.item);
  }, [projects, fuse, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de Comandos"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-panel bg-bg-elevated border border-arcade-cyan/50 shadow-neon overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-border-subtle gap-3">
          <span className="font-mono text-arcade-cyan font-bold">&gt;_</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => (i + 1) % Math.max(1, results.length));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => (i - 1 + Math.max(1, results.length)) % Math.max(1, results.length));
              } else if (e.key === 'Enter' && results[selectedIndex]) {
                window.location.href = `/projeto/${results[selectedIndex].slug}/`;
              }
            }}
            placeholder="Digite o nome de um jogo, porte ou plataforma..."
            className="w-full bg-transparent text-sm font-mono text-text-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs font-mono px-2 py-0.5 rounded bg-bg-panel text-text-muted"
          >
            ESC
          </button>
        </div>

        <ul className="max-h-80 overflow-y-auto divide-y divide-border-subtle p-2">
          {results.map((item, idx) => (
            <li key={item.slug}>
              <a
                href={`/projeto/${item.slug}/`}
                className={`flex items-center justify-between px-3 py-2.5 rounded-terminal text-sm font-mono transition-colors ${
                  idx === selectedIndex
                    ? 'bg-arcade-cyan/15 text-arcade-cyan'
                    : 'text-text-primary hover:bg-bg-panel'
                }`}
              >
                <div>
                  <div className="font-bold">{item.name}</div>
                  <div className="text-xs text-text-muted">{item.game}</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-bg-panel border border-border-subtle">
                    {item.originalPlatform}
                  </span>
                  <span>★ {item.generated.stars}</span>
                </div>
              </a>
            </li>
          ))}
        </ul>

        <div className="px-4 py-2 bg-bg-panel border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-text-muted">
          <span>↑↓ para navegar • ENTER para abrir</span>
          <div className="flex gap-3">
            <a href="/comparar" className="hover:text-arcade-cyan">Ir para Comparador</a>
            <a href="/estatisticas" className="hover:text-arcade-cyan">Ver Radar</a>
          </div>
        </div>
      </div>
    </div>
  );
}
