const express = require('express');
const axios = require('axios');
const Developer = require('../models/Developer');
const { auth, managerOnly } = require('../middleware/auth');

const router = express.Router();

const getGithubHeaders = () => {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
};

// POST /api/github/sync/:id
router.post('/sync/:id', auth, managerOnly, async (req, res) => {
  try {
    const { githubUsername } = req.body;
    const developer = await Developer.findById(req.params.id);

    if (!developer) {
      return res.status(404).json({ message: 'Developer not found' });
    }

    const usernameToSync = githubUsername || developer.githubUsername;
    
    if (!usernameToSync) {
      return res.status(400).json({ message: 'GitHub username is required to sync' });
    }

    // Save the username if it was newly provided
    if (githubUsername && githubUsername !== developer.githubUsername) {
      developer.githubUsername = githubUsername;
    }

    const headers = getGithubHeaders();
    
    // We run the requests in parallel
    const [userRes, prsRes, issuesRes, commitsRes] = await Promise.all([
      // Basic profile (to verify user exists)
      axios.get(`https://api.github.com/users/${usernameToSync}`, { headers }),
      // Number of PRs merged
      axios.get(`https://api.github.com/search/issues?q=author:${usernameToSync}+type:pr+is:merged`, { headers }),
      // Number of Issues closed (approximating bugs fixed / issues resolved)
      axios.get(`https://api.github.com/search/issues?q=author:${usernameToSync}+type:issue+is:closed`, { headers }),
      // Number of commits (Requires special preview header)
      axios.get(`https://api.github.com/search/commits?q=author:${usernameToSync}`, { 
        headers: { ...headers, Accept: 'application/vnd.github.cloak-preview+json' } 
      })
    ]).catch(err => {
      console.error('GitHub API Error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.message || 'Failed to fetch data from GitHub');
    });

    const totalPrs = prsRes.data.total_count || 0;
    const totalIssues = issuesRes.data.total_count || 0;
    const totalCommits = commitsRes.data.total_count || 0;

    // We can also intelligently merge this with the current stats instead of completely overwriting,
    // but for the sake of the analyzer, GitHub is the source of truth for code contributions.
    // We'll augment the baseline metrics rather than replace entirely so dummy data isn't wiped out,
    // or we can simply replace them. Let's add them to simulate a massive sync!
    
    // For realism, let's update the actual metrics with real GitHub data!
    developer.commits = totalCommits;
    developer.pullRequestsMerged = totalPrs;
    developer.issuesResolved = totalIssues;
    
    // If they have closed issues, we can assume a portion of them were bugs.
    developer.bugsFixed = Math.floor(totalIssues * 0.7);

    // Recalculate score
    developer.calculateProductivityScore();
    await developer.save();

    res.json({
      message: 'GitHub profile synced successfully',
      stats: {
        commits: totalCommits,
        prs: totalPrs,
        issues: totalIssues
      },
      developer
    });

  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error during sync' });
  }
});

module.exports = router;
