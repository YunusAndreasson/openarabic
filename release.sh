#!/bin/bash

set -e

# Configuration
PLATFORM="${PLATFORM:-android}"
PROFILE="${PROFILE:-production}"
SUBMIT="${SUBMIT:-true}"
MESSAGE="${MESSAGE:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Build and optionally submit Android app using EAS Build"
    echo ""
    echo "Options:"
    echo "  -p, --platform PLATFORM    Platform to build (android, ios, all) [default: android]"
    echo "  -f, --profile PROFILE      Build profile (development, preview, production) [default: production]"
    echo "  -s, --submit               Submit to store after build [default: true]"
    echo "  -n, --no-submit            Don't submit to store after build"
    echo "  -m, --message MESSAGE      Build message/notes"
    echo "  -h, --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Build production Android and submit"
    echo "  $0 -f development           # Build development Android (no submit)"
    echo "  $0 -p ios -f preview        # Build preview iOS"
    echo "  $0 -f production -n         # Build production without submitting"
    echo "  $0 -m 'Hotfix for issue #123'  # Build with custom message"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        -f|--profile)
            PROFILE="$2"
            shift 2
            ;;
        -s|--submit)
            SUBMIT=true
            shift
            ;;
        -n|--no-submit)
            SUBMIT=false
            shift
            ;;
        -m|--message)
            MESSAGE="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate profile
case $PROFILE in
    development|preview|production)
        ;;
    *)
        log_error "Invalid profile: $PROFILE. Must be development, preview, or production."
        exit 1
        ;;
esac

# Validate platform
case $PLATFORM in
    android|ios)
        ;;
    all)
        PLATFORM="android ios"
        ;;
    *)
        log_error "Invalid platform: $PLATFORM. Must be android, ios, or all."
        exit 1
        ;;
esac

# Development Android builds get submitted to Google Play internal track
if [ "$PROFILE" = "development" ] && [ "$PLATFORM" = "android" ]; then
    SUBMIT=true
    log_info "Development Android build will be submitted to Google Play internal track."
fi

log_info "Starting build process..."
log_info "Platform: $PLATFORM"
log_info "Profile: $PROFILE"
log_info "Submit: $SUBMIT"
if [ -n "$MESSAGE" ]; then
    log_info "Message: $MESSAGE"
fi

# Build command construction
BUILD_CMD="eas build --platform $PLATFORM --profile $PROFILE --non-interactive"

if [ -n "$MESSAGE" ]; then
    BUILD_CMD="$BUILD_CMD --message \"$MESSAGE\""
fi

# Execute build
log_info "Executing: $BUILD_CMD"
eval $BUILD_CMD

# Submit if requested
if [ "$SUBMIT" = true ]; then
    log_info "Submitting build to store..."

    # Submit command
    SUBMIT_CMD="eas submit --platform $PLATFORM --latest --non-interactive"

    # Execute submit
    log_info "Executing: $SUBMIT_CMD"
    eval $SUBMIT_CMD

    log_success "Build submitted successfully!"
else
    log_success "Build completed successfully! (Not submitted to store)"
fi

# Show next steps
echo ""
log_info "Next steps:"
if [ "$PROFILE" = "development" ] && [ "$PLATFORM" = "android" ]; then
    echo "  • Android build submitted to Google Play internal track"
    echo "  • Internal testers will receive update notifications"
    echo "  • Monitor Google Play Console for any issues"
else
    echo "  • Build completed"
fi
