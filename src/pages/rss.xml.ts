import type { APIRoute } from 'astro';
import { getHistoryEvents } from '../lib/projects';

export const GET: APIRoute = ({ site }) => {
  const events = getHistoryEvents();
  const baseUrl = site ? site.toString().replace(/\/$/, '') : 'https://seu-usuario.github.io';

  const itemsXml = events
    .map(
      (ev) => `
    <item>
      <title><![CDATA[${ev.titlePt}]]></title>
      <link>${baseUrl}/projeto/${ev.slug}/</link>
      <guid isPermaLink="false">${ev.id}</guid>
      <pubDate>${new Date(ev.timestamp).toUTCString()}</pubDate>
      <description><![CDATA[${ev.detailPt}]]></description>
    </item>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>PORTHUB — Feed de Releases e Preservação de Jogos Clássicos</title>
    <link>${baseUrl}</link>
    <description>Atualizações autônomas de portes nativos, híbridos, recompilações estáticas e decompilações.</description>
    <language>pt-br</language>${itemsXml}
  </channel>
</rss>`;

  return new Response(xml.trim(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
