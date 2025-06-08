#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Dependency Versions for Backend
GO_MIN_VERSION="1.21"
BUF_CLI_VERSION_TAG="latest"
PROTOC_GEN_GO_VERSION="v1.28"
PROTOC_GEN_GO_GRPC_VERSION="v1.2"
MOCKERY_PACKAGE="github.com/vektra/mockery/v3" # User specified mockery/v3
MOCKERY_VERSION="v3.3.2" # User specified v3.3.2 for mockery/v3

echo "Starting backend environment setup..."

# Check for Go and install if not found
if ! command -v go &> /dev/null
then
    echo "Go could not be found. Please install Go version ${GO_MIN_VERSION} or higher."
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
    go install github.com/bufbuild/buf/cmd/buf@"${BUF_CLI_VERSION_TAG}"
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
echo "Installing Go plugins for Protocol Buffers..."
go install google.golang.org/protobuf/cmd/protoc-gen-go@"${PROTOC_GEN_GO_VERSION}"
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@"${PROTOC_GEN_GO_GRPC_VERSION}"
echo "Ensure that $(go env GOPATH)/bin is in your PATH for protoc Go plugins to be found."

# Install mockery
echo "Installing mockery..."
go install "${MOCKERY_PACKAGE}"@"${MOCKERY_VERSION}"
echo "Ensure that $(go env GOPATH)/bin is in your PATH for mockery to be found."


# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
go mod download
cd ..

# Generate Go code from Protocol Buffer definitions
echo "Generating Go code from Protocol Buffer definitions..."
# Assuming buf is installed and in PATH by now
if command -v buf &> /dev/null
then
    buf generate
else
    echo "buf command not found. Skipping proto generation. Please install buf and run 'buf generate' manually."
fi

# Run mockery
echo "Running mockery..."
cd backend
# Assuming mockery is in PATH after go install
if command -v mockery &> /dev/null
then
    mockery
else
    echo "mockery command not found. Skipping mockery execution. Ensure $(go env GOPATH)/bin is in your PATH."
fi
cd ..

# Copy example environment files
echo "Copying backend example environment file..."
if [ -f "backend/.env.example" ] && [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "Copied backend/.env.example to backend/.env"
else
    echo "backend/.env already exists or .env.example not found."
fi

echo ""
echo "---------------------------------------------------------------------"
echo "Backend environment setup script finished."
echo "---------------------------------------------------------------------"
echo ""
echo "Next steps:"
echo "1. Manually review and update the following environment file with your specific configurations:"
echo "   - backend/.env"
echo "2. If you use Docker, ensure Docker Desktop (or Docker Engine) is installed and running."
echo "   You might want to run services using: docker-compose up -d (if applicable to backend)"
echo "3. Ensure your Go environment is correctly set up (GOPATH, GOBIN in PATH)."
echo "4. If 'buf generate' or 'mockery' failed, ensure necessary tools are installed and in your PATH, then run them manually."
echo ""
echo "If you encounter any issues, please refer to the README or specific documentation for each technology."
echo "---------------------------------------------------------------------"
