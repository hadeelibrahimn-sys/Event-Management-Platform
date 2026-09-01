-- Eventify: add 4 new events, organized by the existing Demo Organizer account
-- (demo.organizer@eventify.local, the same one behind your seed.sql events).
--
-- Safe to re-run: it first deletes any existing rows with these exact 4
-- titles, so running this again (e.g. after an edit) replaces them instead
-- of creating duplicates.
--
-- Run from your Mac terminal:
--   cd /Users/hadeel/event-management-platform
--   mysql -u root eventify < add_events.sql

DELETE FROM events WHERE title IN (
  'Eventify Project Opening',
  'How to Create a Website: A Beginner''s Workshop',
  '3D Event Simulation: Visualizing Your Venue Before You Build It',
  'Drawing & Sketching for Artists: A Beginner-Friendly Workshop'
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
    'Eventify Project Opening' AS title, 'product-launch' AS category, 'Technology' AS category_group,
    'Come celebrate the official opening of Eventify, a full-stack event-management platform! Eventify lets people discover and browse events, save their favorites, and book free RSVP-style spots, while any user can become an organizer simply by creating their own event and message attendees directly through built-in conversations. Its standout feature is an integrated 3D event simulation tool: a procedural furniture catalogue of hundreds of objects across many categories, a custom or predefined room builder, first-person walkthroughs, and per-component "Advanced Edit" styling and branding, all built with raw Three.js. Join us for an evening of celebration as we introduce the platform to everyone.' AS description,
    'in-person' AS format, 'Jeddah Waterfront Hall' AS venue_name, 'Jeddah Corniche, Jeddah, Saudi Arabia' AS address,
    '2026-09-20' AS start_date, '2026-09-20' AS end_date, '18:00:00' AS start_time, '21:00:00' AS end_time,
    500 AS max_participants, '2026-09-18' AS registration_deadline,
    '/eventify-logo.png' AS image_url,
    'published' AS status
  UNION ALL
  SELECT
    'How to Create a Website: A Beginner''s Workshop', 'workshop', 'Education',
    'A hands-on introduction to building a website from scratch: structuring a page with HTML, styling it with CSS, and adding basic interactivity with JavaScript. No prior coding experience required, just bring a laptop.',
    'in-person', 'Eventify Tech Studio', '12 Innovation Row',
    '2026-09-26', '2026-09-26', '10:00:00', '13:00:00',
    30, '2026-09-24',
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
    'published'
  UNION ALL
  SELECT
    '3D Event Simulation: Visualizing Your Venue Before You Build It', 'workshop', 'Education',
    'An introduction to 3D event visualization: why walking through a venue layout in 3D before the event day catches capacity and flow problems that a floor plan on paper cannot. Using Eventify''s own 3D simulation tool as a live example, we will place furniture, try a first-person walkthrough, and see how a layout can be adjusted and re-viewed in real time.',
    'in-person', 'Eventify Design Lab', '30 Studio Court',
    '2026-10-03', '2026-10-03', '14:00:00', '17:00:00',
    40, '2026-10-01',
    'https://images.unsplash.com/photo-1633356122544-8e2fb7d5b834?w=800',
    'published'
  UNION ALL
  SELECT
    'Drawing & Sketching for Artists: A Beginner-Friendly Workshop', 'workshop', 'Education',
    'A relaxed, hands-on workshop for artists of all levels covering core sketching fundamentals: line, proportion, shading, and quick observational drawing exercises. Bring your own sketchbook and pencils, or borrow a set on arrival.',
    'in-person', 'Eventify Art Studio', '45 Maple Ave',
    '2026-09-13', '2026-09-13', '10:00:00', '12:30:00',
    20, '2026-09-11',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800',
    'published'
) e;
