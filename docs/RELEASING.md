# Releasing

## Distribution

Ship Shape is distributed as built `.tgz` package archives attached to GitHub
Releases. Its package name stays `ship-shape`. npm registry publication,
registry-name reservation, and Trusted Publishing are not part of this process.

The source repository is [btfranklin/ship-shape](https://github.com/btfranklin/ship-shape).
Its default branch is `main`. Read the version from `package.json`.

Consumer install commands and coding-agent instructions are in the
[README installation guide](https://github.com/btfranklin/ship-shape#installation).
`package.json` has `private: true` to prevent npm registry uploads. This does not
make the GitHub repository private or prevent archive installation.

## Repository Configuration

- [CI](../.github/workflows/ci.yml) validates pushes and pull requests with
  read-only repository access.
- [Package Release](../.github/workflows/package-release.yml) runs when a
  `v*.*.*` tag is pushed. It checks that the tag and lockfile match the package
  version, runs the full validation gate, builds the package, and checks that
  exact archive in a clean consumer application.
- The workflow attaches the checked archive to a draft GitHub Release. It uses
  GitHub's generated release notes and built-in token. No repository API-key
  secret or npm publishing credentials are needed.
- A rerun can replace an asset in an existing draft. It refuses to change a
  published release. Correct a published package with a new version and tag.
- Issues, Actions, and Releases are used. Wiki, project boards, discussions,
  and Pages are disabled. Documentation stays in the repository.

Workflow files use four-space YAML mapping indentation and the shared sequence
layout. For a job's `steps`, use twelve spaces before `-` and fourteen before
item keys such as `with`. Python, PyPI, and PDM rules do not apply here.
A standalone clone does not need a parent workspace or sibling repository.

## Prepare And Release

1. Set the intended version in `package.json` and `package-lock.json`.
2. Update the README archive filename if the version changes.
3. Run the full local check:

   ```sh
   npm ci
   npx playwright install chromium
   npm run validate
   ```

4. Commit the reviewed changes. With approval, push the release commit to
   `main` and confirm that CI passes on that exact commit.
5. With approval to release, create and push a tag at the reviewed commit:

   ```sh
   ship_shape_version=$(node -p "require('./package.json').version")
   ship_shape_tag="v${ship_shape_version}"
   git tag "$ship_shape_tag"
   git push origin "$ship_shape_tag"
   ```

6. Wait for the Package Release workflow to pass. Review its draft notes,
   source commit, version, and `ship-shape-<version>.tgz` asset.
7. Publish the draft when approved. Confirm that the version-specific asset
   URL works without authentication. Install from that URL in a fresh
   application and run its normal checks.

The workflow does not publish the draft automatically. GitHub's automatic
source ZIP and tar archives do not replace the compiled `.tgz` asset.

## Local Archive Checks

To build and check an archive without creating a release:

```sh
npm pack
ship_shape_version=$(node -p "require('./package.json').version")
ship_shape_archive="ship-shape-${ship_shape_version}.tgz"
npm run test:package -- "$ship_shape_archive"
tar -tzf "$ship_shape_archive"
```

`prepack` clears build output and compiles JavaScript and declarations.
The archive contains public `dist/` exports, package metadata, README, and the
MIT license. It excludes credentials, tests, and playground files. The package
check installs the supplied archive without rebuilding it and tests runtime
imports, TypeScript declarations, and the README Node renderer.

## Banner

The [banner source record](../.github/social%20preview/README.md) contains the
image-generation prompt. The banner is promotional artwork, not library output.
The [1280 by 640 JPEG](../.github/social%20preview/ship_shape_social_preview.jpg)
can also be uploaded as the repository social preview in GitHub settings.
