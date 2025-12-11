# Changelog

## [0.5.1](https://github.com/boneskull/modestbench/compare/modestbench-v0.5.0...modestbench-v0.5.1) (2025-12-11)


### Bug Fixes

* **stats:** calculate margin of error as relative percentage ([91c5d75](https://github.com/boneskull/modestbench/commit/91c5d75a222c0ce2188ea98909f1af12c0923675))

## [0.5.0](https://github.com/boneskull/modestbench/compare/modestbench-v0.4.0...modestbench-v0.5.0) (2025-12-09)


### Features

* **adapters:** add test framework adapters for node:test, Mocha, and AVA ([#157](https://github.com/boneskull/modestbench/issues/157)) ([f4f00e7](https://github.com/boneskull/modestbench/commit/f4f00e7a0d356455eba08840ad8b01ec4e155822))


### Bug Fixes

* **deps:** update dependency tinybench to v6 ([0d40694](https://github.com/boneskull/modestbench/commit/0d406941a587f393de033e923fccca22a097eb40))
* **deps:** update tinybench-engine for tinybench v6 ([d19fcd9](https://github.com/boneskull/modestbench/commit/d19fcd98fde626257707919817a6e1be3ec97e34))

## [0.4.0](https://github.com/boneskull/modestbench/compare/modestbench-v0.3.3...modestbench-v0.4.0) (2025-12-05)


### Features

* **reporters:** display iteration counts inline with low-count warnings ([e1bf06a](https://github.com/boneskull/modestbench/commit/e1bf06a99f6d8e488fb1c69c6ae983e2bfa2a641))


### Bug Fixes

* **deps:** update dependency glob to v11.1.0 [security] ([#125](https://github.com/boneskull/modestbench/issues/125)) ([7e14a8b](https://github.com/boneskull/modestbench/commit/7e14a8bd27e72849766b9e84a9bf178764265b11))
* **deps:** update dependency glob to v13 ([#138](https://github.com/boneskull/modestbench/issues/138)) ([b63ab6a](https://github.com/boneskull/modestbench/commit/b63ab6a9979296d9fa32ce5f8774fe53a3f777dc))
* **deps:** update dependency zod to v4.1.13 ([#143](https://github.com/boneskull/modestbench/issues/143)) ([538ccf2](https://github.com/boneskull/modestbench/commit/538ccf241f870e78fe02bc89d791e558ba0b61e3))
* **init:** init templates now use proper default .modestbench/ dir for output ([a393236](https://github.com/boneskull/modestbench/commit/a393236e71c87502275e3e68f74bb1fdae4f8fd2))
* **README:** fix wrong options and path in README.md ([ea7caa4](https://github.com/boneskull/modestbench/commit/ea7caa46c53bd2bb70d67ecefec999ea0e14c425)), closes [#104](https://github.com/boneskull/modestbench/issues/104) [#109](https://github.com/boneskull/modestbench/issues/109)
* **run:** suite-level errors now caught properly and return non-zero exit code ([fba7a8a](https://github.com/boneskull/modestbench/commit/fba7a8a568b3863b40b04ca05469935c5db32ec7))

## [0.3.3](https://github.com/boneskull/modestbench/compare/modestbench-v0.3.2...modestbench-v0.3.3) (2025-11-03)


### Bug Fixes

* **deps:** update dependency minimatch to v10.1.1 ([#90](https://github.com/boneskull/modestbench/issues/90)) ([a3b77df](https://github.com/boneskull/modestbench/commit/a3b77df4f5b8464734a24df8eafae02365035ae1))

## [0.3.2](https://github.com/boneskull/modestbench/compare/modestbench-v0.3.1...modestbench-v0.3.2) (2025-10-30)


### Bug Fixes

* output dir and multiple reporter issues ([3f10a0d](https://github.com/boneskull/modestbench/commit/3f10a0dfff93ce8cb5c423a612a1b780bdaa7dad))

## [0.3.1](https://github.com/boneskull/modestbench/compare/modestbench-v0.3.0...modestbench-v0.3.1) (2025-10-29)


### Bug Fixes

* fix engine and reporter problems ([b4a14f3](https://github.com/boneskull/modestbench/commit/b4a14f3eac2600752939c295935901091843bf00))

## [0.3.0](https://github.com/boneskull/modestbench/compare/modestbench-v0.2.0...modestbench-v0.3.0) (2025-10-28)


### Features

* add analyze command for code profiling and benchmark discovery ([330b345](https://github.com/boneskull/modestbench/commit/330b345493fc43ba6e00d64c245e2a84fd734e6d))
* add performance budgets ([367c554](https://github.com/boneskull/modestbench/commit/367c5542efea8bab7a64d22728b2ea793de91f99))
* implement --bail ([#82](https://github.com/boneskull/modestbench/issues/82)) ([69d4327](https://github.com/boneskull/modestbench/commit/69d4327ee9327ab5e6076654e79dd4a21f15770a))


### Bug Fixes

* **deps:** pin dependency tinybench to 5.1.0 ([#81](https://github.com/boneskull/modestbench/issues/81)) ([1be5bbe](https://github.com/boneskull/modestbench/commit/1be5bbe332545eea8d25143f61492f87cbb2089d))
* **deps:** update dependency tinybench to v5.1.0 ([#76](https://github.com/boneskull/modestbench/issues/76)) ([cbd763c](https://github.com/boneskull/modestbench/commit/cbd763ca7d7335f9b3e7e4cda2217160b76e366c))
* **deps:** upgrade to tinybench@5.1.0 ([6668a38](https://github.com/boneskull/modestbench/commit/6668a38c1ea737320a132efd884a57a4c5f91a25))
* fix bin script ([68155e9](https://github.com/boneskull/modestbench/commit/68155e93a19cd88fa8add5fad4e2baae356eaba0))
* resolve merge conflict issues and test failures ([ab1e288](https://github.com/boneskull/modestbench/commit/ab1e288cbe11d729266fd74dc14dedc58a01bf27))
* resolve test failures and improve default behavior ([a61d798](https://github.com/boneskull/modestbench/commit/a61d798127ca58eac4ef2f3e03944703459dda31))
* resolve TypeScript type errors in budget transformation ([b8f2155](https://github.com/boneskull/modestbench/commit/b8f215533829e533515c7af1f8396aea71517c10))

## [0.2.0](https://github.com/boneskull/modestbench/compare/modestbench-v0.1.0...modestbench-v0.2.0) (2025-10-26)


### Features

* add --output-file CLI option ([#66](https://github.com/boneskull/modestbench/issues/66)) ([09bb5ae](https://github.com/boneskull/modestbench/commit/09bb5ae7468c9d5eb9d1e9641c58350a5b3856dd))
* **history:** implement trend analysis and comparison ([#64](https://github.com/boneskull/modestbench/issues/64)) ([acf7dda](https://github.com/boneskull/modestbench/commit/acf7ddaa91f7ae242c2a2df86fd610ce88f8ac91))
* **history:** implement trends and comparison ([acf7dda](https://github.com/boneskull/modestbench/commit/acf7ddaa91f7ae242c2a2df86fd610ce88f8ac91))
* implement date parsing, compare, and trend analysis core ([acf7dda](https://github.com/boneskull/modestbench/commit/acf7ddaa91f7ae242c2a2df86fd610ce88f8ac91))
* implement full trends command with visualizations ([acf7dda](https://github.com/boneskull/modestbench/commit/acf7ddaa91f7ae242c2a2df86fd610ce88f8ac91))

## [0.1.0](https://github.com/boneskull/modestbench/compare/modestbench-v0.0.3...modestbench-v0.1.0) (2025-10-24)


### Features

* new-fangled errors ([dd9128d](https://github.com/boneskull/modestbench/commit/dd9128df0dea260af9d9216a310784cfe3b3126e))


### Bug Fixes

* **deps:** @pasqal-io/starlight-client-mermaid is now a dev dep ([82ecb85](https://github.com/boneskull/modestbench/commit/82ecb8555d9e58c630ad7c358b21be37c8bd68b9))
* **deps:** pin dependency @pasqal-io/starlight-client-mermaid to 0.1.0 ([#58](https://github.com/boneskull/modestbench/issues/58)) ([d167cf9](https://github.com/boneskull/modestbench/commit/d167cf95c0db583c72b605ea8b66a8d28118ed4d))
* **reporters:** it is a task, not a test ([07f9b5a](https://github.com/boneskull/modestbench/commit/07f9b5a91f847ebd57c4dfca285998b0a817c6b2))
* **reporters:** it is also a task even in the simple reporter ([592f7b4](https://github.com/boneskull/modestbench/commit/592f7b43a13a66ccbea6955808ea83614303f76e))

## [0.0.3](https://github.com/boneskull/modestbench/compare/modestbench-v0.0.2...modestbench-v0.0.3) (2025-10-23)


### Bug Fixes

* **cli:** fix error output when no benchmark files found ([ddc33b7](https://github.com/boneskull/modestbench/commit/ddc33b79d09957ff2fc6011671ae1fe2e3f5a076))
* **cli:** run is now default command ([a12dfe9](https://github.com/boneskull/modestbench/commit/a12dfe9a71ebf6998c22683be2a41bb53f57f21d))
* **cli:** set default benchmark pattern to bench/**/*.bench.ext ([524d260](https://github.com/boneskull/modestbench/commit/524d260f4163e05558a9a99bf270a8a60bc7766e))
* **reporters:** fix human reporter color ([b1dfa8c](https://github.com/boneskull/modestbench/commit/b1dfa8ce46fafd9eba2a0f264e8238a881f9b9b5))

## [0.0.2](https://github.com/boneskull/modestbench/compare/modestbench-v0.0.1...modestbench-v0.0.2) (2025-10-23)


### Bug Fixes

* update homepage ([1a2cc63](https://github.com/boneskull/modestbench/commit/1a2cc63137e4a4595536a6590fc3e4019cab8d9d))

## 0.0.1 (2025-10-23)


### Features

* add .cts and .mts TypeScript extension support ([fd4d3cc](https://github.com/boneskull/modestbench/commit/fd4d3ccfec18e8e9c3e037c96f0968e2191820c8))
* add directory path expansion and sensible defaults ([efe4408](https://github.com/boneskull/modestbench/commit/efe4408056940ced4b7d1a94dafe6b9ffd9f6796))
* add native TypeScript support for benchmark files ([673a61d](https://github.com/boneskull/modestbench/commit/673a61da38d628b1f875eeefb8480688b43afcf3))
* add simple reporter for non-TTY environments ([a90d570](https://github.com/boneskull/modestbench/commit/a90d570bad89d6187dcb37d52f304bf2b7df8bbd))
* add support for multiple file patterns and explicit file paths ([db1dc56](https://github.com/boneskull/modestbench/commit/db1dc5647b9d9dfeb908fc738f6b37cfcfcda29e))
* complete support for multiple file patterns ([36a97c4](https://github.com/boneskull/modestbench/commit/36a97c4e7da2608fb36a1f5891a3e5aea48b2746))
* config file schema and validation ([f4dfbb3](https://github.com/boneskull/modestbench/commit/f4dfbb3e645038a750f0b93a18401a47ab524637))
* consolidate benchmark file extensions into constants ([35fd77a](https://github.com/boneskull/modestbench/commit/35fd77ac403082574dd27369b8be2b6e9c066209))
* **core:** add --limit-by flag with smart defaults for benchmark limiting ([61503b1](https://github.com/boneskull/modestbench/commit/61503b147f12938cada9aae90a3fffe8bd69fefd))
* **core:** enable streamlined benchmark definition ([dc5a83c](https://github.com/boneskull/modestbench/commit/dc5a83c89269a49f480eb4fe398da79eaaa82bcb))
* **core:** introduce new "accurate" engine ([795ab1c](https://github.com/boneskull/modestbench/commit/795ab1c828298bc932b8193b6b14944816006a43))
* **core:** suites are now optional ([0fd83af](https://github.com/boneskull/modestbench/commit/0fd83af4bc17c6c14fe9946bf320cdc8ae366ed1))
* **core:** tag filtering! ([2d677c8](https://github.com/boneskull/modestbench/commit/2d677c8b7ea29a7d09781a40ea809dc6cf45d48e))
* implement verbose mode ([f5011bf](https://github.com/boneskull/modestbench/commit/f5011bfcd378f4847392ef57c0a266f52c6def07))
* **init:** add interactive .gitignore prompt for .modestbench/ ([299224f](https://github.com/boneskull/modestbench/commit/299224ff4f7409e23d5dd6f61cc28a25b79d8c68))
* update CLI to support directory paths and sensible defaults ([22721d8](https://github.com/boneskull/modestbench/commit/22721d87e6ba3dea9dbecbf36940066a86d27193))


### Bug Fixes

* **cli:** implement true quiet mode for --quiet flag ([70c3033](https://github.com/boneskull/modestbench/commit/70c3033bf91c275668cf281e769f162c92627d3e))
* **cli:** symlinks install now works ([1a5ec4e](https://github.com/boneskull/modestbench/commit/1a5ec4edf873670b6d8470cae2df0c0deea915e5)), closes [#4](https://github.com/boneskull/modestbench/issues/4)
* **core,reporters:** fix hanging timers ([fc21f32](https://github.com/boneskull/modestbench/commit/fc21f3293ef8bf15d6b4b869f68160838844959b))
* **core:** fix type errors ([f7e4512](https://github.com/boneskull/modestbench/commit/f7e4512246aeea3a6205cbb27f9321fda3a4b343))
* **core:** implement --iterations flag to control benchmark iteration count ([827d0a0](https://github.com/boneskull/modestbench/commit/827d0a0e1e73f0ca78c42499efb3c46155d4457c))
* **core:** remove env checks from engine ([245ae3e](https://github.com/boneskull/modestbench/commit/245ae3e71b7c2e555757dc7d8497b53f890cf874))
* correct tsx import path for TypeScript support ([38642ad](https://github.com/boneskull/modestbench/commit/38642adc79f8fbfb84dd2f12f86e85c998eb3f26))
* **deps:** fix tinybench dep ([9a9cb8e](https://github.com/boneskull/modestbench/commit/9a9cb8e0e1ec012a69a9e45f94ef3f79bc3675a4))
* **deps:** pin dependencies ([#5](https://github.com/boneskull/modestbench/issues/5)) ([2b20bce](https://github.com/boneskull/modestbench/commit/2b20bcebaccfb4e442045cb128b4065f64219979))
* **deps:** update dependency yargs to v18 ([#13](https://github.com/boneskull/modestbench/issues/13)) ([2686134](https://github.com/boneskull/modestbench/commit/268613480ad2ab46de11fea4f91644d732790ef2))
* **init:** library proj template does not enable CSV reporter ([32a2046](https://github.com/boneskull/modestbench/commit/32a204618f94c2bd9c0e7ed34b815c00feb1c28d))
* **loader:** validate benchmarks with zod ([f53d661](https://github.com/boneskull/modestbench/commit/f53d6611c8c0d5a752df9ecefac4d4ebe4acbd5b))
* **pkg:** add package.json to exports; fix files ([8563ac9](https://github.com/boneskull/modestbench/commit/8563ac9e38b529966b471eeeeea99db3c36c1a3c))
* quiet mode and TS loading ([de0db5e](https://github.com/boneskull/modestbench/commit/de0db5e1a51e4facef3150397d90ba039997ea94))
* **reporter:** human reporter improvements ([214afa9](https://github.com/boneskull/modestbench/commit/214afa9fbe549f12cff9aad3cb5eeb95794a141f))
* **reporters:** fix progress bar ([4143126](https://github.com/boneskull/modestbench/commit/4143126adc77d7d5ae6483b2a858fe63feb2ebc1))
* **reporters:** fix quiet mode ([5960b1b](https://github.com/boneskull/modestbench/commit/5960b1b7c353e5cf8583a614f36cdd39e06dc47e))
* **reporters:** make human reporter nice ([afba95f](https://github.com/boneskull/modestbench/commit/afba95f5d233a63a0c385e7e81a59b4722f73907))
