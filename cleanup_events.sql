-- Eventify: keep only 4 events, remove the rest.
-- Keeps: the birthday event (matched by title containing "birthday", any case),
-- "Future of AI: Virtual Conference", "AI & Robotics Tech Meetup",
-- "Downtown Business Networking Night". Everything else is deleted,
-- including the 5 explicitly named for removal (Watercolor Workshop,
-- City Marathon 2026, Hybrid Wellness & Fitness Expo, Beach Cleanup Day,
-- Open Garden Wedding Showcase) and Summer Cultural Festival / Live Jazz
-- Concert / Street Food & Craft Beer Festival.
--
-- Run from your Mac terminal (not this sandbox — this DB lives on your
-- machine at localhost, which I can't reach directly):
--   mysql -u root eventify < cleanup_events.sql
--
-- Related rows in saved_events / bookings / visual_simulations that
-- reference a deleted event are removed automatically via ON DELETE CASCADE.

DELETE FROM events
WHERE title NOT LIKE '%birthday%'
  AND title NOT IN (
    'Future of AI: Virtual Conference',
    'AI & Robotics Tech Meetup',
    'Downtown Business Networking Night'
  );
