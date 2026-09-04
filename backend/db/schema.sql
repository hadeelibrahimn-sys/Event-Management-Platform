-- Eventify database schema
-- Run with: mysql -u root -p eventify < backend/db/schema.sql
-- (create the database first: CREATE DATABASE IF NOT EXISTS eventify;)

-- Users already exists in this project (created manually earlier), included
-- here as IF NOT EXISTS so this file is safe to run on a fresh database too.
CREATE TABLE IF NOT EXISTS users (
  user_id     INT AUTO_INCREMENT PRIMARY KEY,
  full_name   VARCHAR(150) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'customer',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved 3D layouts from the Simulation Tool.

-- event_id can be empty for now because the Events connection is not finished.
-- A simulation can be saved first and linked to an event later.
CREATE TABLE IF NOT EXISTS visual_simulations (
  simulation_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  event_id        INT NULL,
  event_name      VARCHAR(150) NOT NULL,
  guests          INT NOT NULL,
  workspace_type  VARCHAR(20) NOT NULL DEFAULT 'predefined',   -- predefined | custom
  layout_type     VARCHAR(20) NOT NULL DEFAULT 'indoor',       -- indoor | enclosed | lshaped | garden | custom
  width           DECIMAL(6,2) NOT NULL,
  length          DECIMAL(6,2) NOT NULL,
  height          DECIMAL(6,2) NOT NULL,
  wall_color      VARCHAR(7)  DEFAULT '#ffffff',
  floor_color     VARCHAR(7)  DEFAULT '#f0ece8',
  wall_texture    TINYINT     DEFAULT 0,                       -- 0 Plain, 1 Subtle, 2 Brick, 3 Marble
  lighting        VARCHAR(20) DEFAULT 'Soft',                  -- Soft | Natural | Bright
  placed_items    JSON NULL,                                   -- [{id,type,x,z,ry}, ...]
  custom_geometry JSON NULL,                                   -- {walls:[{id,x1,z1,x2,z2,color}], floorZones:[{id,x,z,w,d,color}], doors:[{id,wallId,t,width}]} — only for custom layouts, from the 2D Wall Editor
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_visual_simulations_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- If you used an older version of this schema, run this once to add custom_geometry.

-- ALTER TABLE visual_simulations ADD COLUMN IF NOT EXISTS custom_geometry JSON NULL AFTER placed_items;

-- Events created by users.
-- A user becomes an organizer by creating an event.

-- image_url stores the image path as text for now.
-- File upload can be added later.
CREATE TABLE IF NOT EXISTS events (
  event_id                INT AUTO_INCREMENT PRIMARY KEY,
  organizer_id             INT NOT NULL,
  title                    VARCHAR(200) NOT NULL,
  category                 VARCHAR(50)  NULL,                        -- specific/detailed category, e.g. "workshop"
  category_group           VARCHAR(50)  NULL,                        -- broad group derived from category, e.g. "Education" — see backend/utils/eventCategories.js
  description              TEXT NULL,
  format                   VARCHAR(20) NOT NULL DEFAULT 'in-person',  -- in-person | online | hybrid
  venue_name               VARCHAR(200) NULL,
  address                  VARCHAR(255) NULL,
  start_date               DATE NULL,
  end_date                 DATE NULL,
  start_time               TIME NULL,
  end_time                 TIME NULL,
  max_participants         INT NULL,
  registration_deadline    DATE NULL,
  image_url                VARCHAR(500) NULL,
  status                   VARCHAR(20) NOT NULL DEFAULT 'published',  -- draft | published | cancelled
  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_organizer
    FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- If you used an older version of this schema, run this once to add category_group.

-- ALTER TABLE events ADD COLUMN IF NOT EXISTS category_group VARCHAR(50) NULL AFTER category;

-- Stores events saved by users.
-- If a user or event is deleted, the related saved event records are removed automatically.
CREATE TABLE IF NOT EXISTS saved_events (
  saved_id    INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  event_id    INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_saved_events_user_event UNIQUE (user_id, event_id),
  CONSTRAINT fk_saved_events_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_events_event
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

-- Stores free event bookings without payment processing.

-- Cancelling a booking changes its status instead of deleting it.

-- This keeps the booking history and capacity information available.

-- Booking again after cancellation creates a new record.
CREATE TABLE IF NOT EXISTS bookings (
  booking_id      INT AUTO_INCREMENT PRIMARY KEY,
  event_id        INT NOT NULL,
  user_id         INT NOT NULL,
  quantity        INT NOT NULL DEFAULT 1,
  status          VARCHAR(20) NOT NULL DEFAULT 'confirmed',   -- confirmed | cancelled
  reference_code  VARCHAR(20) NOT NULL UNIQUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_event
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Optional organizer profile used for the Find Organizers page.

-- This information is stored separately because not every user needs an organizer profile.

-- Users must also have at least one published event to appear in the organizer directory.
CREATE TABLE IF NOT EXISTS organiser_profiles (
  organiser_profile_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id                INT NOT NULL UNIQUE,
  bio                    TEXT NULL,
  specialty              VARCHAR(150) NULL,
  experience_years       INT NULL,
  avatar_url             VARCHAR(500) NULL,
  location               VARCHAR(150) NULL,
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_organiser_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Stores direct messages between two users.

-- Messages are refreshed by loading the conversation again.

-- Participants are stored in a separate table so group conversations can be added later.

-- For now, each conversation has only two participants.
CREATE TABLE IF NOT EXISTS conversations (
  conversation_id  INT AUTO_INCREMENT PRIMARY KEY,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- bumped on each new message, for inbox sort
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  participant_id  INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  user_id         INT NOT NULL,
  last_read_at    TIMESTAMP NULL,   -- null means "never read"; compared against the latest message to compute unread state
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_conversation_participants_pair UNIQUE (conversation_id, user_id),
  CONSTRAINT fk_conversation_participants_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  CONSTRAINT fk_conversation_participants_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  message_id      INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_id       INT NOT NULL,
  body            TEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
);
