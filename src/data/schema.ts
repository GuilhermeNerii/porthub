import { z } from 'zod';

export const CategoryEnum = z.enum([
  'decomp',
  'static-recomp',
  'native-port',
  'hybrid-port',
  'emulation',
]);

export const ProjectStatusEnum = z.enum([
  'active',
  'stale',
  'archived',
  'unavailable',
]);

const FORBIDDEN_PIRACY_TERMS = /\b(download\s+rom|download\s+iso|mega\.nz|mediafire\.com|1fichier|torrent|magnet:\?)\b/i;

export const ProjectSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens.'),
  name: z.string().min(2).max(120),
  game: z.string().min(2).max(140),
  originalPlatform: z.string().min(2).max(50),
  category: CategoryEnum,
  repoUrl: z
    .string()
    .url()
    .regex(/^https:\/\/(github\.com|gitlab\.com)\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/, 'repoUrl deve apontar para um repositório oficial GitHub ou GitLab válido.'),
  officialSite: z.string().url().optional(),
  decompDevPath: z.string().optional(),
  summaryPt: z
    .string()
    .min(20)
    .max(600)
    .refine((val) => !FORBIDDEN_PIRACY_TERMS.test(val), 'Texto viola diretrizes antipirataria.'),
  summaryEn: z
    .string()
    .min(20)
    .max(600)
    .refine((val) => !FORBIDDEN_PIRACY_TERMS.test(val), 'Text violates anti-piracy policy.'),
  requirements: z
    .string()
    .min(10)
    .refine(
      (val) => val.toLowerCase().includes('cópia legítima') || val.toLowerCase().includes('dump legítimo') || val.toLowerCase().includes('rom original'),
      'Cada projeto deve exigir explicitamente uma cópia ou dump legítimo do jogo.'
    ),
  tags: z.array(z.string().min(1).max(32)).min(1).max(10),
  status: ProjectStatusEnum,
  firstSeen: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const LatestReleaseSchema = z.object({
  tag: z.string().min(1),
  publishedAt: z.string().datetime({ offset: true }),
  url: z.string().url(),
});

export const GeneratedProjectDataSchema = z.object({
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  openIssues: z.number().int().nonnegative(),
  language: z.string().min(1),
  lastCommitAt: z.string().datetime({ offset: true }),
  latestRelease: LatestReleaseSchema.nullable().optional(),
  decompProgress: z.number().min(0).max(100).optional(),
  fetchedAt: z.string().datetime({ offset: true }),
  etag: z.string().optional(),
  error: z.string().optional(),
});

export const GeneratedStoreSchema = z.object({
  lastUpdatedAt: z.string().datetime({ offset: true }),
  projects: z.record(z.string(), GeneratedProjectDataSchema),
});

export const HistoryEventSchema = z.object({
  id: z.string().min(4),
  slug: z.string().min(2),
  projectName: z.string().min(2),
  type: z.enum(['new-release', 'status-change', 'star-milestone', 'decomp-milestone', 'project-added']),
  titlePt: z.string().min(5),
  titleEn: z.string().min(5),
  detailPt: z.string().min(5),
  detailEn: z.string().min(5),
  timestamp: z.string().datetime({ offset: true }),
  url: z.string().url().optional(),
});

export const CandidateProjectSchema = z.object({
  game: z.string().min(1),
  portName: z.string().min(1),
  platform: z.string().min(1),
  originType: z.string().min(1),
  status: z.string().min(1),
  discoveredFrom: z.string().url(),
  discoveredAt: z.string().datetime({ offset: true }),
  notes: z.string().optional(),
});

export type Category = z.infer<typeof CategoryEnum>;
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;
export type Project = z.infer<typeof ProjectSchema>;
export type GeneratedProjectData = z.infer<typeof GeneratedProjectDataSchema>;
export type GeneratedStore = z.infer<typeof GeneratedStoreSchema>;
export type HistoryEvent = z.infer<typeof HistoryEventSchema>;
export type CandidateProject = z.infer<typeof CandidateProjectSchema>;

export interface HydratedProject extends Project {
  generated: GeneratedProjectData;
}
