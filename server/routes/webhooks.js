const express = require('express');
const crypto = require('crypto');
const Developer = require('../models/Developer');

const router = express.Router();

function signaturesMatchConstantTime(expectedSignature, receivedSignature) {
  if (!receivedSignature) return false;

  const expected = Buffer.from(expectedSignature, 'utf8');
  const received = Buffer.from(receivedSignature, 'utf8');

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

// POST /api/github/webhook
// Note: To use this locally, you must use a tool like ngrok to expose port 5000: `ngrok http 5000`
// Then paste the ngrok URL into GitHub Webhooks setting: http://<ngrok-id>.ngrok.io/api/github/webhook
router.post('/webhook', async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const signature = req.headers['x-hub-signature-256'];
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');

    let payload = {};
    if (rawBody.length > 0) {
      try {
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch {
        return res.status(400).send('Invalid JSON payload');
      }
    }
    
    // Phase 1: Cryptographic Webhook Security
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret) {
      if (!signature) {
        return res.status(401).send('Unauthorized: No signature provided');
      }
      
      // Calculate HMAC over exact raw bytes GitHub signed.
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

      if (!signaturesMatchConstantTime(digest, signature)) {
        return res.status(401).send('Unauthorized: Signature strictly mismatch');
      }
    }

    // Acknowledge receipt securely
    res.status(200).send('Webhook received securely');

    if (!payload || !payload.sender) return;

    const githubUsername = payload.sender.login;
    const developer = await Developer.findOne({ githubUsername });

    if (!developer) {
      console.log(`GitHub Webhook: Ignore event. User ${githubUsername} is not mapped to any developer.`);
      return;
    }

    const repositoryName = payload.repository ? payload.repository.name : 'Unknown Repo';

    let commitsInc = 0;
    let prsInc = 0;
    let issuesInc = 0;

    // 1. Commits Pushed
    if (event === 'push' && payload.commits) {
      const validCommits = payload.commits.filter(c => c.author && (c.author.username === githubUsername || c.author.name === githubUsername));
      if (validCommits.length > 0) {
        commitsInc = validCommits.length;
        console.log(`[Webhook] Queueing ${validCommits.length} commits for atomic inc on repo ${repositoryName}`);
      }
    }

    // 2. Pull Request Merged
    if (event === 'pull_request') {
      if (payload.action === 'closed' && payload.pull_request && payload.pull_request.merged) {
        prsInc = 1;
        console.log(`[Webhook] Queueing 1 merged PR for atomic inc on repo ${repositoryName}`);
      }
    }

    // 3. Issue Closed 
    if (event === 'issues') {
      if (payload.action === 'closed') {
        issuesInc = 1;
        console.log(`[Webhook] Queueing 1 resolved issue/bug for atomic inc on repo ${repositoryName}`);
      }
    }

    if (commitsInc > 0 || prsInc > 0 || issuesInc > 0) {
      // Phase 2: Atomic Mongoose Aggregations (Race Condition Fix)
      const updatePayload = {
        $inc: {}
      };
      
      if (commitsInc > 0) updatePayload.$inc['commits'] = commitsInc;
      if (prsInc > 0) updatePayload.$inc['pullRequestsMerged'] = prsInc;
      if (issuesInc > 0) {
        updatePayload.$inc['issuesResolved'] = issuesInc;
        updatePayload.$inc['bugsFixed'] = issuesInc; // Fallback mapping bugs
      }

      // Try assigning strictly to nested project array via array update filter
      const nestedUpdatePayload = JSON.parse(JSON.stringify(updatePayload));
      if (commitsInc > 0) nestedUpdatePayload.$inc['projectsContributions.$.commits'] = commitsInc;
      if (prsInc > 0) nestedUpdatePayload.$inc['projectsContributions.$.pullRequestsMerged'] = prsInc;
      if (issuesInc > 0) nestedUpdatePayload.$inc['projectsContributions.$.issuesResolved'] = issuesInc;

      const result = await Developer.updateOne(
        { _id: developer._id, 'projectsContributions.repositoryName': repositoryName },
        nestedUpdatePayload
      );

      if (result.modifiedCount === 0) {
        // Safe Push: Collection does not exist natively yet
        const pushPayload = JSON.parse(JSON.stringify(updatePayload));
        pushPayload.$push = {
          projectsContributions: {
            repositoryName,
            commits: commitsInc,
            pullRequestsMerged: prsInc,
            issuesResolved: issuesInc
          }
        };
        await Developer.updateOne({ _id: developer._id }, pushPayload);
      }

      // Post-sync mathematical check
      const updatedDev = await Developer.findById(developer._id);
      if (updatedDev) {
        updatedDev.calculateProductivityScore();
        await updatedDev.save(); // Mathematical cache update only
      }
      
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
