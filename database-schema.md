# Database Schema

## Users
- user_id
- name
- email
- password
- role

## Events
- event_id
- organiser_id
- title
- description
- date
- location

## Services
- service_id
- service_name
- provider

## Bookings
- booking_id
- user_id
- event_id

## Messages
- message_id
- sender_id
- receiver_id

## Reminders
- reminder_id
- event_id
- reminder_date
