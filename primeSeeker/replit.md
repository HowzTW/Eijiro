# Prime Number Calculator

## Overview

A single-purpose mathematical web application that calculates the three closest prime numbers greater than a given positive integer. Built as a Material Design-inspired utility tool with a focus on clarity and immediate usability. The application features a centered card layout with input validation, error handling, and responsive prime number display in a three-column grid.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast hot module replacement
- Wouter for lightweight client-side routing (single route to calculator, 404 page)

**UI Component Library**
- Shadcn/ui component system with Radix UI primitives for accessible components
- Tailwind CSS for utility-first styling with custom design tokens
- Design system follows "New York" style variant with neutral color scheme
- Custom spacing system using Tailwind units (4, 6, 8, 12, 16) for consistent rhythm

**State Management**
- TanStack Query (React Query) for server state management and caching
- Local component state for form inputs and UI interactions
- Custom hooks for responsive behavior (e.g., `use-mobile`, `use-toast`)

**Prime Number Calculation Logic**
- Client-side calculation using trial division algorithm
- `isPrime()` function checks divisibility up to square root for efficiency
- `findNextPrimes()` iterates from input+1 to find exactly three primes
- Simulated async calculation with loading states for better UX

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- HTTP server created via Node's `http` module for WebSocket potential
- Development mode uses Vite middleware for SSR-like hot reloading

**API Structure**
- RESTful API pattern with `/api` prefix for all endpoints
- Route registration system in `server/routes.ts` (currently minimal, ready for expansion)
- Request/response logging middleware tracking duration and status codes
- Built-in error handling and raw body parsing for webhook support

**Storage Layer**
- Abstract `IStorage` interface defining CRUD operations
- In-memory `MemStorage` implementation using Map for development/testing
- Schema defined with Drizzle ORM for future PostgreSQL integration
- User model includes id, username, and password fields (authentication ready)

### Data Storage

**Database Configuration**
- Drizzle ORM configured for PostgreSQL dialect
- Schema location: `shared/schema.ts` for type sharing between client/server
- Migration system ready (`drizzle-kit push` command available)
- Neon Database serverless driver for connection pooling

**Current Schema**
- Users table with UUID primary key, unique username constraint
- Zod schemas (`drizzle-zod`) for runtime validation of inserts
- Type inference provides TypeScript types for select/insert operations

### Authentication & Authorization

**Authentication Infrastructure**
- Foundation laid for Passport.js integration (dependencies installed)
- Express session support with both `connect-pg-simple` and `memorystore` options
- User schema includes password field for credential storage
- JWT library available for token-based auth if needed

**Current State**
- No authentication currently implemented on routes
- Storage interface includes user lookup methods ready for auth flows
- Session middleware not yet configured

### External Dependencies

**UI & Component Libraries**
- Radix UI primitives (20+ component packages) for accessible headless components
- Tailwind CSS with PostCSS for processing and autoprefixing
- Class Variance Authority (CVA) for component variant management
- clsx and tailwind-merge for conditional className utilities

**Form & Validation**
- React Hook Form for form state management
- Zod for schema validation
- `@hookform/resolvers` for integrating Zod with React Hook Form

**Database & ORM**
- Drizzle ORM for type-safe database queries
- `@neondatabase/serverless` for serverless PostgreSQL connections
- Drizzle-Zod for automatic Zod schema generation from Drizzle tables

**Development Tools**
- Replit-specific plugins for runtime error overlay and dev banner
- TSX for executing TypeScript files directly in Node.js
- esbuild for fast server bundle compilation in production

**Potential Integrations (Dependencies Present)**
- Date manipulation with date-fns
- Carousel components via embla-carousel-react
- Rate limiting with express-rate-limit
- CORS support for cross-origin requests