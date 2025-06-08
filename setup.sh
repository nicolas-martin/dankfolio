#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting environment setup..."

# Frontend setup
echo "Setting up frontend..."

# Check for NVM and install if not found
if ! command -v nvm &> /dev/null
then
    echo "NVM could not be found. Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
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
nvm install
nvm use

# Check for Yarn and install if not found
if ! command -v yarn &> /dev/null
then
    echo "Yarn could not be found. Installing Yarn..."
    npm install --global yarn
else
    echo "Yarn is already installed."
fi

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
yarn install
cd ..

# Backend setup
echo "Setting up backend..."

# Check for Go and install if not found
if ! command -v go &> /dev/null
then
    echo "Go could not be found. Please install Go version 1.21 or higher."
    echo "Visit https://golang.org/doc/install for installation instructions."
    # Add platform-specific installation instructions if desired
    # Example for Ubuntu:
    # sudo apt update
    # sudo apt install golang-go
    # Example for macOS (using Homebrew):
    # brew install go
else
    echo "Go is already installed."
    # Optionally, add a version check here
    # go version
fi

# Check for buf CLI and install if not found
if ! command -v buf &> /dev/null
then
    echo "buf CLI could not be found. Installing buf CLI..."
    # Instructions from https://buf.build/docs/installation
    # This installs to ~/go/bin by default, ensure this is in your PATH
    # Adjust if your GOPATH or GOBIN is different
    go install github.com/bufbuild/buf/cmd/buf@latest
    # You might need to add ~/go/bin to your PATH if it's not already:
    # echo 'export PATH="$PATH:$(go env GOPATH)/bin"' >> ~/.bashrc && source ~/.bashrc
    # Or for zsh:
    # echo 'export PATH="$PATH:$(go env GOPATH)/bin"' >> ~/.zshrc && source ~/.zshrc
    echo "Make sure $(go env GOPATH)/bin is in your PATH to use buf."
else
    echo "buf CLI is already installed."
fi


# Install protoc and Go plugins for Protocol Buffers
echo "Installing protoc and Go plugins for Protocol Buffers..."
# Check for protoc
if ! command -v protoc &> /dev/null
then
    echo "protoc could not be found. Please install it."
    echo "For macOS: brew install protobuf"
    echo "For Linux: sudo apt install -y protobuf-compiler"
    echo "Or download from https://github.com/protocolbuffers/protobuf/releases"
else
    echo "protoc is already installed."
fi

# Install Go plugins
go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.28
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.2

echo "Ensure that $(go env GOPATH)/bin is in your PATH for protoc Go plugins to be found."


# Generate Go code from Protocol Buffer definitions
echo "Generating Go code from Protocol Buffer definitions..."
# Assuming buf is installed and in PATH by now
if command -v buf &> /dev/null
then
    buf generate
else
    echo "buf command not found. Skipping proto generation. Please install buf and run 'buf generate' manually."
fi


# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
go mod download
cd ..

# Copy example environment files
echo "Copying example environment files..."
if [ -f "frontend/.env.example" ] && [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    echo "Copied frontend/.env.example to frontend/.env"
else
    echo "frontend/.env already exists or .env.example not found."
fi

if [ -f "backend/.env.example" ] && [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "Copied backend/.env.example to backend/.env"
else
    echo "backend/.env already exists or .env.example not found."
fi

echo ""
echo "---------------------------------------------------------------------"
echo "Environment setup script finished."
echo "---------------------------------------------------------------------"
echo ""
echo "Next steps:"
echo "1. Manually review and update the following environment files with your specific configurations:"
echo "   - frontend/.env"
echo "   - backend/.env"
echo "2. If you use Docker, ensure Docker Desktop (or Docker Engine) is installed and running."
echo "   You might want to run services using: docker-compose up -d"
echo "3. For backend development, ensure your Go environment is correctly set up (GOPATH, GOBIN in PATH)."
echo "4. For frontend development, you can typically start the development server with: cd frontend && yarn start"
echo "5. For iOS development, additional setup might be needed. Check frontend/ios/ci_scripts/ci_post_clone.sh for clues."
echo "6. If 'buf generate' failed, ensure 'buf' and 'protoc' (and its Go plugins) are installed and in your PATH, then run 'buf generate' manually."
echo ""
echo "If you encounter any issues, please refer to the README or specific documentation for each technology."
echo "---------------------------------------------------------------------"
