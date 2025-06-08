#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Frontend Setup Script"
echo "---------------------"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for .nvmrc file
if [ ! -f .nvmrc ]; then
    echo "Error: .nvmrc file not found in the current directory."
    echo "Please ensure you are running this script from the 'frontend' directory."
    exit 1
fi

NODE_VERSION=$(cat .nvmrc)
echo "Required Node.js version (from .nvmrc): $NODE_VERSION"

# NVM Setup
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    echo "Sourcing existing nvm..."
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"  # Source nvm
elif command_exists curl || command_exists wget; then
    echo "nvm not found. Installing nvm..."
    if command_exists curl; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    elif command_exists wget; then
        wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    fi
    # Source nvm after installation
    echo "Sourcing nvm after installation..."
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
else
    echo "Error: nvm not found and curl/wget are not available to install it."
    echo "Please install nvm manually: https://github.com/nvm-sh/nvm#installing-and-updating"
    exit 1
fi


echo "Installing Node.js version $NODE_VERSION (if necessary)..."
nvm install "$NODE_VERSION"
echo "Using Node.js version $NODE_VERSION..."
# nvm use "$NODE_VERSION" # This might be redundant if nvm install switches, and can cause issues in some CI/scripting environments
# nvm alias default "$NODE_VERSION" # Optionally set as default

# Re-source nvm.sh to ensure the current shell session recognizes the newly installed version for `nvm use` or path updates
# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"

# Explicitly use the version to ensure it's active in the current PATH for this script session
nvm use "$NODE_VERSION"

CURRENT_NODE_VERSION=$(node -v)
echo "Current active Node.js version: $CURRENT_NODE_VERSION"

# The version from .nvmrc might not have 'v' prefix, but `node -v` does.
if [ "$CURRENT_NODE_VERSION" != "v$NODE_VERSION" ] && [ "$CURRENT_NODE_VERSION" != "$NODE_VERSION" ]; then
    echo "Error: Failed to switch to Node.js version $NODE_VERSION (or v$NODE_VERSION)."
    echo "Active version is $CURRENT_NODE_VERSION."
    echo "Please check your nvm installation and try again."
    exit 1
fi

echo "Node.js setup complete."
echo ""
echo "Installing frontend dependencies using Yarn..."
if command_exists yarn; then
    yarn install --frozen-lockfile
    echo "Dependencies installed successfully."
else
    echo "Error: Yarn is not installed. Please install Yarn: https://classic.yarnpkg.com/en/docs/install"
    exit 1
fi

echo ""
echo "Frontend setup complete!"
