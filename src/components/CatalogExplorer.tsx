import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import type { HydratedProject, Category, ProjectStatus } from '../data/schema';
import { getCategoryLabel } from '../lib/projects';

interface Props {
  projects: HydratedProject[];
}

type SortOption = 'stars' | 'recentCommit' | 'recentRelease' | 'name';

export default function CatalogExplorer({ projects }: Props) {
  const [lang, setLang] = useState<'pt' | 'en'>('pt');
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('all');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const [language, setLanguage] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('stars');
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);

  // Sincronização inicial com Query String e idioma
  useEffect(() => {
    const currentLang = (document.documentElement.getAttribute('data-lang') as 'pt' | 'en') || 'pt';
    setLang(currentLang);

    const params = new URLSearchParams(window.location.search);
    if (params.get('q')) setQuery(params.get('q')!);
    if (params.get('platform')) setPlatform(params.get('platform')!);
    if (params.get('category')) setCategory(params.get('category') as Category);
    if (params.get('status')) setStatus(params.get('status') as ProjectStatus);
    if (params.get('lang')) setLanguage(params.get('lang')!);
    if (params.get('sort')) setSortBy(params.get('sort') as SortOption);

    const savedCompare = sessionStorage.getItem('porthub-compare');
    if (savedCompare) {
      try {
        setCompareSlugs(JSON.parse(savedCompare));
      } catch {
        // Ignora erro de parse
      }
    }

    const onLangChange = (e: Event) => {
      const custom = e as CustomEvent<{ lang: 'pt' | 'en' }>;
      setLang(custom.detail.lang);
    };
    window.addEventListener('porthub:lang-change', onLangChange);
    return () => window.removeEventListener('porthub:lang-change', onLangChange);
  }, []);

  // Atualiza URL sem recarregar a página para compartilhamento direto de filtros
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (platform !== 'all') params.set('platform', platform);
    if (category !== 'all') params.set('category', category);
    if (status !== 'all') params.set('status', status);
    if (language !== 'all') params.set('lang', language);
    if (sortBy !== 'stars') params.set('sort', sortBy);

    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [query, platform, category, status, language, sortBy]);

  const platforms = useMemo(
    () => Array.from(new Set(projects.map((p) => p.originalPlatform))).sort(),
    [projects]
  );

  const languages = useMemo(
    () => Array.from(new Set(projects.map((p) => p.generated.language))).sort(),
    [projects]
  );

  const fuse = useMemo(
    () =>
      new Fuse(projects, {
        keys: [
          { name: 'name', weight: 2 },
          { name: 'game', weight: 2 },
          { name: 'originalPlatform', weight: 1.5 },
          { name: 'tags', weight: 1.2 },
          { name: 'summaryPt', weight: 0.8 },
          { name: 'summaryEn', weight: 0.8 },
        ],
        threshold: 0.32,
        ignoreLocation: true,
      }),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const baseList = query.trim()
      ? fuse.search(query.trim()).map((res) => res.item)
      : [...projects];

    return baseList
      .filter((item) => {
        if (platform !== 'all' && item.originalPlatform !== platform) return false;
        if (category !== 'all' && item.category !== category) return false;
        if (status !== 'all' && item.status !== status) return false;
        if (language !== 'all' && item.generated.language !== language) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'stars') return b.generated.stars - a.generated.stars;
        if (sortBy === 'recentCommit') {
          return (
            new Date(b.generated.lastCommitAt).getTime() -
            new Date(a.generated.lastCommitAt).getTime()
          );
        }
        if (sortBy === 'recentRelease') {
          const dateA = a.generated.latestRelease?.publishedAt
            ? new Date(a.generated.latestRelease.publishedAt).getTime()
            : 0;
          const dateB = b.generated.latestRelease?.publishedAt
            ? new Date(b.generated.latestRelease.publishedAt).getTime()
            : 0;
          return dateB - dateA;
        }
        return a.name.localeCompare(b.name);
      });
  }, [projects, fuse, query, platform, category, status, language, sortBy]);

  const toggleCompare = (slug: string) => {
    setCompareSlugs((prev) => {
      const next = prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length < 3
          ? [...prev, slug]
          : prev;
      sessionStorage.setItem('porthub-compare', JSON.stringify(next));
      return next;
    });
  };

  const resetFilters = () => {
    setQuery('');
    setPlatform('all');
    setCategory('all');
    setStatus('all');
    setLanguage('all');
    setSortBy('stars');
  };

  return (
    <section id="catalogo" aria-label={lang === 'pt' ? 'Catálogo de Projetos' : 'Project Catalog'} className="space-y-6">
      {/* Barra de controles de busca e filtros combináveis */}
      <div className="p-5 rounded-panel bg-bg-elevated border border-border-subtle shadow-panel space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5">
            <label htmlFor="catalog-search" className="sr-only">
              {lang === 'pt' ? 'Buscar projetos' : 'Search projects'}
            </label>
            <input
              id="catalog-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                lang === 'pt'
                  ? 'Buscar por jogo, porte, plataforma ou tag...'
                  : 'Search by game, port, platform, or tag...'
              }
              className="w-full px-4 py-2.5 rounded-terminal bg-bg-panel border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:border-arcade-cyan font-mono"
            />
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <select
              aria-label={lang === 'pt' ? 'Filtrar por plataforma' : 'Filter by platform'}
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="px-2.5 py-2 rounded-terminal bg-bg-panel border border-border-subtle text-xs font-mono text-text-primary"
            >
              <option value="all">{lang === 'pt' ? 'Plataforma (Todas)' : 'Platform (All)'}</option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              aria-label={lang === 'pt' ? 'Filtrar por categoria' : 'Filter by category'}
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | 'all')}
              className="px-2.5 py-2 rounded-terminal bg-bg-panel border border-border-subtle text-xs font-mono text-text-primary"
            >
              <option value="all">{lang === 'pt' ? 'Categoria (Todas)' : 'Category (All)'}</option>
              <option value="hybrid-port">{getCategoryLabel('hybrid-port', lang)}</option>
              <option value="static-recomp">{getCategoryLabel('static-recomp', lang)}</option>
              <option value="native-port">{getCategoryLabel('native-port', lang)}</option>
              <option value="decomp">{getCategoryLabel('decomp', lang)}</option>
              <option value="emulation">{getCategoryLabel('emulation', lang)}</option>
            </select>

            <select
              aria-label={lang === 'pt' ? 'Filtrar por status' : 'Filter by status'}
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus | 'all')}
              className="px-2.5 py-2 rounded-terminal bg-bg-panel border border-border-subtle text-xs font-mono text-text-primary"
            >
              <option value="all">{lang === 'pt' ? 'Status (Todos)' : 'Status (All)'}</option>
              <option value="active">Active</option>
              <option value="stale">Stale</option>
              <option value="archived">Archived</option>
              <option value="unavailable">Unavailable</option>
            </select>

            <select
              aria-label={lang === 'pt' ? 'Filtrar por linguagem' : 'Filter by language'}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-2.5 py-2 rounded-terminal bg-bg-panel border border-border-subtle text-xs font-mono text-text-primary"
            >
              <option value="all">{lang === 'pt' ? 'Linguagem (Todas)' : 'Language (All)'}</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              aria-label={lang === 'pt' ? 'Ordenar projetos' : 'Sort projects'}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-2 rounded-terminal bg-bg-panel border border-border-subtle text-xs font-mono text-arcade-cyan font-semibold"
            >
              <option value="stars">{lang === 'pt' ? '★ Mais Estrelas' : '★ Most Stars'}</option>
              <option value="recentCommit">{lang === 'pt' ? '⚡ Commit Recente' : '⚡ Recent Commit'}</option>
              <option value="recentRelease">{lang === 'pt' ? '📦 Última Release' : '📦 Latest Release'}</option>
              <option value="name">{lang === 'pt' ? 'A-Z Nome' : 'A-Z Name'}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border-subtle text-xs font-mono text-text-secondary">
          <div>
            {lang === 'pt'
              ? `Exibindo ${filteredProjects.length} de ${projects.length} projetos validados`
              : `Showing ${filteredProjects.length} of ${projects.length} verified projects`}
          </div>

          <div className="flex items-center gap-3">
            {compareSlugs.length > 0 && (
              <a
                href={`/comparar?items=${compareSlugs.join(',')}`}
                className="px-3 py-1 rounded-terminal bg-arcade-cyan text-slate-950 font-bold hover:opacity-90 transition-opacity"
              >
                {lang === 'pt'
                  ? `Comparar (${compareSlugs.length}/3) →`
                  : `Compare (${compareSlugs.length}/3) →`}
              </a>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="text-text-muted hover:text-arcade-cyan underline underline-offset-4"
            >
              {lang === 'pt' ? 'Resetar filtros' : 'Reset filters'}
            </button>
          </div>
        </div>
      </div>

      {/* Estado vazio desenhado */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center rounded-panel bg-bg-elevated border border-border-subtle space-y-3">
          <p className="font-mono text-lg text-arcade-amber">
            [0 MATCH_RESULTS]
          </p>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            {lang === 'pt'
              ? 'Nenhum projeto corresponde à combinação atual de filtros. Tente limpar a busca ou explorar outra plataforma.'
              : 'No project matches the current filter combination. Try resetting your search or selecting another platform.'}
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 text-xs font-mono font-semibold rounded-terminal bg-arcade-cyan/15 border border-arcade-cyan/50 text-arcade-cyan"
          >
            {lang === 'pt' ? 'Restaurar Catálogo Completo' : 'Restore Full Catalog'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const isSelectedForCompare = compareSlugs.includes(project.slug);
            return (
              <article
                key={project.slug}
                className="group relative flex flex-col justify-between p-5 rounded-panel bg-bg-elevated border border-border-subtle hover:border-arcade-cyan/60 transition-all duration-200 shadow-panel"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded bg-bg-panel border border-border-subtle text-arcade-cyan font-semibold">
                      {project.originalPlatform}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-arcade-emerald/10 border border-arcade-emerald/30 text-arcade-emerald">
                      {getCategoryLabel(project.category, lang)}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-text-primary group-hover:text-arcade-cyan transition-colors">
                      <a href={`/projeto/${project.slug}/`} className="focus:outline-none">
                        {project.name}
                      </a>
                    </h3>
                    <p className="text-xs font-mono text-text-muted">{project.game}</p>
                  </div>

                  <p className="text-sm text-text-secondary line-clamp-3 leading-relaxed">
                    {lang === 'en' ? project.summaryEn : project.summaryPt}
                  </p>

                  {typeof project.generated.decompProgress === 'number' && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] font-mono text-text-secondary">
                        <span>DECOMP_PROGRESS</span>
                        <span className="text-arcade-emerald font-bold">{project.generated.decompProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-bg-panel rounded-full overflow-hidden">
                        <div
                          className="h-full bg-arcade-emerald"
                          style={{ width: `${project.generated.decompProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-border-subtle space-y-3">
                  {/* Aviso Legal obrigatório em cada card */}
                  <div className="px-2.5 py-1.5 rounded bg-bg-panel/80 border border-border-subtle text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                    <span>⚖</span>
                    <span>
                      {lang === 'en'
                        ? 'Requires a legitimate copy of the game'
                        : 'Requer uma cópia legítima do jogo'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-text-secondary">
                    <div className="flex items-center gap-3">
                      <span title="GitHub Stars">★ {project.generated.stars.toLocaleString()}</span>
                      <span>{project.generated.language}</span>
                      {project.generated.latestRelease && (
                        <span className="text-arcade-cyan">{project.generated.latestRelease.tag}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCompare(project.slug)}
                        className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                          isSelectedForCompare
                            ? 'bg-arcade-cyan text-slate-950 border-arcade-cyan font-bold'
                            : 'bg-bg-panel border-border-subtle text-text-secondary hover:border-arcade-cyan/50'
                        }`}
                        aria-pressed={isSelectedForCompare}
                      >
                        {isSelectedForCompare ? '✓ Comp' : '+ Comp'}
                      </button>
                      <a
                        href={`/projeto/${project.slug}/`}
                        className="px-2.5 py-1 rounded bg-bg-panel border border-border-subtle text-text-primary hover:border-arcade-cyan hover:text-arcade-cyan transition-colors"
                      >
                        {lang === 'en' ? 'Details →' : 'Detalhes →'}
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
