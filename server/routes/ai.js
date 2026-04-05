const express = require('express');
const { auth } = require('../middleware/auth');
const Task = require('../models/Task');
const Developer = require('../models/Developer');
const Groq = require('groq-sdk');

const router = express.Router();

let groq = null;

const initGroq = () => {
  if (!groq && process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
};

// POST /api/ai/generate-task
// Request Body: { title, assigneeName }
router.post('/generate-task', auth, async (req, res) => {
  try {
    const { title, assigneeName } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const client = initGroq();
    if (!client) {
      return res.status(503).json({ message: 'GROQ API key is not configured in .env' });
    }

    // Build the prompt
    let prompt = `You are an expert technical project manager. Write a concise, professional task description (max 3 short paragraphs) for a Jira/Trello ticket titled "${title}".`;
    if (assigneeName) {
      prompt += ` Keep in mind this task might be assigned to a developer named ${assigneeName}.`;
    }
    prompt += ` Format it beautifully using clear text without markdown headers, just output the description text. Make it actionable, outlining potential acceptance criteria.`;

    const chatCompletion = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192', // Super fast groq model
      temperature: 0.5,
      max_tokens: 300,
    });

    const generatedText = chatCompletion.choices[0]?.message?.content || 'Could not generate text.';
    
    res.json({ description: generatedText.trim() });
  } catch (error) {
    console.error('Groq AI Error:', error);
    res.status(500).json({ message: 'Failed to generate task description', error: error.message });
  }
});

// GET /api/ai/team-insights
// Purpose: Fetch database stats and pass it to LLM for a real AI-driven daily standup insight report.
router.get('/team-insights', auth, async (req, res) => {
  try {
    const client = initGroq();
    if (!client) {
      return res.status(503).json({ message: 'GROQ API key is not configured in .env' });
    }

    // Gather rapid metrics
    const developers = await Developer.find({}, 'name productivityScore tasksAssigned bugsFixed pullRequestsMerged');
    const tasks = await Task.find({}, 'status priority parsedDeadline');
    
    const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const overdueTasks = tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < new Date()).length;
    const criticalTasks = tasks.filter(t => t.priority === 'Critical' && t.status !== 'Completed').length;

    // Build context
    const context = `
      Team Size: ${developers.length} developers.
      Pending Tasks: ${pendingTasks}
      Completed Tasks: ${completedTasks}
      Overdue Tasks: ${overdueTasks}
      Critical Open Tasks: ${criticalTasks}
      
      Developer Data:
      ${developers.map(d => `- ${d.name} (Score: ${d.productivityScore}%, PRs: ${d.pullRequestsMerged}, Bugs: ${d.bugsFixed})`).join('\n')}
    `;

    const prompt = `
      You are an elite agile coach and engineering manager AI called TeamPulse AI. 
      Analyze the current state of my software development team based on this real-time data:
      ${context}

      Generate 3 highly actionable, very brief bullet points (max 2 sentences each) highlighting:
      1. One major positive trend or standout developer.
      2. One bottleneck or alarming metric (like overdue tasks or critical bugs).
      3. One piece of strategic advice on what the team should focus on today to improve velocity.

      Format strictly as 3 bullet points starting with an appropriate emoji. Use conversational, encouraging, yet professional tone. Do not add any introductory or concluding text, just the 3 bullet points.
    `;

    const chatCompletion = await client.chat.completions.create({
      messages: [{ role: 'system', content: prompt }],
      model: 'mixtral-8x7b-32768', // Using mixtral for better analytical reasoning
      temperature: 0.6,
      max_tokens: 400,
    });

    const rawOutput = chatCompletion.choices[0]?.message?.content || '';
    
    // Parse bullet points
    const insights = rawOutput.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => ({
        id: Math.random().toString(),
        text: line.replace(/^[\-\*\d\.]+ /, '').trim() // Remove bullet characters
      }));

    res.json({ insights });
  } catch (error) {
    console.error('Groq AI Error:', error);
    res.status(500).json({ message: 'Failed to generate AI insights', error: error.message });
  }
});

module.exports = router;
