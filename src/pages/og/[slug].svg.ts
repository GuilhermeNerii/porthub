import type { APIRoute } from 'astro';
import { getHydratedProjects, getCategoryLabel } from '../../lib/projects';

export function getStaticPaths() {
  const projects = getHydratedProjects();
  return projects.map((project) => ({
    params: { slug: project.slug },
    props: { project },
  }));
}

export const GET: APIRoute = ({ props }) => {
  const { project } = props as { project: ReturnType<typeof getHydratedProjects>[number] };
  const category = getCategoryLabel(project.category, 'pt');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#090C12" />
    <rect x="36" y="36" width="1128" height="558" rx="16" fill="#0F141E" stroke="#00F0FF" stroke-width="2" />
    <text x="80" y="115" fill="#00F0FF" font-family="monospace" font-size="24" font-weight="bold">
      &gt;_ PORTHUB // PRESERVATION TELEMETRY
    </text>
    <text x="80" y="230" fill="#ECF2F8" font-family="sans-serif" font-size="52" font-weight="bold">
      ${project.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}
    </text>
    <text x="80" y="290" fill="#9CA8BA" font-family="monospace" font-size="28">
      ${project.game.replace(/&/g, '&amp;').replace(/</g, '&lt;')} [${project.originalPlatform}]
    </text>
    <rect x="80" y="350" width="360" height="54" rx="8" fill="#141B29" stroke="#10B981" />
    <text x="102" y="385" fill="#10B981" font-family="monospace" font-size="22" font-weight="bold">
      ${category.toUpperCase()}
    </text>
    <text x="80" y="490" fill="#00F0FF" font-family="monospace" font-size="26">
      ★ ${project.generated.stars} STARS   |   LANG: ${project.generated.language}
    </text>
    <text x="80" y="545" fill="#F59E0B" font-family="monospace" font-size="20">
      ⚖ Requer uma cópia legítima do jogo • Zero binários proprietários
    </text>
  </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
