# Recipe App - Requirements Clarification

This document captures the interactive Q&A session to refine the recipe app requirements.

## Questions and Answers

### Question 1: Educational Progression Strategy
Since this is designed as a 10-day graduate training program with 5 branches maximum, how would you like to structure the learning progression? 

Should we:
A) Focus on full-stack fundamentals first (database → backend → frontend → integration → AI)?
B) Build feature-by-feature vertically (basic recipe CRUD → ingredient matching → shopping lists → AI enhancement)?
C) Start with a minimal viable product and progressively add complexity?

What specific learning objectives should each branch demonstrate to the students?

**Answer:** A) Focus on full-stack fundamentals first (database → backend → frontend → integration → AI)

### Question 2: Data Model Complexity
You mentioned storing user preferences, recipes, favorites, and recipe versions. For the educational context, how detailed should the data relationships be?

Should we include:
A) Basic relationships only (recipes, ingredients, user preferences)
B) Intermediate complexity (recipe categories, nutritional info, difficulty levels, cooking time)
C) Advanced relationships (recipe collections, meal planning, ingredient substitutions, user ratings/reviews)

What level of database design complexity would best serve the learning objectives without overwhelming new graduates?

**Answer:** B) Intermediate complexity (recipe categories, nutritional info, difficulty levels, cooking time)

### Question 3: Frontend Design Library Choice
You mentioned using an "interactive and modern looking design library" to make the project interesting for students. Which approach would you prefer?

A) Popular component libraries (Material-UI, Ant Design, Chakra UI) for rapid development
B) CSS frameworks (Tailwind CSS, Bootstrap) to teach styling fundamentals
C) Custom CSS with modern techniques (CSS Grid, Flexbox, CSS Variables) for deeper learning

What balance between learning frontend fundamentals vs. using industry-standard tools would be most valuable for the graduates?

**Answer:** A) Popular component libraries (Material-UI, Ant Design, Chakra UI) for rapid development

### Question 4: Recipe Search and Ingredient Matching
You mentioned users should be able to "find recipes based on the ingredients they have." How sophisticated should this matching algorithm be?

A) Simple exact matching (user has tomatoes → shows recipes containing tomatoes)
B) Partial matching with scoring (show recipes ranked by percentage of available ingredients)
C) Smart matching with substitutions (suggest recipes where missing ingredients have common substitutes)

Should the app also handle ingredient quantities, or focus primarily on ingredient presence for the educational scope?

**Answer:** A) Simple exact matching (user has tomatoes → shows recipes containing tomatoes)

### Question 5: Python ETL Script Scope
You mentioned a Python script to ingest the 20 hardcoded recipes into PostgreSQL. What level of ETL complexity should this demonstrate?

A) Basic script (read JSON → insert into database with minimal transformation)
B) Intermediate ETL (data validation, error handling, duplicate detection)
C) Advanced ETL (data cleaning, normalization, batch processing, logging)

Should this script also handle data updates/migrations, or focus on initial data loading for the educational demonstration?

**Answer:** B) Intermediate ETL (data validation, error handling, duplicate detection)

### Question 6: Documentation and Learning Materials
You emphasized creating "faculty and student notes" as the project progresses. What format and depth would be most valuable?

A) README files in each branch with setup instructions and key concepts
B) Detailed markdown docs explaining architecture decisions and learning objectives  
C) Interactive tutorials with code walkthroughs and exercises for students

Should the documentation focus more on "how to build this" or "why we made these technical choices" for the educational context?

**Answer:** B) Detailed markdown docs explaining architecture decisions and learning objectives

**Additional Requirements:**
- Use monorepo design pattern
- No Docker (due to Accenture laptop licensing requirements)

### Question 7: Monorepo Structure and Local Development
Given the monorepo approach and no Docker constraint, how should we structure the development environment?

A) Simple monorepo (frontend/, backend/, scripts/, docs/ in root with individual package.json files)
B) Workspace-based monorepo (using npm/yarn workspaces for dependency management)
C) Lerna-style monorepo (with shared tooling and cross-package dependencies)

For local development without Docker, should we provide setup scripts for PostgreSQL installation, or assume students will use cloud databases (like Supabase/Neon) for easier onboarding?

**Answer:** A) Simple monorepo (frontend/, backend/, scripts/, docs/ in root with individual package.json files)

### Question 8: Database Setup Strategy
Since we can't use Docker and need PostgreSQL, what's the best approach for student onboarding in the Accenture environment?

A) Local PostgreSQL installation with detailed setup guides for Windows
B) Cloud database service (Supabase, Neon, or similar) with connection strings
C) Provide both options - cloud for quick start, local for advanced students

Which approach would minimize setup friction while still providing valuable database learning experiences?

**Answer:** A) Local PostgreSQL installation with detailed setup guides for Windows

### Question 9: OpenAI Integration Scope
For the final GenerativeAI feature using OpenAI, what level of sophistication should we target?

A) Basic prompt engineering (send ingredients list → get recipe suggestions)
B) Structured AI integration (ingredient analysis, dietary preferences, portion sizing)
C) Advanced AI features (recipe customization, nutritional optimization, cooking tips)

Should this feature be a separate microservice, or integrated directly into the Express backend for simplicity?

**Answer:** A) Basic prompt engineering (send ingredients list → get recipe suggestions), integrated directly into the Express backend for simplicity

## Requirements Summary

Based on our clarification session, here are the finalized requirements:

1. **Architecture**: Full-stack fundamentals progression (database → backend → frontend → integration → AI)
2. **Data Model**: Intermediate complexity with categories, nutritional info, difficulty levels, cooking time
3. **Frontend**: Component libraries (Material-UI/Ant Design/Chakra UI) for rapid development
4. **Search**: Simple exact ingredient matching for educational focus
5. **ETL**: Intermediate complexity with validation, error handling, duplicate detection
6. **Documentation**: Detailed markdown docs explaining architecture decisions and learning objectives
7. **Structure**: Simple monorepo with individual package.json files
8. **Database**: Local PostgreSQL with Windows setup guides
9. **AI Integration**: Basic OpenAI prompt engineering integrated into Express backend
10. **Constraints**: No Docker, monorepo design, 5 branches maximum
