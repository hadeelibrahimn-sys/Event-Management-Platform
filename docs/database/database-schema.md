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
Stores basic event layout customisation details.

- simulation_id
- user_id
- event_id
- layout_type
- seating_arrangement
- decoration_style

## Messages
Stores communication between customers and organisers.

- message_id
- sender_id
- receiver_id
- event_id
- message_content
- sent_at
