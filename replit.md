# Domain Management Application

## Overview

This is a full-stack web application for managing domains and SSL certificates on Linux servers. The application provides a dashboard interface for adding, viewing, and managing domains with their SSL certificate status. It features a modern React frontend with a Node.js/Express backend that integrates with Python scripts for actual domain and SSL management using nginx and acme.sh.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Domain Management**: Python scripts for nginx and SSL operations
- **SSL Provider**: acme.sh with Let's Encrypt certificates
- **Web Server**: nginx configuration management
- **Development**: Hot reload with tsx
- **Build**: esbuild for production bundling

### Project Structure
- `client/` - React frontend application
- `server/` - Express.js backend API and Python domain management scripts
- `shared/` - Shared TypeScript types and schemas
- `components.json` - shadcn/ui configuration

## Key Components

### Database Schema (`shared/schema.ts`)
- **Domains Table**: Stores domain information including name, SSL status, expiry dates, and creation timestamps
- **SSL Status Types**: "valid", "expired", "expiring_soon", "no_ssl"
- **Validation**: Zod schemas for type-safe data validation

### API Endpoints (`server/routes.ts`)
- `GET /api/domains` - Retrieve all domains from nginx sites-available
- `GET /api/domains/stats` - Get domain statistics
- `POST /api/domains` - Create new domain with nginx configuration and optional SSL installation
- `POST /api/domains/:id/ssl` - Install SSL certificate using acme.sh
- `DELETE /api/domains/:id` - Remove domain from nginx sites-available and sites-enabled

### Domain Management Layer (`server/domain_manager.py`)
- **Nginx Integration**: Manages nginx site configurations in `/etc/nginx/sites-available` and `/etc/nginx/sites-enabled`
- **SSL Management**: Uses acme.sh for Let's Encrypt SSL certificate generation and installation
- **Real Domain Operations**: Actual server-side domain and SSL management with nginx testing and reloading
- **SSL Expiry Tracking**: Calculates days to expiry and SSL status based on actual certificate files

### Frontend Components
- **Dashboard**: Main application view with domain management
- **Domain Table**: Sortable table with search and SSL management
- **Stats Cards**: Visual overview of domain and SSL statistics
- **Modals**: Add domain and delete confirmation dialogs
- **Sidebar**: Navigation and branding

## Data Flow

1. **Domain Creation**: User submits domain form → validation → API call → database update → UI refresh
2. **SSL Installation**: User clicks install SSL → API call → status update → real-time UI update
3. **Statistics**: Dashboard loads → parallel API calls for domains and stats → display aggregated data
4. **Real-time Updates**: All mutations invalidate relevant queries for immediate UI updates

## External Dependencies

### Frontend Dependencies
- **UI Components**: Comprehensive Radix UI component library
- **Icons**: Lucide React icon set
- **Date Handling**: date-fns for date manipulation
- **Form Validation**: Zod for runtime type checking
- **HTTP Client**: Native fetch with TanStack Query wrapper

### Backend Dependencies
- **Database**: Drizzle ORM with Neon Database serverless PostgreSQL
- **Validation**: Shared Zod schemas between frontend and backend
- **Development**: tsx for TypeScript execution and hot reload

### Development Tools
- **Type Checking**: TypeScript with strict configuration
- **Code Quality**: ESM modules throughout the application
- **Build System**: Vite for frontend, esbuild for backend production builds

## Deployment Strategy

### Replit Configuration
- **Environment**: Node.js 20 with PostgreSQL 16 module
- **Development**: `npm run dev` starts both frontend and backend
- **Production Build**: `npm run build` creates optimized bundles
- **Production Server**: `npm run start` serves built application
- **Port Configuration**: Backend on port 5000, exposed on port 80

### Build Process
1. Frontend: Vite builds React app to `dist/public`
2. Backend: esbuild bundles Express server to `dist/index.js`
3. Static files served from backend in production

### Database Setup
- **Development**: Uses DATABASE_URL environment variable
- **Migrations**: Drizzle Kit manages schema changes
- **Push Command**: `npm run db:push` applies schema to database

## Changelog

```
Changelog:
- June 21, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```