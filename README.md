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

3. Create a GitHub Personal Access Token with the following permissions:
   - `repo` (read access to repositories)
   - `read:org` (read organization membership)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

Edit `bounties.json` to define bounties for documentation pages. Each bounty should include:
- `id`: Unique identifier
- `page`: Path to the documentation page
- `title`: Display title
- `points`: Points awarded for completing this bounty
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

