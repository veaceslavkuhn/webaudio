#!/bin/bash

# WebAudacity Playwright Smoke Test Runner
# This script runs the Playwright smoke tests for the WebAudacity application

echo "🎵 WebAudacity Playwright Smoke Tests 🎵"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Check if Playwright browsers are installed
print_status "Checking Playwright browser installation..."
if ! npx playwright --version > /dev/null 2>&1; then
    print_error "Playwright not found. Please install it first:"
    echo "npm install --save-dev @playwright/test"
    exit 1
fi

# Install Playwright browsers if needed
print_status "Installing Playwright browsers..."
npx playwright install

# Function to run specific test suite
run_test_suite() {
    local test_file=$1
    local description=$2
    
    print_status "Running $description..."
    if npx playwright test "$test_file" --reporter=line; then
        print_success "$description passed!"
        return 0
    else
        print_error "$description failed!"
        return 1
    fi
}

# Main test execution
main() {
    local failed_tests=0
    local total_tests=0
    
    echo ""
    print_status "Starting WebAudacity smoke tests..."
    echo ""
    
    # Test suites to run
    declare -A test_suites=(
        ["e2e/app-loading.spec.js"]="Application Loading & Initialization"
        ["e2e/menu-bar.spec.js"]="Menu Bar Functionality"
        ["e2e/modals.spec.js"]="Modal Dialogs"
        ["e2e/toolbar.spec.js"]="Toolbar Controls"
        ["e2e/timeline-tracks.spec.js"]="Timeline & Track Management"
        ["e2e/audio-context.spec.js"]="Audio Context & Web Audio API"
        ["e2e/file-operations.spec.js"]="File Operations"
        ["e2e/responsive.spec.js"]="Responsive Design"
        ["e2e/keyboard-shortcuts-errors.spec.js"]="Keyboard Shortcuts & Error Handling"
    )
    
    # Run each test suite
    for test_file in "${!test_suites[@]}"; do
        description="${test_suites[$test_file]}"
        ((total_tests++))
        
        if ! run_test_suite "$test_file" "$description"; then
            ((failed_tests++))
        fi
        echo ""
    done
    
    # Summary
    echo "========================================"
    echo "🎵 Test Summary 🎵"
    echo "========================================"
    
    local passed_tests=$((total_tests - failed_tests))
    print_status "Total test suites: $total_tests"
    print_success "Passed: $passed_tests"
    
    if [ $failed_tests -gt 0 ]; then
        print_error "Failed: $failed_tests"
        echo ""
        print_error "Some tests failed. Please check the output above for details."
        exit 1
    else
        print_success "All tests passed! 🎉"
        echo ""
        print_success "WebAudacity is ready for use!"
    fi
}

# Parse command line arguments
case "${1:-all}" in
    "all")
        main
        ;;
    "quick")
        print_status "Running quick smoke test..."
        run_test_suite "e2e/app-loading.spec.js" "Application Loading (Quick Test)"
        ;;
    "ui")
        print_status "Running tests with Playwright UI..."
        npx playwright test --ui
        ;;
    "headed")
        print_status "Running tests in headed mode..."
        npx playwright test --headed
        ;;
    "debug")
        print_status "Running tests in debug mode..."
        npx playwright test --debug
        ;;
    "help"|"-h"|"--help")
        echo "WebAudacity Playwright Test Runner"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  all      Run all smoke tests (default)"
        echo "  quick    Run quick application loading test only"
        echo "  ui       Run tests with Playwright UI"
        echo "  headed   Run tests in headed mode (visible browser)"
        echo "  debug    Run tests in debug mode"
        echo "  help     Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0           # Run all tests"
        echo "  $0 quick     # Quick test"
        echo "  $0 ui        # Run with UI"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for available commands."
        exit 1
        ;;
esac
