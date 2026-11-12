# Third-party and usage rights

The [MIT License](LICENSE) applies to Heute's own project code. It does not replace
the licenses of third-party libraries, media, brands or documentation.
Review date: November 12, 2026.

## Icons and background image

- **selfh.st/icons**, selfh.st and the respective contributors: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  [Source and license](https://github.com/selfhst/icons/tree/87a5dfd901a341e271eb453ffebce6c5a88c308e).
  `shared/selfhst-index.json` is a catalog prepared for search; icons are loaded unchanged via jsDelivr.
  The license grants no trademark rights to the depicted product logos.
- **Lucide**, Lucide Contributors and Feather Contributors: [ISC/MIT notices of the project](https://github.com/lucide-icons/lucide/blob/main/LICENSE).
  The Iconify collection reports ISC. The Feather notices included upstream must also be respected upon distribution.
- `public/icon.svg` and the derived `public/apple-touch-icon.png` were newly created for Heute and are MIT-licensed.

## Weather and other services

Weather data comes from [Open-Meteo](https://open-meteo.com/) under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Temperatures are rounded
and data is selected for the widget. The attribution appears directly in the widget.
The [free API](https://open-meteo.com/en/terms) is intended for non-commercial use
and rate-limited. The license of the Open-Meteo server is distinct from the data
license; the server code is not bundled here.

RSS content, uploaded images and the content fetched via Nextcloud or Home Assistant
remain under the rights of their respective authors. A feed or a reachable URL is not
a general redistribution license.

## Software and container

`bun.lock` pins the dependencies. `bun scripts/collect-licenses.mjs` collects
package metadata and bundled license/NOTICE files into `.licenses/`.
The Docker build runs the script on its own target platform and copies the
collection to `/app/licenses/dependencies`. It also contains build tools and is
therefore broader than the actual runtime scope. The collection is an inventory,
not an automatic license clearance.

The direct JavaScript dependencies mostly report MIT; TypeScript and sharp report
Apache-2.0, the Lucide collection ISC. Only the MIT packages of FullCalendar are
used, no premium/scheduler packages.

Of particular note:

- **sharp/libvips:** sharp is Apache-2.0, the native libvips packages and parts
  of their libraries are LGPL-3.0-or-later or further licenses. See the README and
  `versions.json` of the respective `@img/sharp-libvips-*` package as well as
  [sharp-libvips](https://github.com/lovell/sharp-libvips). Before public binary
  distribution, the appropriate license texts, corresponding sources and the
  conditions for interchangeability of the libraries must be clarified.
- **Lightning CSS:** MPL-2.0; here a build tool. Changes to MPL files and the
  redistribution of the tool require separate consideration.
- **caniuse-lite:** CC BY 4.0. **node-forge:** either BSD-3-Clause or GPL-2.0;
  an alternative GPL statement does not automatically imply a GPL obligation for Heute.
- **Bun and Debian in the base image:** have their own license and source obligations.
  The npm inventory does not cover these layers. Before publication, the actually
  built Linux image including native components must be reviewed.

## Uncleared materials

Videos and posters without documented redistribution rights as well as the previous
Lens map were removed from the currently distributable inventory. Their historical
copies are therefore not deleted from Git. The locally stored originals under
`.local-unlicensed-assets/` are excluded from Git and Docker.

The checked-in `.agents/skills/` are third-party development documentation. The MIT
license of Heute does not cover them. In particular, copied Apple HIG texts and skills
without bundled license texts must be clarified separately or excluded from the
inventory and history before a public mirror.
