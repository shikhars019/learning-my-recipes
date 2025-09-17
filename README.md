# Learning My Recipes 🍳

A comprehensive full-stack recipe application built for educational purposes, demonstrating modern web development practices with Node.js, React, and PostgreSQL.

## 📚 Educational Purpose

This project serves as a hands-on learning experience for graduate engineers, covering:

- **Full-Stack Development**: Complete web application development cycle
- **Modern Tech Stack**: Node.js, Express.js, React, Material-UI, PostgreSQL
- **API Development**: RESTful API design and implementation
- **Database Design**: Relational database modeling and optimization
- **Frontend Frameworks**: Component-based UI development
- **Data Processing**: ETL pipeline with Python
- **AI Integration**: OpenAI API integration for recipe generation

## 🚀 Features

### Core Features
- **Recipe Management**: Create, edit, and organize recipes
- **User Authentication**: Secure user registration and login
- **Search & Filtering**: Advanced recipe search and categorization
- **Reviews & Ratings**: Community feedback system
- **Favorites**: Personal recipe collections
- **Responsive Design**: Mobile-friendly Material-UI interface

### Advanced Features
- **AI Recipe Generation**: Generate recipes using OpenAI
- **Ingredient Matching**: Smart ingredient-based recipe suggestions
- **Nutritional Information**: Detailed nutritional data
- **ETL Pipeline**: Automated data processing and validation

## 🛠️ Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **PostgreSQL** - Relational database
- **JWT** - Authentication tokens
- **Joi** - Data validation
- **OpenAI API** - AI recipe generation

### Frontend
- **React** - Component-based UI library
- **Material-UI (MUI)** - React component library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Formik** - Form handling
- **React Query** - Data fetching and caching

### ETL Pipeline
- **Python** - Data processing
- **Pandas** - Data manipulation
- **Pydantic** - Data validation
- **PostgreSQL** - Data storage

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
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Custom middleware
│   │   └── config/         # Configuration files
│   ├── package.json
│   └── .env.example
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page components
│   │   └── services/       # API service functions
│   ├── public/
│   ├── package.json
│   └── .env.example
├── etl/                    # Python ETL pipeline
│   ├── requirements.txt
│   └── .env.example
├── database/               # Database schemas and migrations
│   └── schema.sql
├── docs/                   # Documentation
├── planning/               # Project planning documents
└── package.json           # Root package configuration
```

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
- `npm run db:setup` - Initialize database
- `npm run db:reset` - Reset and seed database

### Frontend Commands
- `npm start` - Start development server
- `npm run build` - Create production build
- `npm run analyze` - Analyze bundle size

## 🌟 Learning Path

This project is designed to be built incrementally across 5 Git branches:

1. **Branch 1**: Database & Backend API Setup
2. **Branch 2**: Frontend Foundation & Authentication
3. **Branch 3**: Recipe CRUD Operations
4. **Branch 4**: Advanced Features (Search, Reviews, Favorites)
5. **Branch 5**: AI Integration & ETL Pipeline

Each branch builds upon the previous, introducing new concepts and technologies progressively.

## 📖 API Documentation

The API documentation is available at `/api-docs` when the backend server is running in development mode.

### Key Endpoints

- `GET /api/recipes` - List recipes with pagination and filters
- `POST /api/recipes` - Create new recipe
- `GET /api/recipes/:id` - Get recipe details
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/ingredients` - List ingredients
- `POST /api/reviews` - Create review

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting
- CORS configuration
- SQL injection prevention

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
   - Ensure PostgreSQL is running
   - Verify database credentials in `.env`
   - Check if database exists

2. **Port Already in Use**
   - Change ports in `.env` files
   - Kill existing processes: `lsof -ti:3000 | xargs kill -9`

3. **Dependencies Installation Failed**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall

4. **Frontend Build Errors**
   - Check Node.js version compatibility
   - Verify all dependencies are installed

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