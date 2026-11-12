# Changelog

## [0.7.3]

- Bundle each manual GitHub sync into one snapshot commit instead of transferring individual Forgejo commits. Preserve existing GitHub history and skip syncs when file contents are unchanged.

## [0.7.2]

- Add a manual Forgejo workflow to synchronize main to a configurable GitHub repository, with temporary token authentication and protection against concurrent destination updates.

## [0.7.1]

- Remove deployment-specific domains from Docker metadata, CI configuration and documentation.
- Derive the built-in Forgejo registry address and image path automatically from the workflow environment.
- Keep registry login credentials in a temporary Docker configuration and remove it after publishing.

## [0.7.0]

- The interface is now also available in English. A language switcher in the toolbar toggles between German and English; the choice is stored per device in a cookie.
- English pages live under `/en`, German remains under `/`. Date and calendar formatting, the greeting and Nuxt UI components (dialogs, search, calendar) follow the selected language.
- All interface strings are moved into `i18n/locales`; `<html lang>` and hreflang redirects are set automatically.

## [0.6.1]

- Videos receive a preview image (poster) on upload, which serves in the settings grid and as the wallpaper poster while loading.
- Shared media is no longer managed in a separate list: every library entry in the grid carries a delete icon in the corner for admins.
- Video backgrounds are loaded and played reliably when the page reloads (client-side rendering of the video element).

## [0.6.0]

- The "Blue and Orange" background (Martin Martz) and its license notice were removed entirely.
- Admins can now also upload and delete shared images and videos via the web interface; an existing name is confirmed before replacing.
- `./media/library` is mounted as a bind mount in `compose.yaml`, so files can be conveniently placed directly from the host.

## [0.5.0]

- Personal backgrounds support image uploads up to 8 MiB and MP4/WebM videos up to 64 MiB. Videos are served with HTTP range support.
- Media lives under `media/uploads` next to the SQLite file; existing image BLOBs are migrated into files automatically and without premature deletion.
- Admins can place shared images and videos directly in `media/library` or mount the folder as a bind mount. The selection refreshes when opening the settings.
- Tests cover migration, file and access protection, upload/replace/delete as well as video range requests.

## [0.4.1]

- GitHub Actions builds the Docker image, runs tests and types and checks the container healthcheck. Successful main/tag builds are published to GHCR with commit and branch/version tags; pull requests publish nothing.
- Third-party license texts are collected in the Docker image; open publication rights are documented.
- MIT license added for the project's own code; unlicensed video wallpapers and the Lens map removed, touch icon replaced by an own motif.
- Open-Meteo attribution added to the weather widget and the README reworked for the GitHub mirror.

## [0.4.0]

- The start page now consists of multiple pages, switchable by swiping, arrow keys or via the dots at the bottom. In edit mode, pages can be created, renamed, moved, deleted and their type changed. Pages are visible personally or for the family.
- A page is either a normal page (links plus widget rail), a widget page with a widget grid, or a fullscreen widget.
- The widget selection becomes a widget library: widgets can be added, removed and sorted per page. Each widget shows a scaled-down 16:9 preview with sample data in the library.
- Weather and news widgets can be rendered with sample data.
- The link, section and page forms consistently use Nuxt UI form elements.
- No content from the neighboring page bleeds through when switching pages.

## [0.3.1]

- The weather widget is flatter: smaller degree number, weather condition next to the temperature, and the Open-Meteo hint is gone.

## [0.3.0]

- The family calendar shows real events from a Home Assistant calendar. Configuration via `NUXT_HA_URL` and `NUXT_HA_TOKEN`; the calendars are loaded dynamically from Home Assistant.
- Via the gear in the widget, each family member selects per account which calendars appear, sets an icon per calendar and toggles grouping by day. Details open on click in a popup.
- The strength of the background overlay can be adjusted with a live preview. The settings are grouped by topic.
- Apple devices receive an icon for the home screen.
- The larger greeting adapts to Berlin time when the start page is open.

## [0.2.0]

- Admins can import multiple Pocket ID apps into a family section. The selection shows launch URLs and marks already present apps.
- The app tiles show matching selfh.st icons. Imported links keep their icon; for missing images a link icon appears.

## [0.1.5]

- The Mermaid pipeline diagram uses rounded nodes.

## [0.1.4]

- The pipeline status is shown as a dynamic Mermaid diagram in the Forgejo job summary.

## [0.1.3]

- The Docker pipeline flow is documented as a colored Mermaid diagram.

## [0.1.2]

- Docker images are pushed to the Forgejo package registry after a successful healthcheck.
- Forgejo 17 job summary with commit, tags and image digest.

## [0.1.1]

- The Docker build runs via a dedicated Forgejo runner with the label `docker-build` and Docker socket forwarding.

## [0.1.0]

- First version of the family start page with Pocket ID, personal favorites and shared app links.
- Weather, RSS news and an iCloud calendar link in the daily overview.
- Spotlight search for Nextcloud and Google as well as personal image and video backgrounds.
- Docker Compose operation and Docker build with Forgejo Actions.
