# Nearby Backend API

Backend API for the Nearby student housing platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env` file and update with your PostgreSQL credentials
   - Update `DB_PASSWORD` with your PostgreSQL password

3. Initialize the database:
```bash
npm run init-db
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)

### Properties
- `GET /api/properties` - Get all properties (with filters)
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create property (owner only)
- `PUT /api/properties/:id` - Update property (owner only)
- `DELETE /api/properties/:id` - Delete property (owner only)
- `GET /api/properties/owner/my-properties` - Get owner's properties

### User Features
- `POST /api/users/favorites` - Add to favorites
- `DELETE /api/users/favorites/:property_id` - Remove from favorites
- `GET /api/users/favorites` - Get user's favorites
- `POST /api/users/messages` - Send message
- `GET /api/users/messages` - Get user's messages
- `PUT /api/users/messages/:id/read` - Mark message as read

## Database Schema

- **users** - User accounts (students and property owners)
- **properties** - Housing listings
- **favorites** - User's saved properties
- **messages** - Communication between users
