#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Dependency Versions for Frontend
NVM_VERSION="v0.39.3"
# Node.js version is read from .nvmrc
NODE_VERSION_FROM_FILE=$(cat .nvmrc | xargs)
# Yarn package for global npm install
YARN_PACKAGE="yarn"

echo "Starting frontend environment setup..."

# Check for NVM and install if not found
if ! command -v nvm &> /dev/null
then
    echo "NVM could not be found. Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/"${NVM_VERSION}"/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
else
    echo "NVM is already installed."
fi

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install and use Node.js version from .nvmrc
echo "Installing and using Node.js version from .nvmrc..."
echo "Using Node.js version: '$NODE_VERSION_FROM_FILE' (read from .nvmrc)"
nvm install "$NODE_VERSION_FROM_FILE"
nvm use "$NODE_VERSION_FROM_FILE"

# Check for Yarn and install if not found
if ! command -v yarn &> /dev/null
then
    echo "Yarn could not be found. Installing Yarn..."
    npm install --global "${YARN_PACKAGE}"
else
    echo "Yarn is already installed."
fi

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
yarn install
cd ..

# Copy example environment files
echo "Copying frontend example environment file..."
if [ -f "frontend/.env.example" ] && [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    echo "Copied frontend/.env.example to frontend/.env"
else
    echo "frontend/.env already exists or .env.example not found."
fi

echo ""
echo "---------------------------------------------------------------------"
echo "Frontend environment setup script finished."
echo "---------------------------------------------------------------------"
echo ""
echo "Next steps:"
echo "1. Manually review and update the following environment file with your specific configurations:"
echo "   - frontend/.env"
echo "2. For frontend development, you can typically start the development server with: cd frontend && yarn start"
echo "3. For iOS development, additional setup might be needed. Check frontend/ios/ci_scripts/ci_post_clone.sh for clues."
echo ""
echo "If you encounter any issues, please refer to the README or specific documentation for each technology."
echo "---------------------------------------------------------------------"
