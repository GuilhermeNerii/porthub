import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ProjectSchema,
  GeneratedStoreSchema,
  HistoryEventSchema,
  CandidateProjectSchema,
  type Project,
  type GeneratedStore,
  type HistoryEvent,
  type CandidateProject,
} from '../src/data/schema';
import { z } from 'zod';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PROJECTS_PATH = path.join(DATA_DIR, 'projects.json');
const GENERATED_PATH = path.join(DATA_DIR, 'generated.json');
const HISTORY_PATH = path.join(DATA_DIR, 'history.json');
const CANDIDATES_PATH = path.join(DATA_DIR, 'candidates.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REQUEST_TIMEOUT_MS = 10_000;

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  backoffMs = 1200
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, backoffMs * attempt));
          continue;
        }
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, backoffMs * attempt));
    }
  }
  throw new Error(`Falha ao consultar ${url} após ${retries} tentativas.`);
}

function extractGithubOwnerRepo(repoUrl: string): { owner: string; repo: string } | null {
  const match = repoUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

async function fetchDecompProgress(decompDevPath: string, fallback?: number): Promise<number | undefined> {
  try {
    const res = await fetchWithRetry(`https://decomp.dev/${decompDevPath}.json`, {
      headers: { Accept: 'application/json', 'User-Agent': 'PortHub-Bot/1.0' },
    }, 2, 800);
    if (!res.ok) return fallback;
    const data = (await res.json()) as Record<string, unknown>;
    if (typeof data.progress === 'number') {
      return Number(Math.min(100, Math.max(0, data.progress)).toFixed(2));
    }
    return fallback;
  } catch {
    return fallback;
  }
}

async function discoverPcgwCandidates(existingProjects: Project[]): Promise<CandidateProject[]> {
  try {
    const apiUrl =
      'https://www.pcgamingwiki.com/w/api.php?action=parse&page=List_of_unofficial_ports&prop=wikitext&format=json';
    const res = await fetchWithRetry(apiUrl, {
      headers: { 'User-Agent': 'PortHub-Discovery/1.0 (https://github.com/)' },
    });
    if (!res.ok) return [];
    const payload = (await res.json()) as { parse?: { wikitext?: { '*'?: string } } };
    const wikitext = payload.parse?.wikitext?.['*'] ?? '';
    if (!wikitext) return [];

    const existingNames = new Set(
      existingProjects.flatMap((p) => [p.name.toLowerCase(), p.game.toLowerCase()])
    );

    const candidates: CandidateProject[] = [];
    const rowRegex = /\|\s*([^|\n]+?)\s*\|\|\s*([^|\n]+?)\s*\|\|\s*(Decompilation|Recompilation|Hybrid|Recreation)/gi;
    let match: RegExpExecArray | null;

    while ((match = rowRegex.exec(wikitext)) !== null && candidates.length < 15) {
      const rawGame = match[1].replace(/\[\[|\]\]/g, '').trim();
      const rawPort = match[2].replace(/\[https?:[^\s\]]+\s+([^\]]+)\]/g, '$1').replace(/\[\[|\]\]/g, '').trim();
      const originType = match[3].trim();

      if (
        rawGame &&
        rawPort &&
        !existingNames.has(rawGame.toLowerCase()) &&
        !existingNames.has(rawPort.toLowerCase())
      ) {
        existingNames.add(rawPort.toLowerCase());
        candidates.push({
          game: rawGame.slice(0, 120),
          portName: rawPort.slice(0, 120),
          platform: 'PC / Console',
          originType,
          status: 'Needs Manual Verification',
          discoveredFrom: 'https://www.pcgamingwiki.com/wiki/List_of_unofficial_ports',
          discoveredAt: new Date().toISOString(),
          notes: 'Descoberto via PCGamingWiki API. Valide o repositório antes de incluir em projects.json.',
        });
      }
    }
    return candidates;
  } catch (err) {
    console.warn('[discovery] Aviso: falha ao consultar PCGamingWiki, mantendo candidates.json atual.', err);
    return [];
  }
}

