# Enabling CI

`github-actions-ci.yml` is the GitHub Actions workflow for this project
(install → prisma generate → lint → typecheck → unit tests → build).

It lives here instead of `.github/workflows/` only because the initial push was
made with an OAuth token lacking the `workflow` scope, which GitHub requires to
create files under `.github/workflows/`.

To activate it:

```bash
# grant the workflow scope to the gh CLI (opens a browser)
gh auth refresh -h github.com -s workflow

# move the file into place and commit
mkdir -p .github/workflows
git mv ci/github-actions-ci.yml .github/workflows/ci.yml
git commit -m "ci: enable GitHub Actions workflow"
git push
```
