#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# set -x

# Build log file path
BUILD_LOG_FILE="/tmp/build.log"

# Function to send callback using jq for safe JSON encoding
send_callback() {
    local exit_code=$?
    local status="success"
    if [ $exit_code -ne 0 ]; then
        status="error"
    fi
    
    if [ ! -z "$HOSTLY_CALLBACK_URL" ]; then
        # Read build logs (limit to last 50KB to avoid payload size issues)
        local logs=""
        if [ -f "$BUILD_LOG_FILE" ]; then
            logs=$(tail -c 51200 "$BUILD_LOG_FILE")
        fi
        
        # Build JSON payload safely using jq
        local payload
        payload=$(jq -n \
            --arg status "$status" \
            --argjson exit_code "$exit_code" \
            --arg deployment_id "${HOSTLY_DEPLOYMENT_ID:-}" \
            --arg logs "$logs" \
            '{
                status: $status,
                exit_code: $exit_code
            } + (if $deployment_id != "" then {deployment_id: $deployment_id} else {} end)
              + (if $logs != "" then {logs: $logs} else {} end)'
        )
        
        # Send callback with timeout
        curl -s --max-time 10 -X POST "$HOSTLY_CALLBACK_URL" \
            -H "Content-Type: application/json" \
            -d "$payload" || {
            echo "Warning: Callback failed to send, but continuing..."
        }
    fi
}

# Function to send initial callback
send_initial_callback() {
    if [ ! -z "$HOSTLY_CALLBACK_URL" ]; then
        # Build JSON payload safely using jq
        local payload
        payload=$(jq -n \
            --arg status "started" \
            --argjson exit_code 0 \
            --arg deployment_id "${HOSTLY_DEPLOYMENT_ID:-}" \
            '{
                status: $status,
                exit_code: $exit_code
            } + (if $deployment_id != "" then {deployment_id: $deployment_id} else {} end)'
        )
        
        # Use || true to prevent set -e from exiting on curl failure
        response=$(curl -s --max-time 5 -X POST "$HOSTLY_CALLBACK_URL" \
            -H "Content-Type: application/json"  \
            -d "$payload") || true
        
        if [ -n "$response" ]; then
            echo "Initial callback response: $response"
        else
            echo "Warning: Initial callback failed to send, but continuing..."
        fi
    fi
}

# Function to upload to S3
upload_to_s3() {
    local source_dir=$1
    local sha=$2
    
    if [ -z "$HOSTLY_S3_BUCKET" ]; then
        echo "Error: HOSTLY_S3_BUCKET environment variable is not set."
        exit 1
    fi
    
    echo "Uploading build to S3 bucket: $HOSTLY_S3_BUCKET"
    aws s3 sync "$source_dir" "s3://$HOSTLY_S3_BUCKET/$sha/" --delete
    echo "Upload to S3 completed successfully."
}

# Set up trap to catch script exit
trap send_callback EXIT

# Check if the 'HOSTLY_REPO_URL' environment variable is set.
if [ -z "$HOSTLY_REPO_URL" ]; then
    echo "Error: The environment variable 'HOSTLY_REPO_URL' is not set."
    exit 1
fi

# Check if S3 bucket is configured
if [ -z "$HOSTLY_S3_BUCKET" ]; then
    echo "Error: The environment variable 'HOSTLY_S3_BUCKET' is not set."
    exit 1
fi

# Default build type to static if not specified
if [ -z "$HOSTLY_BUILD_TYPE" ]; then
    echo "HOSTLY_BUILD_TYPE not set, defaulting to 'static'"
    HOSTLY_BUILD_TYPE="static"
fi

# Send initial callback
send_initial_callback

# Start logging all output to build log file
exec > >(tee -a "$BUILD_LOG_FILE") 2>&1
echo "=== Build started at $(date) ==="

# Clone the repository using the URL provided in the 'HOSTLY_REPO_URL' environment variable into a folder named clone
git clone --depth 1 "$HOSTLY_REPO_URL" clone
# Change the working directory to the 'clone' folder
cd clone

# Checkout the commit SHA provided in the 'HOSTLY_REPO_SHA' environment variable
if [ ! -z "$HOSTLY_REPO_SHA" ]; then
  git checkout $HOSTLY_REPO_SHA
fi

# If SHA not provided, get the current SHA
if [ -z "$HOSTLY_REPO_SHA" ]; then
  HOSTLY_REPO_SHA=$(git rev-parse HEAD)
fi

# Set up FNM path and environment
FNM_PATH="/root/.local/share/fnm"
if [ -d "$FNM_PATH" ]; then
  export PATH="$FNM_PATH:$PATH"
  eval "`fnm env --shell bash`"
fi

# Install Node.js directly - try default install first, fall back to Node.js 20
fnm install &> /dev/null || fnm install 20
fnm use default &> /dev/null || fnm use 20

# Now that Node.js is installed, get the actual version for later use
DETECTED_NODE_VERSION=$(node -v | cut -d 'v' -f2 | cut -d '.' -f1)
echo "Using Node.js version: $DETECTED_NODE_VERSION"

# If version is outside supported range, set to 20
if [ -z "$DETECTED_NODE_VERSION" ] || [ "$DETECTED_NODE_VERSION" -lt 14 ] || [ "$DETECTED_NODE_VERSION" -gt 20 ]; then
    DETECTED_NODE_VERSION="20"
    echo "Setting default Node.js version: $DETECTED_NODE_VERSION"
    fnm install 20
    fnm use 20
