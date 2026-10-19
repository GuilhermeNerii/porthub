import { describe, it, expect } from 'vitest';
import { getHydratedProjects, getHistoryEvents } from '../src/lib/projects';
import { ProjectSchema } from '../src/data/schema';

describe('PORTHUB — Validação Estrita de Dados e Conformidade Legal', () => {
  it('carrega e valida todos os 25 projetos do catálogo sem erros de schema', () => {
    const projects = getHydratedProjects();
    expect(projects.length).toBeGreaterThanOrEqual(25);

    const requiredSlugs = [
      'gow3-pc',
      'sotc-pc',
      'bloodborne-pc-deadinside28',
      'bloodborne-pc-supermedo',
    ];
    for (const slug of requiredSlugs) {
      expect(projects.some((p) => p.slug === slug)).toBe(true);
    }
  });

  it('garante que todos os projetos exigem cópia legítima e usam HTTPS GitHub/GitLab', () => {
    const projects = getHydratedProjects();
    for (const project of projects) {
      expect(project.repoUrl).toMatch(/^https:\/\/(github|gitlab)\.com\//);
      expect(project.requirements.toLowerCase()).toMatch(/cópia legítima|dump legítimo|rom original/);
    }
  });

  it('rejeita automaticamente projetos sem aviso de cópia legítima ou com links de pirataria', () => {
    const invalidProject = {
      slug: 'invalid-port',
      name: 'Invalid Port',
      game: 'Some Game',
      originalPlatform: 'PS4',
      category: 'hybrid-port',
      repoUrl: 'https://github.com/user/repo',
      summaryPt: 'Clique aqui para download iso direto no mediafire.com',
      summaryEn: 'Valid summary in English with enough characters.',
      requirements: 'Basta baixar e jogar',
      tags: ['ps4'],
      status: 'active',
      firstSeen: '2026-10-19',
    };

    const result = ProjectSchema.safeParse(invalidProject);
    expect(result.success).toBe(false);
  });

  it('valida o histórico de eventos em ordem cronológica decrescente', () => {
    const events = getHistoryEvents();
    expect(events.length).toBeGreaterThan(0);
    for (let i = 1; i < events.length; i++) {
      expect(new Date(events[i - 1].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(events[i].timestamp).getTime()
      );
    }
  });
});
