import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const site = JSON.parse(await readFile(new URL('src/content/site.json', root), 'utf8'));

test('the portfolio is composed from one versioned JSON config', () => {
  assert.equal(site.schemaVersion, 1);
  assert.equal(site.defaultLocale, 'es');
  assert.deepEqual(site.locales.map((locale) => locale.code), ['es', 'en']);
  assert.deepEqual(site.pages.map((page) => page.id), ['bourbon', 'minimal', 'forma', 'miga']);
  assert.equal(site.site.designLibrary, 'design-library/');
  assert.deepEqual(site.site.catalog.cards.map((card) => card.pageId), ['miga', 'pr-reformas', 'bourbon', 'minimal', 'forma', 'booking-bot']);
  assert.equal(site.site.catalog.cards.find((card) => card.pageId === 'miga').featured, false);
  const reformas = site.site.catalog.cards.find((card) => card.pageId === 'pr-reformas');
  assert.equal(reformas.externalHref, 'https://prreformas.es/');
  assert.equal(reformas.image, 'assets/catalog_pr_reformas.avif');
  assert.ok(reformas.translations.en.description);
  const bookingBot = site.site.catalog.cards.find((card) => card.pageId === 'booking-bot');
  assert.equal(bookingBot.status, 'working');
  assert.equal(bookingBot.externalHref, undefined);
  assert.equal(bookingBot.translations.en.status, 'working');
  assert.equal(site.site.team.members.length, 2);
  assert.deepEqual(site.site.team.members.map((member) => member.id), ['victor', 'alvaro']);
  assert.equal(site.site.team.members.find((member) => member.id === 'alvaro').linkedin, 'https://www.linkedin.com/in/alvaro-cebrian-urue%C3%B1a-810249265/');
  assert.equal(site.site.team.members.find((member) => member.id === 'victor').linkedin, 'https://www.linkedin.com/in/victor-rodriguez-178b3a175/');
  assert.equal(site.site.team.members.find((member) => member.id === 'alvaro').portfolio, 'https://cebrianalvaro9.github.io/porfolioWebAlvaroCebrian/');
  assert.match(site.site.team.members.find((member) => member.id === 'victor').description, /más de 6 años de experiencia/);
  assert.match(site.site.team.members.find((member) => member.id === 'victor').translations.en.description, /more than 6 years of experience/);
  assert.ok(site.site.team.translations.en.title);
  assert.ok(site.site.team.members.every((member) => member.translations?.en?.description));
  for (const page of site.pages) {
    assert.ok(page.header && page.sections.length && page.footer);
    assert.ok(page.metadata.translations.en.title);
    assert.ok(page.sections.every((block) => block.translations?.en));
  }
});

test('Spanish pages preserve their paths and English pages are generated under en', async () => {
  const pages = await Promise.all([
    'src/pages/bourbon/index.astro', 'src/pages/neon/index.astro', 'src/pages/minimal/index.astro',
    'src/pages/forma/index.astro', 'src/pages/miga/index.astro', 'src/pages/en/bourbon/index.astro', 'src/pages/en/neon/index.astro', 'src/pages/en/minimal/index.astro', 'src/pages/en/forma/index.astro', 'src/pages/en/miga/index.astro',
  ].map((path) => readFile(new URL(path, root), 'utf8')));
  assert.ok(pages.filter((page) => page.includes('SiteRenderer')).length >= 6);
  assert.match(pages[1], /Astro.redirect\('\/portfolio\/'\)/);
  assert.match(pages[6], /Astro.redirect\('\/portfolio\/en\/'\)/);
  assert.ok(pages.at(-1).includes('pageId="miga"'));
});

test('MIGA keeps its editorial menu, gallery and translations in the shared config', () => {
  const miga = site.pages.find((page) => page.id === 'miga');
  assert.equal(miga.path, 'miga/');
  assert.equal(miga.theme, 'miga');
  assert.equal(miga.dialogs?.length ?? 0, 0);
  const menu = miga.sections.find((block) => block.id === 'menu');
  const gallery = miga.sections.find((block) => block.id === 'universe');
  assert.equal(menu.props.layout, 'horizontal');
  assert.equal(menu.props.motion, 'scroll');
  assert.equal(menu.props.images.length, 8);
  assert.equal(gallery.props.layout, 'editorial');
  assert.equal(gallery.props.lightbox, true);
  assert.equal(gallery.props.images.length, 14);
  assert.equal(miga.sections.some((block) => block.type === 'FloatingImage'), false);
  assert.ok(menu.props.images.every((image) => image.price));
  assert.ok(miga.sections.every((block) => block.translations?.en));

  const catalogCard = site.site.catalog.cards.find((card) => card.pageId === 'miga');
  const about = miga.sections.find((block) => block.id === 'about');
  const sources = [
    catalogCard.image,
    miga.header.props.logoIcon,
    miga.sections.find((block) => block.id === 'hero').props.image,
    about.props.image,
    ...menu.props.images.map((image) => image.src),
    ...menu.translations.en.images.map((image) => image.src),
    ...gallery.props.images.map((image) => image.src),
    ...gallery.translations.en.images.map((image) => image.src),
  ].filter(Boolean);
  const expected = Array.from({ length: 24 }, (_, index) => `miga/miga-${String(index + 1).padStart(2, '0')}.png`);
  assert.deepEqual([...new Set(sources)].sort(), expected.sort());
});

test('the catalog card content is read from the shared config', async () => {
  const index = await readFile(new URL('src/pages/index.astro', root), 'utf8');
  const englishIndex = await readFile(new URL('src/pages/en/index.astro', root), 'utf8');
  const catalogComponent = await readFile(new URL('src/components/PortfolioCatalog.astro', root), 'utf8');
  assert.match(index, /siteConfig\.site\.catalog/);
  assert.match(englishIndex, /siteConfig\.site\.catalog/);
  assert.match(catalogComponent, /card\.externalHref/);
  assert.match(catalogComponent, /card\.status === 'working'/);
  assert.match(catalogComponent, /aria-disabled/);
  assert.match(catalogComponent, /card\.badge/);
  assert.match(catalogComponent, /team\.members/);
});
