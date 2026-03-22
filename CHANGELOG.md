# Changelog

## Unreleased

### Features

* Editor UI and Info sidebar help for **playa** internationalised in ten locales: en-US, zh-CN, es-ES, hi-IN, ar-EG, fr-FR, pt-BR, de-DE, ja-JP, ru-RU (follows the Node-RED editor language).
* **examples:** add bundled samples `examples/sounds/beep.wav` and `beep.mp3`, `examples/README.md`, flows `Play bundled beep.wav.json`, `Play bundled beep.mp3.json`, and `Play bundled beep compare wav and mp3.json`; script `scripts/encode-beep-mp3.mjs` to regenerate the MP3 from the WAV.

## [0.2.0](https://github.com/vergissberlin/node-red-contrib-play/compare/v0.1.0...v0.2.0) (2026-03-22)


### Features

* **examples:** add bundled sound sample and update README for clarity ([6e7e62d](https://github.com/vergissberlin/node-red-contrib-play/commit/6e7e62d7ea9eea67c20f3e2af7b6dac0878afe41))
* **localization:** add internationalization for playa node in 10 locales ([2695739](https://github.com/vergissberlin/node-red-contrib-play/commit/26957397be0f44922f6c35e9913655f8b68efab8))
* **localization:** add localization support for pt-BR, ru-RU, and zh-CN ([2695739](https://github.com/vergissberlin/node-red-contrib-play/commit/26957397be0f44922f6c35e9913655f8b68efab8))


### Miscellaneous Chores

* **changelog:** remove unnecessary blank lines and update README with contributing section ([14b0877](https://github.com/vergissberlin/node-red-contrib-play/commit/14b08771dba4ea97efcc0d6b1cbec3fcf95f568e))
* **package.json:** include 'locales' directory in package files ([2695739](https://github.com/vergissberlin/node-red-contrib-play/commit/26957397be0f44922f6c35e9913655f8b68efab8))
* **workflows:** update Node.js and action versions in CI workflows ([4e4d908](https://github.com/vergissberlin/node-red-contrib-play/commit/4e4d908cac05efa6d83b6bc11c78ab71e949545e))


### Documentation

* **CONTRIBUTING.md:** improve table formatting for clarity ([04bf55b](https://github.com/vergissberlin/node-red-contrib-play/commit/04bf55baa2fcb079afc98504d3b9f4002960ce3d))

## [0.1.0](https://github.com/vergissberlin/node-red-contrib-play/compare/v0.0.5...v0.1.0) (2026-03-21)

### Features

* Add release please ([579dcfc](https://github.com/vergissberlin/node-red-contrib-play/commit/579dcfc1503fed278faa9e5201531b3492745948))
* **package.json:** add proxyquire as a devDependency for mocking ([270faa4](https://github.com/vergissberlin/node-red-contrib-play/commit/270faa4322507e62ed036c144a21c58107abf79c))
* **package.json:** update test script to run play.test.js ([270faa4](https://github.com/vergissberlin/node-red-contrib-play/commit/270faa4322507e62ed036c144a21c58107abf79c))
* **release-please:** add release-please-config.json for custom changelog sections and release type configuration ([9591913](https://github.com/vergissberlin/node-red-contrib-play/commit/9591913697c437345839977d8395a6652fa74631))
* **release-please:** add release-please-manifest.json to track versioning ([9591913](https://github.com/vergissberlin/node-red-contrib-play/commit/9591913697c437345839977d8395a6652fa74631))
* Update .gitignore and package.json to include pnpm store and specify files for packaging ([f3d5f2d](https://github.com/vergissberlin/node-red-contrib-play/commit/f3d5f2d4f9a080a9487147bb57977c5cfd40cedf))
* **workflows:** enhance release-please workflow to include npm publishing step ([102f23a](https://github.com/vergissberlin/node-red-contrib-play/commit/102f23aaffbdf9a30d4e4b83ccea22c4af0e04ef))

### Bug Fixes

* **workflows:** clean up release-please workflow comments for clarity ([065d3e1](https://github.com/vergissberlin/node-red-contrib-play/commit/065d3e197488c0a18fb0a995b1b75fe5fef13dcc))

### Miscellaneous Chores

* **main:** release 0.1.0 ([31b2083](https://github.com/vergissberlin/node-red-contrib-play/commit/31b2083dff7aa070be1b1523194b98e900d4de51))
* **main:** release 0.1.0 ([abb2350](https://github.com/vergissberlin/node-red-contrib-play/commit/abb235019a7d082d5a161c4d30c04b3da88c4c4c))
* **package.json:** specify node engine version &gt;=18 ([270faa4](https://github.com/vergissberlin/node-red-contrib-play/commit/270faa4322507e62ed036c144a21c58107abf79c))
* **release-please:** update workflow to use external config files for release management ([9591913](https://github.com/vergissberlin/node-red-contrib-play/commit/9591913697c437345839977d8395a6652fa74631))
* Update play-sound dependency to version 1.1.6 in package.json and pnpm-lock.yaml ([ccc8c24](https://github.com/vergissberlin/node-red-contrib-play/commit/ccc8c247b8d218a37e174cf887fff903b5726c84))

### Documentation

* **ci:** note autorelease label stuck state for release-please failures ([653c428](https://github.com/vergissberlin/node-red-contrib-play/commit/653c428ddb5f8b234f49c684f33090ee89c97cc1))
* **README.md:** expand documentation with detailed usage instructions ([cc83387](https://github.com/vergissberlin/node-red-contrib-play/commit/cc83387db2be578914016a274db7e05ae921efb3))
* **README.md:** fix typos and formatting for improved readability and consistency ([ebfafe0](https://github.com/vergissberlin/node-red-contrib-play/commit/ebfafe0ef0a06e884402586e93d6aefa03616948))

## [0.1.0](https://github.com/vergissberlin/node-red-contrib-play/compare/v0.0.4...v0.1.0) (2026-03-21)

### Features

* Add release please ([579dcfc](https://github.com/vergissberlin/node-red-contrib-play/commit/579dcfc1503fed278faa9e5201531b3492745948))
* Update .gitignore and package.json to include pnpm store and specify files for packaging ([f3d5f2d](https://github.com/vergissberlin/node-red-contrib-play/commit/f3d5f2d4f9a080a9487147bb57977c5cfd40cedf))
