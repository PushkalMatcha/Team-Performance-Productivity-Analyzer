const Developer = require('../models/Developer');

/**
 * @desc    Add a new developer profile
 * @route   POST /api/developers
 * @access  Private (Manager role required)
 * @desc    Creates a new developer record in the database.
 * @param {Object} req - The request object containing developer data.
 * @param {Object} res - The response object.
 */
const addDeveloper = async (req, res) => {
  // Assuming authentication middleware has already verified the user is a Manager
  // and attached the current user's ID/role to req.user.

  const { name, email, githubUsername, skills } = req.body;

  if (!name || !email || !githubUsername) {
    return res.status(400).json({ message: 'Please provide name, email, and GitHub username.' });
  }

  try {
    // Check if the email already exists
    let developer = await Developer.findOne({ email: email });
    if (developer) {
      return res.status(409).json({ message: `Developer with email ${email} already exists.` });
    }

    // Create and save the new developer
    const newDeveloper = await Developer.create({
      name,
      email,
      githubUsername,
      skills: skills || [],
      // Initialize other fields if necessary, e.g., setting initial productivity score
    });

    res.status(201).json({
      message: 'Developer profile added successfully.',
      developer: newDeveloper,
    });
  } catch (error) {
    console.error('Error adding developer:', error);
    res.status(500).json({ message: 'Server error while adding developer.', error: error.message });
  }
};

module.exports = {
  addDeveloper,
};