-- Eventify: remove 2 more events.
-- Run from your Mac terminal:
--   cd /Users/hadeel/event-management-platform
--   mysql -u root eventify < remove_events2.sql

DELETE FROM events WHERE title IN (
  'AI & Robotics Tech Meetup',
  'Downtown Business Networking Night'
);
