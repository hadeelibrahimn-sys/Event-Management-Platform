# CHAPTER 5 – IMPLEMENTATION (Revised Structure)

*Revised from the original outline based on what was actually built. Sections marked **[new]** don't exist in the original; **[renamed]** keep their place but changed scope; **[split]** break one original heading into two. Everything else is unchanged from your draft.*

---

## 5.1 Introduction

## 5.2 Development Environment and System Architecture
- 5.2.1 Development Environment and Technologies
- 5.2.2 Project Structure
- 5.2.3 Overall System Architecture

## 5.3 Frontend Implementation
- 5.3.1 Frontend Structure and Reusable Components
- 5.3.2 Navigation and Routing
- 5.3.3 **Authentication and Account Management** *[renamed]* — now also covers profile editing and password change (previously would have needed its own "Settings" heading; folded in here since it's a small extension of the same account-identity concern, not a separate feature domain)
- 5.3.4 Customer Dashboard
- 5.3.5 Event Discovery and Search
- 5.3.6 Event Creation and Management — include the Hosting/Attending tab model, edit/delete flow, and the save-state UX polish (flash banners, discard-changes confirmation) here; also the place to mention Event Corners in one paragraph as a deliberately scoped-down placeholder, not its own subsection
- 5.3.7 Organiser Discovery and Profiles
- 5.3.8 Saved Events and Bookings
- 5.3.9 Messaging

## 5.4 Backend Implementation
- 5.4.1 Express Server and Layered Architecture
- 5.4.2 REST API Design
- 5.4.3 Authentication and Authorisation
- 5.4.4 Event Management
- 5.4.5 Saved Events and Bookings
- 5.4.6 Organiser Management
- 5.4.7 Messaging
- 5.4.8 Simulation Persistence
- 5.4.9 **Validation and Error Handling** *[new]* — a real, consistent pattern across the backend (auth middleware, capacity checks on bookings, eligibility-gated queries for Find Organizers) that's currently invisible in the outline, scattered implicitly through 5.4.4–5.4.7

## 5.5 Database Implementation
- 5.5.1 MySQL Database Architecture
- 5.5.2 Database Schema
- 5.5.3 User Data
- 5.5.4 Event and Booking Data
- 5.5.5 Organiser Data
- 5.5.6 Messaging Data Model
- 5.5.7 Simulation Data Model
- 5.5.8 Relationships and Data Integrity

## 5.6 Event Simulation Tool Implementation
- 5.6.1 Simulation Workflow
- 5.6.2 Layout and Venue Configuration
- 5.6.3 Three.js Scene Construction
- 5.6.4 **Object Catalog Architecture** *[split from old 5.6.4]* — the ELEMENTS/TYPE_LABELS/PART_LABELS pattern and build-switch design that makes the library extensible across a dozen+ categories; this is a genuine design contribution worth explaining on its own
- 5.6.5 **Procedural 3D Geometry Construction** *[split from old 5.6.4]* — how individual meshes (vases, curtains, chairs, florals, etc.) are actually built parametrically
- 5.6.6 Drag-and-Drop Placement
- 5.6.7 Object Manipulation
- 5.6.8 Environment Customisation
- 5.6.9 Camera Controls
- 5.6.10 **First-Person Walkthrough Mode** *[new]* — camera pose tweening, pointer lock, WASD movement, reactive lock/unlock on selection change, entry/exit bridging with Advanced Edit mode. This was missing entirely from the original outline despite being a substantial, distinctive engineering feature
- 5.6.11 Custom Layout / Wall Editor — wall shape editing plus door/window configuration (styles, snapping, click-to-edit)
- 5.6.12 Saving and Restoring Simulations

## 5.7 System Integration
- 5.7.1 Frontend–Backend Integration
- 5.7.2 Authentication Integration
- 5.7.3 Event Lifecycle Integration
- 5.7.4 Simulation Integration

## 5.8 Deployment and Production Configuration
*Completed implementation on Railway (backend, frontend, and MySQL database) — written in past tense as delivered work.*
- 5.8.1 Production Architecture — overview of the three Railway services and how they connect
- 5.8.2 Backend Deployment (Railway)
- 5.8.3 Database Deployment (Railway MySQL) — schema and seed data import into the production database
- 5.8.4 Frontend Deployment (Railway) — connecting the deployed frontend to the deployed API
- 5.8.5 **Environment Configuration and Secrets Management** *[new]* — production environment variables, separated from the local `.env` discussion in 5.2
- 5.8.6 Deployment Challenges — the concrete production-only bugs: Linux filesystem case sensitivity, Vite asset path resolution, and how each was diagnosed and fixed

## 5.9 Implementation Challenges and Technical Decisions
- 5.9.1 React–Three.js Integration
- 5.9.2 Complex State Management
- 5.9.3 Database/API Integration
- 5.9.4 Development vs Production — keep this distinct from 5.8.6: this is the *reflective* discussion (why dev and prod environments behave differently, what that implies for the architecture), while 5.8.6 is the *narrative* of the specific bugs hit and fixed
- 5.9.5 Changes from the Original Design — your strongest section for trade-off material: My Events collapsed into one page with Hosting/Attending tabs instead of two destinations; booking scoped to free RSVP only with payment explicitly deferred; a dedicated `organiser_profiles` table chosen over deriving thin profiles from users+events; messaging using polling instead of WebSockets; organizer attendee-list view deferred to a later iteration; Event Corners scoped down to a placeholder page

## 5.10 Chapter Summary

---

### Summary of changes from your original outline
1. **5.8 Deployment** — kept as-is structurally (your correction), content now written as completed work on Railway rather than a proposed strategy. Added 5.8.5 for environment/secrets configuration specifically.
2. **5.6 Simulation Tool** — expanded from 10 to 12 subsections: split object construction into catalog architecture vs. procedural geometry, and added First-Person Walkthrough Mode, which had no home in the original structure.
3. **5.3.3** — renamed to absorb Settings/account management rather than giving it a separate top-level heading.
4. **5.4.9** — added Validation and Error Handling as its own subsection.
5. **Event Corners** — explicitly given only a paragraph inside 5.3.6, not a subsection, since there's no real backend implementation to describe.
6. Everything else (5.1, 5.2, most of 5.3–5.5, 5.7, 5.9.1–5.9.3, 5.10) is unchanged from your draft — it already maps cleanly onto the real system.
