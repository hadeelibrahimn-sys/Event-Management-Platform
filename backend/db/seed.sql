-- Eventify demo/test seed data
-- Run after schema.sql: mysql -u root -p eventify < backend/db/seed.sql
--
-- Creates one demo organizer account (if it doesn't already exist) and a
-- handful of published events — one per broad category group — so
-- ExploreEvents/EventDetails have real data to render during development.
-- category_group values here must match backend/utils/eventCategories.js
-- (normally the API computes category_group automatically on save; this
-- file inserts directly, so it sets both columns explicitly).
--
-- The demo account's password hash below is a placeholder valid bcrypt
-- hash — it is not meant to be used to log in, it only exists to satisfy
-- the events.organizer_id foreign key.

INSERT INTO users (full_name, email, password, role)
SELECT 'Demo Organizer', 'demo.organizer@eventify.local',
       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'customer'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'demo.organizer@eventify.local'
);

INSERT INTO events
  (organizer_id, title, category, category_group, description, format, venue_name, address,
   start_date, end_date, start_time, end_time, max_participants,
   registration_deadline, image_url, status)
SELECT u.user_id, e.title, e.category, e.category_group, e.description, e.format, e.venue_name, e.address,
       e.start_date, e.end_date, e.start_time, e.end_time, e.max_participants,
       e.registration_deadline, e.image_url, e.status
FROM (SELECT user_id FROM users WHERE email = 'demo.organizer@eventify.local') u
CROSS JOIN (
  SELECT
    'Downtown Business Networking Night' AS title, 'networking' AS category, 'Business' AS category_group,
    'An evening of networking, short talks, and connections for local entrepreneurs and professionals.' AS description,
    'in-person' AS format, 'The Grand Hall' AS venue_name, '120 Market St, Downtown' AS address,
    '2026-09-12' AS start_date, '2026-09-12' AS end_date, '18:00:00' AS start_time, '21:00:00' AS end_time,
    150 AS max_participants, '2026-09-10' AS registration_deadline,
    'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800' AS image_url,
    'published' AS status
  UNION ALL
  SELECT
    'City Marathon 2026', 'marathon', 'Sports',
    'Join thousands of runners for the annual city marathon, with 5K, 10K, and full marathon routes.',
    'in-person', 'Riverside Park', '1 Riverside Dr',
    '2026-10-04', '2026-10-04', '07:00:00', '13:00:00',
    5000, '2026-09-25',
    'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800',
    'published'
  UNION ALL
  SELECT
    'Intro to Watercolor Painting Workshop', 'workshop', 'Education',
    'A hands-on beginner workshop covering watercolor basics — materials, techniques, and your first painting.',
    'in-person', 'Eventify Art Studio', '45 Maple Ave',
    '2026-08-22', '2026-08-22', '10:00:00', '13:00:00',
    20, '2026-08-20',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800',
    'published'
  UNION ALL
  SELECT
    'Future of AI: Virtual Conference', 'conference', 'Business',
    'A full-day virtual conference featuring speakers from across the AI industry discussing trends and applications.',
    'online', NULL, NULL,
    '2026-09-30', '2026-09-30', '09:00:00', '17:00:00',
    2000, '2026-09-29',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
    'published'
  UNION ALL
  SELECT
    'Summer Cultural Festival', 'cultural', 'Culture',
    'A celebration of music, food, and art from cultures around the world, with live performances all day.',
    'in-person', 'Central Plaza', '500 Plaza Blvd',
    '2026-08-29', '2026-08-30', '12:00:00', '22:00:00',
    NULL, '2026-08-27',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
    'published'
  UNION ALL
  SELECT
    'Hybrid Wellness & Fitness Expo', 'fitness', 'Wellness',
    'Sessions on nutrition, fitness classes, and wellness talks — attend in person or join select sessions online.',
    'hybrid', 'Wellness Convention Center', '88 Health Way',
    '2026-11-14', '2026-11-15', '08:30:00', '18:00:00',
    800, '2026-11-10',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    'published'
  UNION ALL
  SELECT
    'Live Jazz Concert Under the Stars', 'concert', 'Entertainment',
    'An open-air evening of live jazz featuring local and touring musicians.',
    'in-person', 'Skyline Amphitheater', '9 Overlook Rd',
    '2026-09-05', '2026-09-05', '19:30:00', '22:30:00',
    600, '2026-09-04',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
    'published'
  UNION ALL
  SELECT
    'Community Beach Cleanup Day', 'volunteering', 'Community',
    'Join neighbors and local groups for a morning of cleaning up the shoreline — gloves and bags provided.',
    'in-person', 'Sunset Beach', 'Shoreline Access Rd',
    '2026-08-16', '2026-08-16', '08:00:00', '11:00:00',
    NULL, NULL,
    'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800',
    'published'
  UNION ALL
  SELECT
    'AI & Robotics Tech Meetup', 'tech-meetup', 'Technology',
    'Lightning talks and demos from local builders working on AI and robotics projects, plus open networking.',
    'in-person', 'Innovation Hub', '200 Startup Row',
    '2026-08-27', '2026-08-27', '18:30:00', '21:00:00',
    120, '2026-08-26',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
    'published'
  UNION ALL
  SELECT
    'Street Food & Craft Beer Festival', 'food-festival', 'Food & Drink',
    'A weekend of food trucks, local breweries, and live music in the heart of downtown.',
    'in-person', 'Harbor Square', '3 Harbor Walk',
    '2026-09-19', '2026-09-20', '11:00:00', '23:00:00',
    NULL, NULL,
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    'published'
  UNION ALL
  SELECT
    'Open Garden Wedding Showcase', 'wedding', 'Celebrations',
    'Tour a real garden wedding setup and meet local vendors — florists, caterers, and planners — in one place.',
    'in-person', 'Willowbrook Gardens', '77 Willow Ln',
    '2026-10-11', '2026-10-11', '13:00:00', '17:00:00',
    300, '2026-10-08',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
    'published'
) e;
