# Database Documentation

## Users
Stores customer and organiser accounts.

- user_id
- full_name
- email
- password
- role
- created_at

## Events
Stores events created and managed by users or organisers.

- event_id
- organiser_id
- title
- description
- event_date
- location
- status

## Organisers
Stores organiser profile information.

- organiser_id
- user_id
- business_name
- description
- contact_email
- phone
- location

## Services
Stores event services that users can browse and book.

- service_id
- organiser_id
- service_name
- category
- description
- price
- availability_status

## Bookings
Stores service booking requests.

- booking_id
- user_id
- service_id
- event_id
- booking_date
- status

## Planning_Assistant
Stores user planning preferences and organiser recommendations.

- plan_id
- user_id
- event_type
- budget
- guest_count
- preferred_location
- recommended_organiser_id

## Visual_Simulations
Stores saved 3D layouts from the Simulation Tool (DesignWorkspace). `event_id` is nullable — layouts can be saved before an event is linked, since Create Event backend is still pending.

- simulation_id
- user_id
- event_id (nullable, no FK yet)
- event_name
- guests
- workspace_type (predefined | custom)
- layout_type (indoor | enclosed | lshaped | garden | custom)
- width, length, height
- wall_color, floor_color
- wall_texture (0 Plain, 1 Subtle, 2 Brick, 3 Marble)
- lighting (Soft | Natural | Bright)
- placed_items (JSON array of {id, type, x, z, ry})
- created_at, updated_at

See `backend/db/schema.sql` for the actual CREATE TABLE statement.

## Messages
Stores communication between customers and organisers.

- message_id
- sender_id
- receiver_id
- event_id
- message_content
- sent_at
