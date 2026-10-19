import rawProjects from '../../data/projects.json';
import rawGenerated from '../../data/generated.json';
import rawHistory from '../../data/history.json';
import {
  ProjectSchema,
  GeneratedStoreSchema,
  HistoryEventSchema,
  type HydratedProject,
  type HistoryEvent,
  type Category,
} from '../data/schema';
import { z } from 'zod';

const ProjectsArraySchema = z.array(ProjectSchema).min(1);
const HistoryArraySchema = z.array(HistoryEventSchema);

/**
 * Valida rigorosamente os arquivos de dados durante o build.
 * Qualquer erro de schema, link inválido ou ausência de requisito legal falha o build com mensagem explícita.
 */
export function getHydratedProjects(): HydratedProject[] {
  const parsedProjects = ProjectsArraySchema.safeParse(rawProjects);
  if (!parsedProjects.success) {
    const formatted = parsedProjects.error.issues
      .map((i) => `[projects.json -> ${i.path.join('.')}]: ${i.message}`)
      .join('\n');
    throw new Error(`Falha crítica de validação em data/projects.json:\n${formatted}`);
  }

  const parsedGenerated = GeneratedStoreSchema.safeParse(rawGenerated);
  if (!parsedGenerated.success) {
    const formatted = parsedGenerated.error.issues
      .map((i) => `[generated.json -> ${i.path.join('.')}]: ${i.message}`)
      .join('\n');
    throw new Error(`Falha crítica de validação em data/generated.json:\n${formatted}`);
  }

  const slugs = new Set<string>();
  for (const project of parsedProjects.data) {
    if (slugs.has(project.slug)) {
      throw new Error(`Slug duplicado detectado em data/projects.json: "${project.slug}"`);
    }
    slugs.add(project.slug);
  }

  const fallbackDate = parsedGenerated.data.lastUpdatedAt;

  return parsedProjects.data.map((project) => {
    const gen = parsedGenerated.data.projects[project.slug] ?? {
      stars: 0,
      forks: 0,
      openIssues: 0,
      language: 'Unknown',
      lastCommitAt: fallbackDate,
      latestRelease: null,
      fetchedAt: fallbackDate,
    };

    return {
      ...project,
      generated: gen,
    };
  });
}

export function getLastUpdatedAt(): string {
  const parsedGenerated = GeneratedStoreSchema.parse(rawGenerated);
  return parsedGenerated.lastUpdatedAt;
}

export function getHistoryEvents(): HistoryEvent[] {
  const parsed = HistoryArraySchema.safeParse(rawHistory);
  if (!parsed.success) {
    throw new Error(`Falha crítica de validação em data/history.json: ${parsed.error.message}`);
  }
  return parsed.data.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getCategoryLabel(category: Category, lang: 'pt' | 'en' = 'pt'): string {
  const labels: Record<Category, { pt: string; en: string }> = {
    decomp: { pt: 'Decompilação', en: 'Decompilation' },
    'static-recomp': { pt: 'Recompilação Estática', en: 'Static Recompilation' },
    'native-port': { pt: 'Porte Nativo', en: 'Native Port' },
    'hybrid-port': { pt: 'Porte Híbrido', en: 'Hybrid Port' },
    emulation: { pt: 'Emulação Oficial', en: 'Official Emulation' },
  };
  return labels[category][lang];
}

export function buildSuggestProjectIssueUrl(repoOwnerAndName = 'seu-usuario/porthub'): string {
  const title = encodeURIComponent('[Sugestão de Projeto] Nome do Jogo / Porte');
  const body = encodeURIComponent(
    `### Nome do Projeto / Porte\n\n` +
      `### Jogo Original e Plataforma\n\n` +
      `### Categoria\n- [ ] decomp\n- [ ] static-recomp\n- [ ] native-port\n- [ ] hybrid-port\n- [ ] emulation (apenas emuladores oficiais)\n\n` +
      `### URL Oficial do Repositório (GitHub / GitLab)\nhttps://github.com/\n\n` +
      `### Confirmação Legal Obrigatória\n` +
      `- [x] Confirmo que o repositório contém apenas código-fonte/ferramentas abertas e NÃO distribui ROMs, ISOs, dumps, chaves ou binários protegidos por direitos autorais.`
  );
  return `https://github.com/${repoOwnerAndName}/issues/new?title=${title}&body=${body}`;
}
