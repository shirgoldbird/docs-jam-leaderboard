# Docs Jam Leaderboard

A Next.js application that tracks contributions to the DeepL API docs repository during Docs Jam sessions. The system monitors GitHub PRs, matches merged PRs to bounties, and displays a points-based leaderboard.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.local.example` to `.env.local` and fill in your GitHub token:
```bash
cp .env.local.example .env.local
```

3. Set up GitHub authentication:
   - **Personal Access Token** (for system operations): Create a token with `repo` and `read:org` permissions
   - **GitHub OAuth App** (for user authentication): 
     1. Go to https://github.com/settings/developers
     2. Click "New OAuth App"
     3. Set Authorization callback URL to `http://localhost:3000/api/auth/callback/github`
     4. Copy the Client ID and Client Secret to `.env.local`
   - Generate a NextAuth secret: `openssl rand -base64 32`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

### Creating Bounties

You can create bounties in two ways:

1. **Via the Web UI** (Recommended):
   - Sign in with GitHub on the "Create Bounty" page
   - Browse repository files (docs/ and api-reference/ directories)
   - Select a file and fill in the bounty details
   - The system will create a GitHub issue automatically

2. **Manually edit `bounties.json`**:
   - Each bounty should include:
     - `id`: Unique identifier (auto-generated)
     - `page`: Path to the documentation page
     - `title`: Display title
     - `points`: Points awarded for completing this bounty
     - `priority`: `low`, `medium`, or `high`
     - `description`: Optional description

## How It Works

1. The system tracks open PRs and saves them to `data/tracked-prs.json`
2. On each sync, it fetches current open PRs and updates the tracking list
3. It checks tracked PRs that have been closed to see if they were merged
4. For merged PRs, it checks if any changed files match bounty pages
5. The first merged PR for each bounty awards points to the contributor
6. The leaderboard displays contributors ranked by total points

### Efficiency

The system only checks PRs that were previously open (tracked), making it much more efficient than scanning all PRs. This approach:
- Reduces API calls significantly
- Avoids rate limit issues
- Only processes relevant PRs (those that were open when tracking started)

### File Caching

Repository files are cached for 30 minutes to reduce API calls. The cache is stored in `data/repo-files-cache.json` and can be refreshed by adding `?refresh=true` to the API call.

