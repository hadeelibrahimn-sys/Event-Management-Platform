# Database Documentation

## Users

Stores user account information.

* user_id
* full_name
* email
* password
* role
* created_at

## Events

Stores events created and managed by users.

* event_id
* organiser_id
* title
* description
* event_date
* location
* status

## Organisers

Stores organiser profile information.

* organiser_id
* user_id
* business_name
* description
* contact_email
* phone
* location

## Services

Stores event services that users can view and book.

* service_id
* organiser_id
* service_name
* category
* description
* price
* availability_status

## Bookings

Stores booking information.

* booking_id
* user_id
* service_id
* event_id
* booking_date
* status

## Planning Assistant

Stores event planning information and recommendations.

* plan_id
* user_id
* event_type
* budget
* guest_count
* preferred_location
* recommended_organiser_id

## Visual Simulations

Stores saved 3D layouts created using the Simulation Tool.

The event_id can be empty, allowing a layout to be saved before it is connected to an event.

* simulation_id
* user_id
* event_id
* event_name
* guests
* workspace_type
* layout_type
* width
* length
* height
* wall_color
* floor_color
* wall_texture
* lighting
* placed_items
* created_at
* updated_at

The placed_items field stores the objects added to the 3D layout as JSON.

See `backend/db/schema.sql` for the full table structure.

## Messages

Stores messages exchanged between users and organisers.

* message_id
* sender_id
* receiver_id
* event_id
* message_content
* sent_at
