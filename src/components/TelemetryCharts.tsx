import { useMemo } from 'react';
import type { HydratedProject } from '../data/schema';
import { getCategoryLabel } from '../lib/projects';

interface Props {
  projects: HydratedProject[];
}

export default function TelemetryCharts({ projects }: Props) {
  const byPlatform = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      counts[p.originalPlatform] = (counts[p.originalPlatform] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const byCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      const label = getCategoryLabel(p.category, 'pt');
      counts[label] = (counts[label] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const maxPlatCount = Math.max(...byPlatform.map(([, c]) => c), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico SVG Acessível: Projetos por Plataforma Original */}
      <div className="p-6 rounded-panel bg-bg-elevated border border-border-subtle shadow-panel space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-arcade-cyan font-bold">
          [01] Distribuição por Plataforma Original (SVG)
        </h2>
        <svg
          viewBox={`0 0 500 ${byPlatform.length * 36 + 20}`}
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label="Gráfico de barras mostrando quantidade de projetos por plataforma original"
        >
          {byPlatform.map(([plat, count], idx) => {
            const y = idx * 36 + 10;
            const barWidth = Math.max(24, (count / maxPlatCount) * 280);
            return (
              <g key={plat} transform={`translate(0, ${y})`}>
                <text
                  x="0"
                  y="18"
                  className="fill-current text-text-secondary font-mono text-[12px]"
                >
                  {plat}
                </text>
                <rect
                  x="150"
                  y="4"
                  width={barWidth}
                  height="20"
                  rx="3"
                  fill="#00F0FF"
                  fillOpacity="0.25"
                  stroke="#00F0FF"
                  strokeWidth="1"
                />
                <text
                  x={160 + barWidth}
                  y="18"
                  className="fill-current text-arcade-cyan font-mono text-[12px] font-bold"
                >
                  {count}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Radar SVG de Atividade Recente vs Popularidade */}
      <div className="p-6 rounded-panel bg-bg-elevated border border-border-subtle shadow-panel space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-arcade-emerald font-bold">
          [02] Radar de Atividade Recente & Categorias
        </h2>
        <div className="space-y-3">
          {byCategory.map(([catLabel, count]) => {
            const pct = Math.round((count / projects.length) * 100);
            return (
              <div key={catLabel} className="space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-text-primary">{catLabel}</span>
                  <span className="text-arcade-emerald">
                    {count} projetos ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded bg-bg-panel overflow-hidden">
                  <div className="h-full bg-arcade-emerald" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-border-subtle">
          <h3 className="font-mono text-xs text-text-muted mb-2">
            COMMITS MAIS RECENTES DETECTADOS PELO PIPELINE:
          </h3>
          <ul className="space-y-1.5 font-mono text-xs">
            {[...projects]
              .sort(
                (a, b) =>
                  new Date(b.generated.lastCommitAt).getTime() -
                  new Date(a.generated.lastCommitAt).getTime()
              )
              .slice(0, 5)
              .map((p) => (
                <li key={p.slug} className="flex justify-between text-text-secondary">
                  <a href={`/projeto/${p.slug}/`} className="text-text-primary hover:text-arcade-cyan">
                    {p.name}
                  </a>
                  <span className="text-arcade-cyan">
                    {new Date(p.generated.lastCommitAt).toISOString().slice(0, 10)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
