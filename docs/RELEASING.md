# Releasing

## Repository And Package

The source repository is [btfranklin/ship-shape](https://github.com/btfranklin/ship-shape).
Its default branch is `main`. The npm package name is `ship-shape`, and its
current version is `0.1.0`.

The npm package is not yet published. A public registry query on 2026-10-03
returned `E404` for that name. This check does not reserve the name. Repeat it
immediately before npm publication.

The repository uses the MIT license. The author and public repository URLs are
set in `package.json`. The README uses public GitHub URLs for its banner and
reference links, so it does not need files outside the repository.

## Release Workflows

- [CI](../.github/workflows/ci.yml) validates pushes and pull requests with
  read-only repository access.
- [Create Draft Release](../.github/workflows/create-draft-release.yml) creates
  draft notes for pushed `v*.*.*` tags through Release Notes Scribe. It checks
  out full history and needs `contents: write` to create the draft.
- Set the `OPENAI_API_KEY` repository secret before pushing a release tag. The
  library and its CI tests do not need this key.
- Review the draft and release evidence before publishing a GitHub Release.
  Validation and draft creation run independently.
- No npm publishing workflow is configured. Publishing a GitHub Release does
  not upload an npm package.

These files follow the shared release format used by the author's public
projects. Use four-space YAML mapping indentation and the shared sequence
layout. For a job's `steps`, use twelve spaces before `-` and fourteen before
item keys such as `with`. Python, PyPI, and PDM workflow rules do not apply to
this TypeScript package.

All instructions and workflow files needed by this project are in this
repository. A standalone clone does not need a parent workspace or sibling
repository.

## Banner

The [banner source record](../.github/social%20preview/README.md) contains the
image-generation prompt. The banner is promotional artwork, not library output.
The [1280 by 640 JPEG](../.github/social%20preview/ship_shape_social_preview.jpg)
can also be uploaded as the repository social preview in GitHub settings.

## Prepare A Release

1. Set the intended version in `package.json` and `package-lock.json`.
2. Run the full local check:

   ```sh
   npm ci
   npx playwright install chromium
   npm run validate
   npm pack --dry-run
   ```

3. Inspect the archive file list. It must contain the public `dist/` exports,
   declarations, README, license, and package metadata. It must not contain
   credentials, tests, or playground files.
4. Commit the reviewed release preparation. The tag must be `v` followed by
   the package version; for example, version `0.1.0` uses `v0.1.0`.
5. With approval to release, push the commit and its tag. Wait for CI and the
   `Create Draft Release` workflow. Review the draft notes and validation
   evidence, then publish the GitHub Release when approved.

There is no automatic npm upload at this stage. Publishing a GitHub Release
will not publish the npm package.

## npm Publication Setup

Complete these steps if the public release will include an npm package:

1. Recheck the package name and confirm the account that will own it. If a
   different name is needed, update package metadata and public examples before
   building the release.
2. Confirm the repository URLs and public README image link.
3. Prepare and inspect the exact archive with `npm pack`. Keep this archive for
   the approved upload. Do not rebuild it between approval and upload.
4. Check npm's current first-publication requirements. A package that does not
   yet exist can need an initial authenticated upload before package-level
   trust can be configured. Obtain approval for the exact name, version,
   archive, registry, and public access before that upload.
5. Configure npm Trusted Publishing for the confirmed GitHub owner, repository,
   workflow filename, and environment. Confirm these values in npm settings.
6. Add a publishing workflow triggered by `release.published`. Use a GitHub
   hosted runner with a compatible Node.js and npm pair. Verify that the tag
   matches the package version, run validation, and preserve the exact archive
   for the publishing job. That job needs `id-token: write`; ordinary
   validation needs read-only repository access.
7. Publish the preserved archive. Verify the registry version, integrity,
   provenance where applicable, and a clean consumer installation.

Use the current [npm Trusted Publishing guide](https://docs.npmjs.com/trusted-publishers/)
when configuring this workflow. Registry trust and the first upload are external
settings and actions; they are not established by these local files.
