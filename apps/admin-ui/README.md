# Catalog Admin UI

A modern React-based admin interface for managing product catalogs with authentication, search, and CRUD operations.

## Features

- 🔐 **Authentication**: JWT-based login with role-based access control
- 📦 **Product Management**: Create, read, update, and delete products
- 🔍 **Search & Pagination**: Efficient product discovery with real-time search
- 🎨 **Modern UI**: Responsive design with clean, professional interface
- 🛡️ **Security**: Protected routes, input validation, and secure API communication
- ⚡ **Performance**: Optimized with React best practices and efficient state management

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: CSS Modules with modern design system
- **State Management**: React Context API
- **HTTP Client**: Native Fetch API with custom error handling
- **Testing**: Playwright for E2E tests
- **Code Quality**: ESLint, TypeScript strict mode

## Prerequisites

- Node.js 20.19+ or 22.12+
- Backend API server running on `http://localhost:8080`
- Backend must provide JWT authentication endpoints

## Backend API Requirements

The application expects a backend API with the following endpoints:

### Authentication Endpoints
```
POST /auth/login
- Body: { username: string, password: string }
- Response: { access_token: string, user: { id, username, email, roles } }

POST /auth/refresh
- Headers: Authorization: Bearer <token>
- Response: { access_token: string }
```

### Product Endpoints (All require Bearer token)
```
GET    /v1/products?page=1&pageSize=10&search=term
POST   /v1/products
GET    /v1/products/{id}
PUT    /v1/products/{id}
DELETE /v1/products/{id}
```

### Product Data Structure
```typescript
interface ProductDto {
  id: string
  sku: string
  name: string
  description?: string
  price: number
  currency: string
  stockQty: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

## Installation

1. **Clone and navigate**:
   ```bash
   cd apps/admin-ui
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (optional):
   Create a `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL=http://localhost:8080
   ```

4. **Start the backend API** on `http://localhost:8080`

5. **Start the development server**:
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

## Usage

### Authentication
1. Open the application in your browser
2. Enter your admin credentials
3. The system requires users with `ADMIN` role for access

### Product Management
- **View Products**: Browse paginated product list with search
- **Search**: Use the search bar to filter products by name
- **Edit Products**: Click "Edit" on any product to modify details
- **Navigation**: Use pagination controls for large product sets

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Protected Routes**: Admin-only access with role validation
- **Input Validation**: Client-side validation for all forms
- **Error Boundaries**: Graceful error handling and recovery
- **Secure Headers**: Automatic security headers for API requests

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── LoginForm.tsx   # Authentication form
│   ├── ProtectedRoute.tsx # Route protection
│   └── ErrorBoundary.tsx # Error handling
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication state
├── services/           # API and external services
│   └── api.ts         # API client
├── types/             # TypeScript type definitions
│   └── api.ts        # API types
├── App.tsx           # Main application component
├── App.css          # Application styles
└── main.tsx        # Application entry point
```

### Code Quality

The project enforces strict TypeScript configuration and ESLint rules:

- **TypeScript**: Strict mode with no unused variables/locals
- **ESLint**: React hooks, accessibility, and best practices
- **Imports**: Type-only imports for better tree-shaking

### Testing

End-to-end tests are written with Playwright:

```bash
# Run tests (requires backend running)
npx playwright test

# Run tests in headed mode
npx playwright test --headed

# Generate test report
npx playwright show-report
```

Test scenarios include:
- Login functionality
- Product listing and search
- Responsive design validation
- Error state handling

## Security Considerations

### Authentication & Authorization
- JWT tokens are stored in localStorage (consider httpOnly cookies for production)
- Automatic token refresh mechanism
- Role-based access control (ADMIN role required)
- Secure logout with token cleanup

### API Security
- All API calls include Authorization headers when authenticated
- Proper error handling without exposing sensitive information
- Input validation on both client and server side
- HTTPS enforcement recommended for production

### Client Security
- Content Security Policy considerations
- XSS protection through React's automatic escaping
- CSRF protection via proper authentication headers
- Input sanitization and validation

## Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Serve static files** from the `dist/` directory

3. **Environment Configuration**:
   - Set `VITE_API_BASE_URL` to your production API URL
   - Ensure HTTPS is used in production
   - Configure proper CORS settings on the backend

4. **Web Server Configuration**:
   - Enable gzip compression
   - Set appropriate cache headers
   - Configure security headers (CSP, HSTS, etc.)

## Troubleshooting

### Common Issues

**"Failed to fetch" errors**:
- Ensure the backend API is running on the correct port
- Check CORS configuration on the backend
- Verify network connectivity

**Authentication issues**:
- Verify JWT token format from backend
- Check user roles include "ADMIN"
- Clear localStorage and retry login

**Build failures**:
- Ensure Node.js version meets requirements
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Development Tips

- Use browser DevTools for debugging
- Check Network tab for API request/response details
- Use React DevTools for component inspection
- Monitor console for authentication and API errors

## Contributing

1. Follow the existing code style and TypeScript strictness
2. Add tests for new features
3. Update documentation for API changes
4. Ensure all linting passes before submitting

## License

This project is part of the monorepo and follows the same licensing terms.