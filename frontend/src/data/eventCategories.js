// Canonical event category taxonomy — shared source of truth (mirrored on the
// backend at backend/utils/eventCategories.js; keep both in sync).
//
// Organizers pick a specific, detailed category in CreateEvent. Every
// detailed category belongs to exactly one broad group, which is what
// ExploreEvents filters by. The backend derives category_group from
// `category` itself on save, so this file is used here purely to render
// the grouped dropdown and the Explore filter chips.

export const EVENT_CATEGORIES = [
  {
    group: 'Education',
    options: [
      { value: 'workshop', label: 'Workshop' },
      { value: 'course', label: 'Course' },
      { value: 'seminar', label: 'Seminar' },
      { value: 'webinar', label: 'Webinar' },
      { value: 'training', label: 'Training Session' },
    ],
  },
  {
    group: 'Business',
    options: [
      { value: 'conference', label: 'Conference' },
      { value: 'networking', label: 'Networking Event' },
      { value: 'business', label: 'Business Event' },
      { value: 'trade-show', label: 'Trade Show' },
    ],
  },
  {
    group: 'Culture',
    options: [
      { value: 'exhibition', label: 'Exhibition' },
      { value: 'cultural', label: 'Cultural Event' },
    ],
  },
  {
    group: 'Entertainment',
    options: [
      { value: 'concert', label: 'Concert' },
      { value: 'festival', label: 'Festival' },
      { value: 'party', label: 'Party' },
      { value: 'movie-night', label: 'Movie Night' },
      { value: 'game-night', label: 'Game Night' },
      { value: 'comedy', label: 'Comedy Show' },
    ],
  },
  {
    group: 'Sports',
    options: [
      { value: 'sports', label: 'Sports Event' },
      { value: 'tournament', label: 'Tournament' },
      { value: 'marathon', label: 'Marathon' },
    ],
  },
  {
    group: 'Wellness',
    options: [
      { value: 'fitness', label: 'Fitness Class' },
      { value: 'yoga', label: 'Yoga Session' },
      { value: 'wellness-retreat', label: 'Wellness Retreat' },
    ],
  },
  {
    group: 'Community',
    options: [
      { value: 'charity', label: 'Charity Event' },
      { value: 'community', label: 'Community Event' },
      { value: 'volunteering', label: 'Volunteering Event' },
    ],
  },
  {
    group: 'Technology',
    options: [
      { value: 'tech-meetup', label: 'Tech Meetup' },
      { value: 'hackathon', label: 'Hackathon' },
      { value: 'product-launch', label: 'Product Launch' },
    ],
  },
  {
    group: 'Food & Drink',
    options: [
      { value: 'food-festival', label: 'Food Festival' },
      { value: 'wine-tasting', label: 'Wine Tasting' },
      { value: 'cooking-class', label: 'Cooking Class' },
    ],
  },
  {
    group: 'Celebrations',
    options: [
      { value: 'birthday', label: 'Birthday Party' },
      { value: 'wedding', label: 'Wedding' },
      { value: 'engagement', label: 'Engagement' },
      { value: 'anniversary', label: 'Anniversary' },
      { value: 'baby-shower', label: 'Baby Shower' },
      { value: 'bridal-shower', label: 'Bridal Shower' },
    ],
  },
  {
    group: 'Other',
    options: [
      { value: 'other', label: 'Other' },
    ],
  },
];

export const CATEGORY_GROUPS = EVENT_CATEGORIES.map((g) => g.group);

const CATEGORY_TO_GROUP = {};
EVENT_CATEGORIES.forEach(({ group, options }) => {
  options.forEach(({ value }) => {
    CATEGORY_TO_GROUP[value] = group;
  });
});

export function getCategoryGroup(category) {
  if (!category) return 'Other';
  return CATEGORY_TO_GROUP[category] || 'Other';
}

// e.g. "Food & Drink" -> "food-drink" — used to key CSS classes and lookups.
export function slugifyGroup(group) {
  return group.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
