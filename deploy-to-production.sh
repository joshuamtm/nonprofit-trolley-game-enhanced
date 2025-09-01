#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Nonprofit Trolley Game - Production Deployment Script${NC}"
echo "=================================================="

# Step 1: Login to Railway
echo -e "\n${YELLOW}Step 1: Railway Login${NC}"
echo "Please login to Railway when the browser opens..."
railway login

# Check if login was successful
if ! railway whoami > /dev/null 2>&1; then
    echo -e "${RED}❌ Railway login failed. Please try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Railway login successful!${NC}"

# Step 2: Create Railway project
echo -e "\n${YELLOW}Step 2: Creating Railway Project${NC}"
cd server
railway link

# If project doesn't exist, create it
if [ $? -ne 0 ]; then
    echo "Creating new Railway project..."
    railway init -n nonprofit-trolley-backend
fi

# Step 3: Set up Neon database
echo -e "\n${YELLOW}Step 3: Setting up Neon Database${NC}"
echo "Please:"
echo "1. Go to https://neon.tech"
echo "2. Sign up/login with GitHub"
echo "3. Create a new project called 'nonprofit-trolley-game'"
echo "4. Copy the connection string (looks like postgresql://...)"
echo ""
read -p "Paste your Neon connection string here: " DATABASE_URL

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Step 4: Set Railway environment variables
echo -e "\n${YELLOW}Step 4: Setting Railway Environment Variables${NC}"
railway variables set DATABASE_URL="$DATABASE_URL"
railway variables set PORT=3001
railway variables set CLIENT_URL=https://nonprofit-trolley-game.netlify.app
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set NODE_ENV=production

echo -e "${GREEN}✅ Environment variables set!${NC}"

# Step 5: Deploy to Railway
echo -e "\n${YELLOW}Step 5: Deploying to Railway${NC}"
railway up -d

# Get the Railway URL
echo -e "\n${YELLOW}Step 6: Getting Railway URL${NC}"
RAILWAY_URL=$(railway domain)

if [ -z "$RAILWAY_URL" ]; then
    echo "Generating Railway domain..."
    railway domain
    RAILWAY_URL=$(railway domain)
fi

echo -e "${GREEN}✅ Railway URL: https://$RAILWAY_URL${NC}"

# Step 7: Update frontend with backend URL
echo -e "\n${YELLOW}Step 7: Updating Frontend Configuration${NC}"
cd ../client

# Create production env file
cat > .env.production << EOF
REACT_APP_API_URL=https://$RAILWAY_URL/api
REACT_APP_ENVIRONMENT=production
EOF

echo -e "${GREEN}✅ Frontend configuration updated!${NC}"

# Step 8: Build and deploy frontend
echo -e "\n${YELLOW}Step 8: Building and Deploying Frontend${NC}"
npm run build

# Set Netlify environment variable
netlify env:set REACT_APP_API_URL "https://$RAILWAY_URL/api"

# Deploy to Netlify
netlify deploy --prod --dir=build

echo -e "\n${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo "=================================================="
echo -e "${GREEN}Backend URL:${NC} https://$RAILWAY_URL"
echo -e "${GREEN}Frontend URL:${NC} https://nonprofit-trolley-game.netlify.app"
echo -e "${GREEN}Database:${NC} Neon PostgreSQL"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test room creation at https://nonprofit-trolley-game.netlify.app"
echo "2. Check Railway logs: railway logs"
echo "3. Check database: Visit Neon dashboard"
echo ""
echo -e "${GREEN}Saved credentials:${NC}"
echo "JWT_SECRET: $JWT_SECRET"
echo "DATABASE_URL: $DATABASE_URL"