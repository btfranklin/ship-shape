# Releasing

## Current State

This repository is being prepared for its first public release. It has no Git
remote. Its npm package name is `ship-shape`, and its current version is
`0.1.0`. A public registry query on 2026-10-03 returned `E404` for that name.
This check does not reserve the name. Repeat it immediately before publication.

CI and draft release notes are configured locally. No npm publishing workflow
is configured. Local validation does not prove that GitHub Actions, repository
secrets, or npm permissions are configured.

## Before Making The Repository Public

1. Confirm the GitHub owner, repository name, and `main` default branch. Create
   the public repository and add its address as `origin` when publication is
   approved.
2. Add the confirmed `repository`, `homepage`, and `bugs` URLs to `package.json`.
   Do not use guessed addresses.
3. Replace the README's local banner link with the same raw GitHub URL format
   used by nearby public projects:

   ```text
   https://raw.githubusercontent.com/<owner>/<repo>/main/.github/social%20preview/ship_shape_social_preview.jpg
   ```

   The local link works in this repository before a remote exists. Use the
   public link before publishing to npm, because the archive does not include
   `.github/`. Add a CI badge after the workflow has a confirmed public URL.
4. Set `.github/social preview/ship_shape_social_preview.jpg` as the GitHub
   repository social preview. It is a 1280 by 640 JPEG. The
   [banner source record](../.github/social%20preview/README.md) contains its
   generation prompt. It is promotional artwork, not library output.
5. Confirm the MIT license and the author in `package.json`.
6. Set the `OPENAI_API_KEY` repository secret for draft release notes. The
   library and its CI tests do not need this key.
7. Push the reviewed branch when approved. Confirm that CI passes on GitHub
   before creating a release tag.

## Workflow Alignment

The shared standard is in the parent public-repositories directory:

- `../WORKFLOW_ALIGNMENT.md`
- `../workflow-alignment.yml`
- `../workflow-alignment.rb`

These paths start at the repository root. They are local portfolio documents
and will not be present in a standalone clone of this project.

The relevant rules are:

- `create-draft-release.yml` must match the common workflow. A pushed
  `v*.*.*` tag creates a draft through Release Notes Scribe.
- Check out full Git history so the draft can include changes between tags.
- Review the draft and release evidence before publishing the GitHub Release.
- Keep validation independent from draft creation.
- Use four-space YAML mapping indentation and the shared sequence layout. For
  a job's `steps`, use twelve spaces before `-` and fourteen before item keys
  such as `with`.
- Use a narrow, documented YAML-path exception only when a concrete package
  requirement needs one.

The Python package, PyPI publishing, and PDM verification rules do not apply to
this TypeScript package. `ci.yml` remains a project-specific workflow. No
portfolio exception or parent configuration change is required for this setup.

From the parent public-repositories directory, check alignment with:

```sh
ruby workflow-alignment.rb --repo ship-shape
```

The checker compares the selected shared workflows. It does not test GitHub
secrets, registry access, or npm publication.

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
