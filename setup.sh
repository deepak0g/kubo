#!/bin/bash

# Kubo Risk Scoring Engine - Setup Script

echo "🚀 Setting up Kubo Risk Scoring Engine..."
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install || npm install
echo ""

# Generate Prisma client
echo "⚙️  Generating Prisma client..."
npx prisma generate
echo ""

# Create database
echo "🗄️  Creating database..."
npx prisma db push
echo ""

# Seed database
echo "🌱 Seeding test data..."
npx tsx src/scripts/seedData.ts
echo ""

echo "✅ Setup complete!"
echo ""
echo "To start the server:"
echo "  npx tsx src/index.ts"
echo ""
echo "Or with Docker:"
echo "  docker-compose up --build"
echo ""
