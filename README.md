# My Recipes 🍳

A modern full-stack recipe management application built with Node.js, React, and PostgreSQL. Featuring a clean, professional interface with Accenture purple branding.

## 🎯 Project Overview

This Recipe Management Platform demonstrates modern web development practices including:

- **Full-Stack Development**: Complete CRUD operations for recipe management
- **Modern Tech Stack**: Node.js, Express.js, React, Material-UI, PostgreSQL
- **Professional UI**: Clean interface with Accenture purple theme (#A100FF)
- **API Development**: RESTful API with comprehensive error handling
- **Database Design**: Normalized PostgreSQL schema with proper relationships
- **Component Architecture**: Reusable React components with context providers
- **Data Processing**: ETL pipeline for recipe data management

## 🚀 Features

### Core Functionality
- **Recipe Management**: Create, view, edit, and organize recipes with detailed information
- **Favorites System**: Save and manage personal favorite recipes with localStorage persistence
- **Search & Discovery**: Browse recipes with filtering and categorization
- **Responsive Design**: Mobile-friendly Material-UI interface with Accenture branding
- **Shopping Lists**: Generate ingredient lists from recipes
- **Recipe Details**: Comprehensive recipe information including ingredients, instructions, and timing

### Technical Features
- **Professional UI**: Accenture purple theme (#A100FF) throughout the application  
- **Data Persistence**: PostgreSQL database with normalized schema
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Loading States**: Smooth user experience with loading indicators
- **ETL Pipeline**: Python-based data processing and validation

## 🛠️ Technology Stack

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **PostgreSQL** - Relational database with UUID primary keys
- **Joi** - Input validation and schema validation
- **CORS** - Cross-Origin Resource Sharing configuration

### Frontend
- **React** - Component-based UI library with hooks
- **Material-UI (MUI)** - React component library with custom Accenture theme
- **React Router** - Client-side routing and navigation
- **Context API** - State management for recipes, notifications, and user preferences
- **Custom Hooks** - Reusable logic for favorites and shopping lists

### Database Design
- **Normalized Schema** - 5 tables with proper relationships and constraints
- **UUID Primary Keys** - Secure, globally unique identifiers  
- **JSONB Fields** - Flexible storage for complex recipe data
- **Foreign Key Constraints** - Data integrity and referential consistency

### ETL Pipeline
- **Python** - Data processing and transformation
- **Pandas** - Data manipulation and analysis
- **PostgreSQL** - Data storage and validation

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **PostgreSQL** (v12.0 or higher)
- **Python** (v3.8 or higher)
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/learning-my-recipes.git
cd learning-my-recipes
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all project dependencies
npm run install-all
```

### 3. Database Setup

#### Create PostgreSQL Database

```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE learning_my_recipes;
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE learning_my_recipes TO your_username;
```

#### Run Database Schema

```bash
# Navigate to database directory
cd database

# Run the schema (make sure PostgreSQL is running)
psql -U your_username -d learning_my_recipes -f schema.sql
```

### 4. Environment Configuration

#### Backend Configuration
```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials and API keys
```

#### Frontend Configuration
```bash
cd frontend
cp .env.example .env
# Edit .env with your configuration preferences
```

#### ETL Configuration
```bash
cd etl
cp .env.example .env
# Edit .env with your database credentials
```

### 5. Start Development Servers

```bash
# Start both frontend and backend in development mode
npm run dev

# Or start them individually:
npm run dev:backend  # Backend on http://localhost:3001
npm run dev:frontend # Frontend on http://localhost:3000
```

### 6. Verify Installation

- **Frontend**: Open http://localhost:3000
- **Backend API**: Open http://localhost:3001/api/health
- **Database**: Run the connection test script

```bash
cd backend
npm run db:setup
```

## 📂 Project Structure

```
learning-my-recipes/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── routes/            # API route handlers (recipes, ingredients)
│   │   ├── models/            # Database models (Recipe, Ingredient)
│   │   ├── validation/        # Joi validation schemas
│   │   ├── middleware/        # Custom middleware functions
│   │   └── scripts/           # Database setup and seeding scripts
│   ├── package.json
│   └── .env.example
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   │   └── layout/        # Layout components (Header, Sidebar, Footer)
│   │   ├── pages/             # Page components (Home, Recipes, Favorites)
│   │   ├── contexts/          # React Context providers
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API service functions
│   │   └── theme.js           # Material-UI Accenture theme
│   ├── public/
│   ├── package.json
│   └── .env.example
├── etl/                       # Python ETL pipeline
│   ├── DATA_MODEL.md          # Comprehensive database schema documentation
│   ├── etl_ingest_data.py     # Data processing and validation
│   ├── requirements.txt
│   └── .env.example
├── database/                  # Database schemas and migrations
│   └── schema.sql             # PostgreSQL table definitions
└── package.json              # Root package configuration
```

## 🗃️ Database Schema

The application uses a normalized PostgreSQL database with 5 main tables:

- **categories**: Recipe categories (Breakfast, Lunch, Dinner, etc.)
- **ingredients**: Master ingredient list with nutritional information
- **recipes**: Main recipe table with UUID primary keys
- **recipe_ingredients**: Junction table linking recipes to ingredients with quantities
- **recipe_versions**: Version control for recipe modifications

For detailed schema information, see [etl/DATA_MODEL.md](etl/DATA_MODEL.md).

## 🖥️ Application Pages

### Available Pages
- **Home** (`/`) - Welcome page with featured recipes and navigation
- **Recipes** (`/recipes`) - Browse all recipes with search and filtering
- **Recipe Details** (`/recipes/:id`) - Detailed recipe view with ingredients and instructions
- **Favorites** (`/favorites`) - Personal collection of saved favorite recipes
- **Create Recipe** (`/create`) - Form to add new recipes to the database
- **Edit Recipe** (`/edit/:id`) - Modify existing recipe information
- **Ingredients** (`/ingredients`) - Manage ingredient database
- **Shopping List** (`/shopping-list`) - Generate and manage shopping lists
- **Search** (`/search`) - Advanced recipe search functionality

### UI Theme
- **Primary Color**: Accenture Purple (#A100FF)
- **Secondary Colors**: Purple variants (#B833FF, #7B00CC)
- **Design**: Material-UI components with custom Accenture branding
- **Responsive**: Mobile-first design that works on all device sizes

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Backend Tests
```bash
cd backend
npm test
npm run test:coverage
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:coverage
```

## 🔧 Development Scripts

### Root Level Commands
- `npm run install-all` - Install dependencies for all packages
- `npm run dev` - Start both frontend and backend in development
- `npm run build` - Build production frontend
- `npm run lint` - Lint all code
- `npm run test` - Run all tests

### Backend Commands
- `npm run dev` - Start development server with nodemon
- `npm run db:setup` - Initialize database and run schema
- `npm run db:seed` - Seed database with sample recipes

### Frontend Commands
- `npm start` - Start development server
- `npm run build` - Create production build
- `npm run analyze` - Analyze bundle size

## 🌟 Project Evolution

This project has been developed incrementally across multiple Git branches:

1. **step-1**: Initial database setup and backend API foundation
2. **step-2**: Core recipe CRUD operations and data models
3. **step-3-frontend**: React frontend with Material-UI components
4. **step-4-final**: Complete application with Accenture branding, favorites system, and bug fixes

### Current Status (step-4-final)
- ✅ Professional UI with Accenture purple theme
- ✅ Complete favorites system functionality  
- ✅ Comprehensive database documentation
- ✅ Full CRUD operations for recipes and ingredients
- ✅ Responsive design with Material-UI
- ✅ Error handling and loading states

## 📖 API Documentation

The API documentation is available at `/api-docs` when the backend server is running in development mode.

### Key Endpoints

- `GET /api/recipes` - List recipes with pagination and filters
- `POST /api/recipes` - Create new recipe
- `GET /api/recipes/:id` - Get recipe details
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe
- `GET /api/ingredients` - List all ingredients
- `POST /api/ingredients` - Create new ingredient
- `GET /api/categories` - List recipe categories

## 🔐 Security & Data Features

- **Input Validation**: Comprehensive Joi schema validation for all API endpoints
- **SQL Injection Prevention**: Parameterized queries and proper ORM usage
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Data Integrity**: Foreign key constraints and normalized database design
- **Error Handling**: Graceful error handling with user-friendly messages
- **localStorage Security**: Client-side data persistence for favorites

## 🤝 Contributing

This is an educational project. If you'd like to contribute improvements:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running on port 5432
   - Verify database credentials in `.env`
   - Check if `learning_my_recipes` database exists

2. **CORS Errors**
   - Ensure backend is running on port 3001
   - Check that API endpoints use `/api/` prefix
   - Verify CORS is properly configured in backend

3. **Favorites Not Loading**
   - Check browser localStorage for `recipe-favorites`
   - Ensure API endpoints return correct data structure
   - Verify backend and frontend are both running

4. **Port Already in Use**
   - Change ports in `.env` files (Backend: 3001, Frontend: 3000)
   - Kill existing processes on Windows: `netstat -ano | findstr :3000`

5. **Dependencies Installation Failed**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall
   - Check Node.js version compatibility (v16+ recommended)

### Getting Help

- Check the [docs/](docs/) directory for detailed guides
- Review the planning documents for architecture decisions
- Open an issue for bugs or feature requests

## 🎓 Learning Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://reactjs.org/docs/)
- [Material-UI Documentation](https://mui.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/guide/)

---

**Happy Coding!** 🚀 This project is designed to give you hands-on experience with modern full-stack development. Take your time, experiment, and don't hesitate to break things - that's how we learn!