# Computer for Schools Kenya - Backend API

Express TypeScript backend API for the Computer for Schools Kenya platform with Supabase PostgreSQL database.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control (donor, school, admin)
- **Donation Management**: Track computer donations from submission to delivery
- **School Requests**: Schools can request computers with approval workflow
- **Contact Messages**: Handle inquiries and support requests
- **Statistics & Analytics**: Impact metrics and dashboard data
- **Supabase Integration**: PostgreSQL database with real-time capabilities

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd cfs-kenya-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```env
PORT=3000
NODE_ENV=development

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

JWT_SECRET=your_secure_random_string
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:5173
```

4. **Set up Supabase database**

Run the SQL schema provided in the database documentation to create all tables, types, and sample data.

## 🏃‍♂️ Running the Application

**Development mode** (with hot reload):
```bash
npm run dev
```

**Build for production**:
```bash
npm run build
```

**Start production server**:
```bash
npm start
```

The API will be available at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── config/
│   └── supabase.ts          # Supabase client configuration
├── controllers/
│   ├── auth.controller.ts   # Authentication logic
│   ├── donation.controller.ts
│   ├── contact.controller.ts
│   ├── school.controller.ts
│   └── stats.controller.ts
├── middleware/
│   ├── auth.ts              # JWT authentication
│   └── errorHandler.ts      # Global error handling
├── routes/
│   ├── auth.routes.ts
│   ├── donation.routes.ts
│   ├── contact.routes.ts
│   ├── school.routes.ts
│   └── stats.routes.ts
├── types/
│   └── index.ts             # TypeScript type definitions
└── server.ts                # Main application entry point
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Donations
- `POST /api/donations` - Create donation (public)
- `GET /api/donations` - Get all donations (admin only)
- `GET /api/donations/:id` - Get donation by ID
- `GET /api/donations/user/:userId` - Get user donations
- `PATCH /api/donations/:id/status` - Update donation status (admin)

### Schools
- `POST /api/schools/requests` - Create school request (school users)
- `GET /api/schools/requests` - Get all requests (admin)
- `GET /api/schools/requests/:id` - Get request by ID
- `GET /api/schools/requests/user/:userId` - Get user requests
- `PATCH /api/schools/requests/:id/status` - Update request status (admin)
- `GET /api/schools` - Get all schools (public)
- `GET /api/schools/:id` - Get school by ID (public)

### Contact
- `POST /api/contact` - Send contact message (public)
- `GET /api/contact` - Get all messages (admin)
- `PATCH /api/contact/:id/status` - Update message status (admin)

### Statistics
- `GET /api/stats/impact` - Get public impact statistics
- `GET /api/stats/dashboard` - Get dashboard stats (admin)

## 🔐 Authentication

Protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Role-based access:
- **Public**: Anyone can access
- **Authenticated**: Requires valid JWT token
- **School**: School user role required
- **Admin**: Admin role required

## 🧪 Testing API Endpoints

You can test the API using tools like:
- **Postman** or **Insomnia**
- **curl** commands
- **VS Code REST Client**

Example curl request:
```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "user_type": "donor"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## 📊 Database Schema

The application uses the following main tables:
- **users** - User accounts with roles
- **donations** - Computer donation records
- **school_requests** - School computer requests
- **contact_messages** - Contact form submissions
- **schools** - School directory
- **computer_inventory** - Computer tracking

See the SQL schema file for complete details.

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based authorization
- Input validation with express-validator
- SQL injection protection (Supabase)
- CORS configuration
- Environment variable protection

## 🌐 CORS Configuration

Update `CORS_ORIGIN` in `.env` to match your frontend URL:
```env
CORS_ORIGIN=http://localhost:5173  # Development
# CORS_ORIGIN=https://yourdomain.com  # Production
```

## 🐛 Error Handling

The API uses consistent error responses:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Validation errors:
```json
{
  "errors": [
    {
      "msg": "Error message",
      "param": "field_name"
    }
  ]
}
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Server port | No (default: 3000) |
| NODE_ENV | Environment mode | No (default: development) |
| SUPABASE_URL | Supabase project URL | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key | Yes |
| JWT_SECRET | Secret for JWT signing | Yes |
| JWT_EXPIRES_IN | JWT expiration time | No (default: 7d) |
| CORS_ORIGIN | Allowed frontend origin | No (default: localhost:5173) |

## 🚀 Deployment

### Deploy to Railway/Render/Heroku

1. Push code to GitHub
2. Connect repository to hosting platform
3. Add environment variables
4. Deploy!

### Deploy to Vercel (Serverless)

This Express app can be adapted for Vercel serverless functions if needed.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License

## 👥 Support

For issues or questions:
- Email: cfs.kenya.ke@gmail.com
- Phone: +254 793794878

---

Made with ❤️ for Computer for Schools Kenya