async function main() {
  const rawProjectsText = await fs.readFile(PROJECTS_PATH, 'utf-8');
  const projects = z.array(ProjectSchema).parse(JSON.parse(rawProjectsText));

  const rawGeneratedText = await fs.readFile(GENERATED_PATH, 'utf-8');
  const generatedStore: GeneratedStore = GeneratedStoreSchema.parse(JSON.parse(rawGeneratedText));

  const rawHistoryText = await fs.readFile(HISTORY_PATH, 'utf-8');
  const historyEvents: HistoryEvent[] = z.array(HistoryEventSchema).parse(JSON.parse(rawHistoryText));

  const nowIso = new Date().toISOString();

  for (const project of projects) {
    const previous = generatedStore.projects[project.slug];
    const ghCoords = extractGithubOwnerRepo(project.repoUrl);
    if (!ghCoords) continue;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'PortHub-DataPipeline/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
    }
    if (previous?.etag) {
      headers['If-None-Match'] = previous.etag;
    }

    try {
      const repoRes = await fetchWithRetry(
        `https://api.github.com/repos/${ghCoords.owner}/${ghCoords.repo}`,
        { headers }
      );

      if (repoRes.status === 304 && previous) {
        generatedStore.projects[project.slug] = {
          ...previous,
          fetchedAt: nowIso,
        };
        continue;
      }

      if (repoRes.status === 404 || repoRes.status === 451) {
        const unavailableReason =
          repoRes.status === 451
            ? 'Repositório indisponível por notificação legal (HTTP 451).'
            : 'Repositório não encontrado ou tornado privado (HTTP 404).';

        generatedStore.projects[project.slug] = {
          ...(previous ?? {
            stars: 0,
            forks: 0,
            openIssues: 0,
            language: 'Unknown',
            lastCommitAt: nowIso,
          }),
          fetchedAt: nowIso,
          error: unavailableReason,
        };

        const eventId = `evt-status-${project.slug}-${nowIso.slice(0, 10)}`;
        if (!historyEvents.some((e) => e.id === eventId)) {
          historyEvents.unshift({
            id: eventId,
            slug: project.slug,
            projectName: project.name,
            type: 'status-change',
            titlePt: `${project.name} ficou indisponível no GitHub`,
            titleEn: `${project.name} became unavailable on GitHub`,
            detailPt: unavailableReason,
            detailEn: unavailableReason,
            timestamp: nowIso,
            url: project.repoUrl,
          });
        }
        continue;
      }

      if (!repoRes.ok) {
        console.warn(`[github] Status ${repoRes.status} para ${project.slug}; mantendo snapshot anterior.`);
        continue;
      }

      const repoData = (await repoRes.json()) as {
        stargazers_count: number;
        forks_count: number;
        open_issues_count: number;
        language: string | null;
        pushed_at: string;
        archived: boolean;
      };

      let latestRelease = previous?.latestRelease ?? null;
      try {
        const relRes = await fetchWithRetry(
          `https://api.github.com/repos/${ghCoords.owner}/${ghCoords.repo}/releases/latest`,
          {
            headers: {
              Accept: 'application/vnd.github+json',
              'User-Agent': 'PortHub-DataPipeline/1.0',
              ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
            },
          },
          2
        );
        if (relRes.ok) {
          const relJson = (await relRes.json()) as {
            tag_name?: string;
            published_at?: string;
            html_url?: string;
          };
          if (relJson.tag_name && relJson.published_at && relJson.html_url) {
            latestRelease = {
              tag: relJson.tag_name,
              publishedAt: new Date(relJson.published_at).toISOString(),
              url: relJson.html_url,
            };
          }
        }
      } catch {
        // Ignora erro de release se repositório não usar GitHub Releases
      }

      const decompProgress = project.decompDevPath
        ? await fetchDecompProgress(project.decompDevPath, previous?.decompProgress)
        : previous?.decompProgress;

      // Detecta nova release para o histórico
      if (latestRelease && latestRelease.tag !== previous?.latestRelease?.tag) {
        const relEventId = `evt-rel-${project.slug}-${latestRelease.tag}`;
        if (!historyEvents.some((e) => e.id === relEventId)) {
          historyEvents.unshift({
            id: relEventId,
            slug: project.slug,
            projectName: project.name,
            type: 'new-release',
            titlePt: `Nova release ${latestRelease.tag} em ${project.name}`,
            titleEn: `New release ${latestRelease.tag} for ${project.name}`,
            detailPt: `Versão ${latestRelease.tag} publicada no repositório oficial.`,
            detailEn: `Version ${latestRelease.tag} published on the official repository.`,
            timestamp: latestRelease.publishedAt,
            url: latestRelease.url,
          });
        }
      }

      // Detecta marco de 1.000 estrelas
      const prevThousand = Math.floor((previous?.stars ?? 0) / 1000);
      const currThousand = Math.floor(repoData.stargazers_count / 1000);
      if (currThousand > prevThousand && currThousand >= 1) {
        const starEventId = `evt-stars-${project.slug}-${currThousand}k`;
        if (!historyEvents.some((e) => e.id === starEventId)) {
          historyEvents.unshift({
            id: starEventId,
            slug: project.slug,
            projectName: project.name,
            type: 'star-milestone',
            titlePt: `${project.name} ultrapassou ${currThousand}.000 estrelas no GitHub`,
            titleEn: `${project.name} surpassed ${currThousand},000 stars on GitHub`,
            detailPt: `O projeto atingiu ${repoData.stargazers_count.toLocaleString('pt-BR')} estrelas.`,
            detailEn: `The project reached ${repoData.stargazers_count.toLocaleString('en-US')} stars.`,
            timestamp: nowIso,
            url: project.repoUrl,
          });
        }
      }

      generatedStore.projects[project.slug] = {
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        openIssues: repoData.open_issues_count,
        language: repoData.language || previous?.language || 'C++',
        lastCommitAt: repoData.pushed_at
          ? new Date(repoData.pushed_at).toISOString()
          : previous?.lastCommitAt || nowIso,
        latestRelease,
        ...(decompProgress !== undefined ? { decompProgress } : {}),
        fetchedAt: nowIso,
        ...(repoRes.headers.get('etag') ? { etag: repoRes.headers.get('etag')! } : {}),
      };
    } catch (error) {
      console.warn(`[pipeline] Falha isolada ao atualizar ${project.slug}:`, error);
    }
  }

  generatedStore.lastUpdatedAt = nowIso;
  GeneratedStoreSchema.parse(generatedStore);
  await fs.writeFile(GENERATED_PATH, JSON.stringify(generatedStore, null, 2) + '\n', 'utf-8');

  const trimmedHistory = historyEvents.slice(0, 60);
  z.array(HistoryEventSchema).parse(trimmedHistory);
  await fs.writeFile(HISTORY_PATH, JSON.stringify(trimmedHistory, null, 2) + '\n', 'utf-8');

  const discovered = await discoverPcgwCandidates(projects);
  if (discovered.length > 0) {
    z.array(CandidateProjectSchema).parse(discovered);
    await fs.writeFile(CANDIDATES_PATH, JSON.stringify(discovered, null, 2) + '\n', 'utf-8');
  }

  console.log(`[PORTHUB] Pipeline concluído com sucesso em ${nowIso}.`);
}

main().catch((err) => {
  console.error('[PORTHUB] Erro fatal na validação final do pipeline:', err);
  process.exit(1);
});
