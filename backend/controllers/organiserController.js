const OrganiserProfile = require('../models/OrganiserProfile');
const Event = require('../models/Event');

// GET /api/organisers/me — the current user's own profile (may not exist yet)
const getMyProfile = async (req, res) => {
  try {
    const profile = await OrganiserProfile.findByUserId(req.user.user_id);
    res.status(200).json({ profile });
  } catch (error) {
    console.error('Get my organiser profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/organisers/me — create or update the current user's profile
const upsertMyProfile = async (req, res) => {
  try {
    const { bio, specialty, location } = req.body;
    const experience_years = req.body.experience_years !== undefined && req.body.experience_years !== ''
      ? Number(req.body.experience_years)
      : null;

    if (experience_years !== null && (!Number.isInteger(experience_years) || experience_years < 0)) {
      return res.status(400).json({ message: 'experience_years must be a whole number of 0 or more' });
    }

    const profile = await OrganiserProfile.upsert(req.user.user_id, {
      bio: bio || null,
      specialty: specialty || null,
      experience_years,
      avatar_url: req.body.avatar_url || req.body.avatarUrl || null,
      location: location || null,
    });

    res.status(200).json({ message: 'Profile saved', profile });
  } catch (error) {
    console.error('Save organiser profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/organisers — public directory (profile + >=1 published event)
const getOrganizers = async (req, res) => {
  try {
    const { search } = req.query;
    const organizers = await OrganiserProfile.findDirectory({ search });
    res.status(200).json({ organizers });
  } catch (error) {
    console.error('List organizers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/organisers/:userId — public profile + their published events
const getOrganizerById = async (req, res) => {
  try {
    const { userId } = req.params;
    const organizer = await OrganiserProfile.findPublicByUserId(userId);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const events = await Event.findPublishedByOrganizer(userId);
    res.status(200).json({ organizer, events });
  } catch (error) {
    console.error('Get organizer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getMyProfile,
  upsertMyProfile,
  getOrganizers,
  getOrganizerById,
};
