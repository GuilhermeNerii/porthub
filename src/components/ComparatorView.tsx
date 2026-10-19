import { useState, useEffect } from 'react';
import type { HydratedProject } from '../data/schema';
import { getCategoryLabel } from '../lib/projects';

interface Props {
  projects: HydratedProject[];
}

export default function ComparatorView({ projects }: Props) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([
    'gow3-pc',
    'bloodborne-pc-supermedo',
    'unleashed-recompiled',
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const itemsParam = params.get('items');
    if (itemsParam) {
      const valid = itemsParam
        .split(',')
        .filter((s) => projects.some((p) => p.slug === s))
        .slice(0, 3);
      if (valid.length > 0) setSelectedSlugs(valid);
      return;
    }

    const saved = sessionStorage.getItem('porthub-compare');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        if (parsed.length > 0) setSelectedSlugs(parsed.slice(0, 3));
      } catch {
        // Ignora erro
      }
    }
  }, [projects]);

  const updateSlot = (index: number, newSlug: string) => {
    const next = [...selectedSlugs];
    next[index] = newSlug;
    setSelectedSlugs(next);
    sessionStorage.setItem('porthub-compare', JSON.stringify(next));
  };

  const selectedProjects = selectedSlugs.map(
    (slug) => projects.find((p) => p.slug === slug) ?? projects[0]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((slotIdx) => (
          <div key={slotIdx} className="p-4 rounded-panel bg-bg-elevated border border-border-subtle">
            <label
              htmlFor={`slot-${slotIdx}`}
              className="block text-xs font-mono text-arcade-cyan mb-2"
            >
              SLOT DE COMPARAÇÃO #{slotIdx + 1}
            </label>
            <select
              id={`slot-${slotIdx}`}
              value={selectedSlugs[slotIdx] || projects[0].slug}
              onChange={(e) => updateSlot(slotIdx, e.target.value)}
              className="w-full px-3 py-2 rounded-terminal bg-bg-panel border border-border-subtle text-sm font-mono text-text-primary"
            >
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} ({p.originalPlatform})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-panel border border-border-subtle bg-bg-elevated shadow-panel">
        <table className="w-full text-left border-collapse font-mono text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-panel">
              <th className="p-4 text-text-muted w-1/4">MÉTRICA / ATRIBUTO</th>
              {selectedProjects.map((proj, idx) => (
                <th key={`${proj.slug}-${idx}`} className="p-4 text-arcade-cyan font-bold w-1/4">
                  <a href={`/projeto/${proj.slug}/`} className="hover:underline">
                    {proj.name}
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            <tr>
              <td className="p-4 text-text-secondary font-semibold">Jogo Original</td>
              {selectedProjects.map((p, i) => (
                <td key={i} className="p-4 text-text-primary">{p.game}</td>
              ))}
            </tr>
            <tr>
              <td className="p-4 text-text-secondary font-semibold">Plataforma de Origem</td>
              {selectedProjects.map((p, i) => (
                <td key={i} className="p-4 text-text-primary">{p.originalPlatform}</td>
              ))}
            </tr>
            <tr>
              <td className="p-4 text-text-secondary font-semibold">Abordagem Técnica</td>
              {selectedProjects.map((p, i) => (
                <td key={i} className="p-4 text-arcade-emerald">{getCategoryLabel(p.category, 'pt')}</td>
              ))}
            </tr>
            <tr>
              <td className="p-4 text-text-secondary font-semibold">Estrelas / Forks</td>
              {selectedProjects.map((p, i) => (
                <td key={i} className="p-4 text-text-primary">
                  ★ {p.generated.stars.toLocaleString()} / ⑂ {p.generated.forks.toLocaleString()}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-4 text-text-secondary font-semibold">Issues Abertas</td>
              {selectedProjects.map((p, i) => (
                <td key={i} className="p-4 text-text-primary">{p.generated.openIssues}</td>
              ))}
            </tr>
            <tr>
              <td className="p-4 text-text-secondary font-semibold">Linguagem Principal</td>
              {selectedProjects.map((p, i) => (
                <td key={i} className="p-4 text-text-primary">{p.generated.language}</td>
              ))}
            </tr>
            <tr>
              <td className="p-4 text-text-secondary font-semibold">Progresso Decomp</td>
              {selectedProjects.map((p, i) => (
                <td key={i} className="p-4 text-text-primary">
                  {typeof p.generated.decompProgress === 'number'
                    ? `${p.generated.decompProgress}%`
                    : 'N/A (Porte / Recomp)'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-4 text-text-secondary font-semibold">Última Release</td>
              {selectedProjects.map((p, i) => (
                <td key={i} className="p-4 text-arcade-cyan">
                  {p.generated.latestRelease ? p.generated.latestRelease.tag : 'Sem release tag'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-4 text-text-secondary font-semibold">Último Commit</td>
              {selectedProjects.map((p, i) => (
                <td key={i} className="p-4 text-text-secondary">
                  {new Date(p.generated.lastCommitAt).toISOString().slice(0, 10)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-4 text-text-secondary font-semibold">Requisito Legal</td>
              {selectedProjects.map((p, i) => (
                <td key={i} className="p-4 text-amber-400 text-xs">{p.requirements}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
