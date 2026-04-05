const express = require('express');
const Developer = require('../models/Developer');

const router = express.Router();

// POST /api/github/webhook
// Note: To use this locally, you must use a tool like ngrok to expose port 5000: `ngrok http 5000`
// Then paste the ngrok URL into GitHub Webhooks setting: http://<ngrok-id>.ngrok.io/api/github/webhook
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    // Acknowledge receipt
    res.status(200).send('Webhook received');

    if (!payload || !payload.sender) return;

    const githubUsername = payload.sender.login;
    const developer = await Developer.findOne({ githubUsername });

    if (!developer) {
      console.log(`GitHub Webhook: Ignore event. User ${githubUsername} is not mapped to any developer.`);
      return;
    }

    let modified = false;

    // 1. Commits Pushed
    if (event === 'push' && payload.commits) {
      // payload.commits is array of commit objects
      const validCommits = payload.commits.filter(c => c.author && (c.author.username === githubUsername || c.author.name === githubUsername));
      if (validCommits.length > 0) {
        developer.commits = (developer.commits || 0) + validCommits.length;
        modified = true;
        console.log(`[Webhook] Added ${validCommits.length} commits to ${developer.name}`);
      }
    }

    // 2. Pull Request Merged
    if (event === 'pull_request') {
      if (payload.action === 'closed' && payload.pull_request && payload.pull_request.merged) {
        developer.pullRequestsMerged = (developer.pullRequestsMerged || 0) + 1;
        modified = true;
        console.log(`[Webhook] Added 1 merged PR to ${developer.name}`);
      }
    }

    // 3. Issue Closed (Assuming it was an issue they closed, we credit them for resolving something)
    if (event === 'issues') {
      if (payload.action === 'closed') {
        developer.issuesResolved = (developer.issuesResolved || 0) + 1;
        // Assume every 2nd issue is a bug for metrics sake if bugsFixed isn't directly inferable
        developer.bugsFixed = (developer.bugsFixed || 0) + 1; 
        modified = true;
        console.log(`[Webhook] Added 1 resolved issue/bug to ${developer.name}`);
      }
    }

    if (modified) {
      developer.calculateProductivityScore();
      await developer.save();
      
      // Emit web sockets change so Dashboard updates in real time!
      if (req.io) {
        req.io.emit('DATA_UPDATED', { message: 'Developer GitHub stats updated via Webhook' });
      }
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
  }
});

module.exports = router;
