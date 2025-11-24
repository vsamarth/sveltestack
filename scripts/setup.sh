#!/usr/bin/env bash

set -e

echo "🚀 SvelteStack Setup Script"
echo "==========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print error and exit
error_exit() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    exit 1
}

# Function to print success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 20 ]; then
        success "Node.js $(node --version) found"
    else
        error_exit "Node.js version must be >= 20. Current version: $(node --version)"
    fi
else
    error_exit "Node.js is not installed. Please install Node.js >= 20"
fi

# Check Bun
if command_exists bun; then
    success "Bun $(bun --version) found"
    PKG_MANAGER="bun"
else
    warning "Bun is not installed. Falling back to npm"
    PKG_MANAGER="npm"
fi

# Check Docker
if command_exists docker; then
    if docker info >/dev/null 2>&1; then
        success "Docker is installed and running"
    else
        error_exit "Docker is installed but not running. Please start Docker"
    fi
else
    error_exit "Docker is not installed. Please install Docker with Docker Compose"
fi

# Check Docker Compose
if docker compose version >/dev/null 2>&1; then
    success "Docker Compose found"
elif command_exists docker-compose; then
    success "Docker Compose found (legacy)"
else
    error_exit "Docker Compose is not installed. Please install Docker Compose"
fi

echo ""
echo "✅ All prerequisites met!"
echo ""

# Check for .env file
echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
    warning ".env file not found"
    echo "Creating .env file from .env.example..."
    
    if [ ! -f .env.example ]; then
        error_exit ".env.example file not found"
    fi
    
    # Copy .env.example to .env
    cp .env.example .env
    
    # Generate a random secret for BETTER_AUTH_SECRET
    RANDOM_SECRET=$(openssl rand -base64 32)
    
    # Replace the empty BETTER_AUTH_SECRET with the generated one
    if command_exists sed; then
        # macOS/BSD sed requires -i with an extension, Linux doesn't
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$RANDOM_SECRET|" .env
        else
            sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$RANDOM_SECRET|" .env
        fi
    fi
    
    success "Created .env file from template"
    success "Generated random BETTER_AUTH_SECRET"
    warning "⚠️  Please review and update .env with your actual credentials if needed"
else
    success ".env file already exists"
fi

echo ""

# Install dependencies
echo "📦 Installing dependencies..."
if [ "$PKG_MANAGER" = "bun" ]; then
    bun install
else
    npm install
fi
success "Dependencies installed"

echo ""

# Start con
echo "🗄️  Starting database..."
if [ "$PKG_MANAGER" = "bun" ]; then
    bun db:start
else
    npm run db:start
fi
success "Database started"

echo ""

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run migrations
echo "🔄 Running database migrations..."
if [ "$PKG_MANAGER" = "bun" ]; then
    bun db:push
else
    npm run db:push
fi
success "Database migrations completed"

echo ""

# Ask about seeding
read -p "Would you like to seed the database with sample data? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    if [ "$PKG_MANAGER" = "bun" ]; then
        bun db:seed
    else
        npm run db:seed
    fi
    success "Database seeded"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the development server, run:"
if [ "$PKG_MANAGER" = "bun" ]; then
    echo "  bun dev"
else
    echo "  npm run dev"
fi
echo ""
echo "Visit http://localhost:5173 to see your app"
echo ""
