# GitHub Token Setup

Status: Draft
Last updated: 2026-05-13

## Purpose

The PR Cycle Time MVP uses the GitHub REST API to fetch pull request lifecycle metadata. Private repositories require a token.

## Recommended Token Type

Use a fine-grained personal access token when possible.

GitHub docs:

- [Managing your personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [Creating a fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)
- [Permissions required for fine-grained personal access tokens](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)

## Minimum Access

For repositories you want to analyze, grant read access for pull request metadata.

Recommended fine-grained token setup:

- Resource owner: the organization or user that owns the repositories.
- Repository access: selected repositories, not all repositories, when possible.
- Repository permissions:
  - Pull requests: Read-only
  - Metadata: Read-only

## Add Token Locally

Edit `.env`:

```env
GITHUB_TOKEN=github_pat_your_token_here
```

Do not commit `.env`. It is gitignored.

## Verify Access

After implementation, use the app refresh flow or collector command to verify access. If GitHub returns an auth or rate-limit error, the dashboard should surface a sync error instead of failing silently.

## Rotation

If the token is exposed or no longer needed:

1. Revoke it in GitHub token settings.
2. Generate a new token.
3. Replace `GITHUB_TOKEN` in `.env`.