fi

# Check if this is a Node.js project
if [ ! -f "package.json" ]; then
    echo "No package.json found - treating as static repository"
    
    # Create temporary build directory
    BUILD_OUTPUT_DIR="/tmp/build_output"
    rm -rf "$BUILD_OUTPUT_DIR"
    mkdir -p "$BUILD_OUTPUT_DIR"
    
    echo "Copying all files to temporary build directory"
    cp -r . "$BUILD_OUTPUT_DIR"
    
    # Create metadata file
    echo "{\"type\":\"static\",\"sha\":\"$HOSTLY_REPO_SHA\",\"buildType\":\"static\"}" > "$BUILD_OUTPUT_DIR/hostly.json"
    
    # Upload to S3
    upload_to_s3 "$BUILD_OUTPUT_DIR" "$HOSTLY_REPO_SHA"
    
    echo "Static files uploaded successfully."
    exit 0
fi

# Check for python requirements
if [ -f "requirements.txt" ]; then
    echo "Found requirements.txt. Installing Python dependencies..."
    # Check if pip exists
    if command -v pip &> /dev/null; then
        pip install -r requirements.txt
    else
        echo "Warning: pip not found, skipping Python dependency installation."
    fi
fi

# Attempt to auto-configure Next.js static export
if [ -f "package.json" ]; then
    echo "Checking for Next.js auto-configuration..."
    node /app/inject-config.js || echo "Warning: Auto-configuration failed, continuing..."
fi

# Download the dependencies
echo "Installing Node.js dependencies..."
if [ -f yarn.lock ]; then 
    echo "Detected yarn.lock"; yarn install; \
elif [ -f package-lock.json ]; then 
    echo "Detected package-lock.json"; npm install; \
elif [ -f pnpm-lock.yaml ]; then 
    echo "Detected pnpm-lock.yaml"; npm install -g pnpm && pnpm install; \
else 
    if [ -f package.json ]; then
        echo "No lockfile found, using npm install"; npm install;
    else
        echo "No package.json found, skipping Node.js install."; 
    fi
fi

NO_BUILD=false

# Build the project
if [ -f yarn.lock ]; then
  # Check if build script exists for yarn
  if grep -q "\"build\":" package.json; then
    echo "Running yarn build"
    yarn build
  else
    NO_BUILD=true
    echo "No build script found in package.json, skipping build step"
  fi
elif [ -f package-lock.json ]; then
  # Check if build script exists for npm
  if grep -q "\"build\":" package.json; then
    echo "Running npm run build"
    npm run build
  else
    NO_BUILD=true   
    echo "No build script found in package.json, skipping build step"
  fi
elif [ -f pnpm-lock.yaml ]; then
  # Check if build script exists for pnpm
  if grep -q "\"build\":" package.json; then
    echo "Running pnpm run build"
    pnpm run build
  else
    NO_BUILD=true
    echo "No build script found in package.json, skipping build step"
  fi
else
  NO_BUILD=true
  echo "Lockfile not found."
fi

# Remove node_modules before copying files
echo "Removing node_modules directory to reduce size"
rm -rf node_modules
rm -rf .git

# Create temporary build output directory
BUILD_OUTPUT_DIR="/tmp/build_output"
rm -rf "$BUILD_OUTPUT_DIR"
mkdir -p "$BUILD_OUTPUT_DIR"

# Determine build output handling based on HOSTLY_BUILD_TYPE
if [ "$HOSTLY_BUILD_TYPE" = "server" ]; then
    echo "Error: Server builds are not supported in this builder."
    echo "Please use static builds instead."
    exit 1
else
    # Handle static build
    if [ "$NO_BUILD" = true ]; then
        echo "Build was skipped. Copying all files as static content."
        cp -r . "$BUILD_OUTPUT_DIR"
    elif [ -d "dist" ]; then
        echo "Copying static files from dist/"
        cp -r dist/* "$BUILD_OUTPUT_DIR/" 2>/dev/null || cp -r dist/. "$BUILD_OUTPUT_DIR/"
    elif [ -d "build" ]; then
        echo "Copying static files from build/"
        cp -r build/* "$BUILD_OUTPUT_DIR/" 2>/dev/null || cp -r build/. "$BUILD_OUTPUT_DIR/"
    elif [ -d "out" ]; then
        echo "Copying static files from out/"
        cp -r out/* "$BUILD_OUTPUT_DIR/" 2>/dev/null || cp -r out/. "$BUILD_OUTPUT_DIR/"
    elif [ -d "public" ]; then
        echo "Copying public files"
        cp -r public/* "$BUILD_OUTPUT_DIR/" 2>/dev/null || cp -r public/. "$BUILD_OUTPUT_DIR/"
    else
        echo "Warning: No recognized build output directory found (dist, build, out, or public)."
        echo "Copying all files as static content."
        cp -r . "$BUILD_OUTPUT_DIR"
    fi
    
    # Create metadata file for static builds
    echo "{\"type\":\"static\",\"sha\":\"$HOSTLY_REPO_SHA\",\"buildType\":\"static\"}" > "$BUILD_OUTPUT_DIR/hostly.json"
    
    # Upload to S3
    upload_to_s3 "$BUILD_OUTPUT_DIR" "$HOSTLY_REPO_SHA"
    
    echo "Static files uploaded successfully."
fi

echo "Build completed successfully."