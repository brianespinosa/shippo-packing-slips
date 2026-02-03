# GitHub Actions Workflows

## Workflows

### auto-merge.yml

Automatically enables auto-merge on all pull requests using the squash merge strategy.

**How it works:**
- Triggers when a PR is opened, synchronized, or reopened
- Uses the GitHub CLI to enable auto-merge with squash strategy
- Relies on branch protection rules to ensure required checks pass before merging
- Uses standard `GITHUB_TOKEN` - no additional secrets required

**Permissions:**
- `pull-requests: write` - To enable auto-merge on PRs
- `contents: write` - To merge PRs

**Merge Strategy:**
All PRs use squash merge to maintain a clean commit history.

**Safety:**
The `--auto` flag means PRs will only merge after all branch protection requirements are satisfied (required checks, reviews, etc.).

## Common Tasks

**Editing workflows**: When modifying workflow files, always use environment variables for GitHub context values to prevent command injection vulnerabilities. See workflows/auto-merge.yml:19-22 for example.

**Debug failures**: Check Actions tab logs for workflow execution details

## Workflow Formatting Conventions

**Step property ordering**: Always list job step properties in the same consistent order for readability and maintainability.

**Required order:**
1. `name` - Step name (always first)
2. `id` - Step identifier (if present)
3. `uses` - Action to use (if present, mutually exclusive with `run`)
4. `with` - Action inputs (if using `uses`)
5. `env` - Environment variables (if present)
6. `run` - Shell commands (always last, mutually exclusive with `uses`)

**Example:**
```yaml
- name: Fetch data
  id: fetch
  env:
    GH_TOKEN: ${{ secrets.TOKEN }}
  run: |
    echo "commands here"
```
