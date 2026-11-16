# Portfolio

My portfolio site: [omarabdelghani.dev](https://omarabdelghani.dev).

The site opens on one page with three cards: Me, Experience, and Side projects. Click a card and the page zooms into it. Each job and project is a slide, and each slide has an animated scene that shows how the work runs.

## Stack

- Plain TypeScript, no framework, no runtime dependencies.
- Canvas 2D for the scenes.
- Vite for the dev server and the build.
- Vitest for the tests.

## Run it

```bash
pnpm install
pnpm dev
```

Then open the URL that Vite prints.

## Test and build

```bash
pnpm test
pnpm build
```

The tests run every scene to its end at several screen sizes. They check that each scene finishes, shows every step, and draws nothing outside its canvas.

`pnpm build` type-checks the code and writes the site to `dist/`.

## Layout

| Path | What it holds |
|---|---|
| `index.html` | All the content: the overview, the Me page, and every slide. |
| `src/main.ts` | Routing, the zoom animation, the scene player, and the slide rail. |
| `src/style.css` | All the styles, with light and dark themes. |
| `src/scenes/` | One file per slide scene. `kit.ts` holds the shared helpers. |
| `src/scenes.test.ts` | The scene tests. |
| `public/` | Icons, the photo, the link preview image, and `CNAME`. |
| `scripts/icons.mjs` | Draws the PNG app icons from `public/favicon.svg`. |

## Add a slide

1. Add an `<article class="slide">` to `index.html`. Copy an existing slide for the structure.
2. Add its scene in `src/scenes/`, and register it in `src/scenes/index.ts`.
3. Update the slide count in `src/scenes.test.ts`.

## Deploy

Every push to `main` runs the tests, builds the site, and publishes it to GitHub Pages. See `.github/workflows/deploy.yml`. The custom domain comes from `public/CNAME`.
