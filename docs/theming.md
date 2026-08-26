# Theming

The app ships two themes, **light** and **dark**, plus a `system` setting that
follows the OS. Pick one under ⚙ → Theme; the choice is stored in
`localStorage` under `faroe-hiking-settings`.

`system` is live: `src/hooks/useSettings.js` subscribes to
`prefers-color-scheme`, so switching the OS to dark switches the app without a
reload. The resolved theme lands in two places — `<html data-theme="light|dark">`
for CSS, and the `theme` prop for the components that style themselves in JS.

## Where colors live

There are two sources, and the split is not arbitrary:

| Source             | Styles                                                     | Why                                                           |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------- |
| `src/style.css`    | Everything in the DOM — panels, cards, buttons, map popups | CSS custom properties on `:root` / `:root[data-theme='dark']` |
| `src/lib/theme.js` | MapLibre layers and the Recharts elevation profile         | Both are configured from JS and can't read CSS variables      |

Everything else derives from those two. No component should introduce a hex
literal of its own.

### Adding or changing a color

- **DOM:** add the token to _both_ blocks at the top of `src/style.css` and use
  `var(--your-token)`. A token defined only in the light block silently keeps its
  light value in dark mode.
- **Map or chart:** add a named role to _both_ `light` and `dark` in
  `src/lib/theme.js`, then read it via `palette(theme)`. `setupCustomLayers()`
  applies these when the layers are created, and a theme switch recreates them
  (`map.setStyle()` wipes layers, images and paint overrides), so a role added
  there is picked up on the next swap without extra wiring.

### Roles that exist in both places

These have to move together — change one, change the other:

| Role                   | `src/lib/theme.js` | `src/style.css`                                                                           |
| ---------------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| Accent / selected hike | `accent`           | `--accent`                                                                                |
| Trail green            | `trail`            | `--trail`                                                                                 |
| Lodging amber          | `lodging`          | `--lodging-fg`, `--lodging-bg`                                                            |
| Track vertices         | `vertex`           | `--info`                                                                                  |
| Page background        | —                  | `--page-bg` (mirrored in `THEME_COLOR` in `useSettings.js` for the mobile browser chrome) |

## The basemap

The two MapTiler styles are `outdoor-v2` and `outdoor-v2-dark` (`styleUrl()` in
`src/lib/mapStyle.js`). Neither is used raw: `greenifyStyle()` re-paints the
background, hillshade and grass fill afterwards, because the stock styles read
gray-brown at overview zooms and the Faroes are treeless moorland. Those values
are HSL literals in that function — they tune a third-party style rather than
name a role of ours, so they intentionally stay out of `theme.js`.
