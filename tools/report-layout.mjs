import {readFile} from 'node:fs/promises';

export async function reportBody() {
  const source=await readFile(new URL('../public/report-bug/index.html',import.meta.url),'utf8');
  const main=source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if(!main)throw Error('The report form source has no main content');
  const original=main[1];
  if(!original.includes('id="report-form"')||!original.includes('id="image-canvas"'))throw Error('The report form source is incomplete');
  const intro='<div class="report-intro"><p class="label">ORCHARD STUDIOS</p><h1>Report a bug</h1><p>Describe what went wrong. You can attach a screenshot and draw on it to point out the problem.</p><p class="report-intro-note">Your report is shared privately with Orchard Studios.</p></div>';
  let content=original.replace(/<aside\s+class="intro">[\s\S]*?<\/aside>/i,intro);
  if(content===original)throw Error('The report introduction could not be replaced');
  content=content.replace(/<div\s+class="panel-heading">[\s\S]*?<\/div>/i,'');
  const originalIds=[...original.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  const renderedIds=[...content.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  if(originalIds.some(id=>!renderedIds.includes(id))||new Set(renderedIds).size!==renderedIds.length)throw Error('The report form controls changed during layout preparation');
  if(/<main\b|<header\b|<footer\b|class="(?:world-backdrop|masthead|mascot-art)"/i.test(content))throw Error('Standalone report layout leaked into the shared page');
  return `<link rel="stylesheet" href="./form.css"><div class="content-width report-page"><div class="report-content">${content}</div></div><script type="module" src="./app.js"></script>`;
}
