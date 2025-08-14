# WebAudacity Playwright E2E Tests

This directory contains end-to-end tests for the WebAudacity application using Playwright.

## Overview

The test suite covers comprehensive smoke testing of the WebAudacity web audio editor to ensure all critical functionality works correctly across different browsers and devices.

## Test Structure

### Test Files

- **`app-loading.spec.js`** - Application initialization and loading tests
- **`menu-bar.spec.js`** - Menu bar functionality and navigation
- **`modals.spec.js`** - Modal dialog interactions and behavior
- **`toolbar.spec.js`** - Toolbar controls and transport buttons
- **`timeline-tracks.spec.js`** - Timeline and track management UI
- **`audio-context.spec.js`** - Web Audio API and audio context tests
- **`file-operations.spec.js`** - File handling and import/export operations
- **`responsive.spec.js`** - Responsive design and viewport testing
- **`keyboard-shortcuts-errors.spec.js`** - Keyboard shortcuts and error handling

### Smoke Test Coverage

✅ **Application Loading & Initialization**
- Page loads without errors
- Main UI components are visible
- No console errors on initial load
- Proper page structure

✅ **Menu Bar Functionality**
- All menu items display correctly
- Menu dropdowns open and close
- Menu navigation works properly

✅ **Modal Dialogs**
- All modals open and close correctly
- Modal overlay interactions
- Escape key functionality

✅ **Toolbar Controls**
- Transport controls (play, stop, record, pause)
- Button states and interactions
- Volume controls presence

✅ **Timeline & Track Management**
- Timeline component renders
- Track panel displays
- Time ruler and waveform areas
- Timeline interactions

✅ **Audio Context & Web Audio API**
- Audio context initialization
- Web Audio API support detection
- Audio buffer and node creation
- Memory leak prevention

✅ **File Operations**
- File drop zone functionality
- File format validation
- Error handling for unsupported formats
- File size validation

✅ **Responsive Design**
- Desktop, tablet, and mobile layouts
- Viewport adaptation
- No horizontal scroll on standard resolutions
- Orientation change handling

✅ **Keyboard Shortcuts & Error Handling**
- Basic keyboard shortcuts
- Mac/PC shortcut compatibility
- Modal closing with Escape
- Error message display
- Accessibility standards

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Test Commands

```bash
# Run all smoke tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Use the custom test runner
./run-e2e-tests.sh           # All tests
./run-e2e-tests.sh quick     # Quick test only
./run-e2e-tests.sh ui        # With Playwright UI
./run-e2e-tests.sh headed    # Visible browser
./run-e2e-tests.sh debug     # Debug mode
```

### Test Configuration

The tests are configured in `playwright.config.js` with:

- **Base URL**: `http://localhost:5173` (Vite dev server)
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Chrome and Safari mobile viewports
- **Automatic dev server startup**
- **Screenshot on failure**
- **Video recording on failure**
- **Trace collection on retry**

## Test Strategy

### Smoke Testing Approach

These tests focus on **smoke testing** - ensuring that the basic functionality of the application works without diving deep into complex user workflows. The goal is to:

1. **Verify Application Stability** - Ensure the app loads and renders correctly
2. **Test Core UI Components** - Check that all major UI elements are present and functional
3. **Validate Cross-Browser Compatibility** - Run tests across multiple browsers
4. **Check Responsive Behavior** - Ensure the app works on different screen sizes
5. **Test Basic Interactions** - Verify that user interactions don't cause crashes

### What These Tests DON'T Cover

- Complex audio processing workflows
- Detailed audio analysis
- Performance testing
- Load testing
- Integration with external services
- Complex user scenarios

### Browser Support

Tests run on:
- **Chromium** (Chrome/Edge)
- **Firefox**
- **WebKit** (Safari)
- **Mobile Chrome** (Pixel 5)
- **Mobile Safari** (iPhone 12)

## Development

### Adding New Tests

1. Create a new `.spec.js` file in the `e2e` directory
2. Follow the existing test structure and naming conventions
3. Use descriptive test names and group related tests with `test.describe()`
4. Add the new test file to the test runner script if needed

### Test Best Practices

- Use data-testid attributes for reliable element selection
- Provide fallback selectors for flexibility
- Include error handling and graceful failures
- Test both positive and negative scenarios
- Keep tests independent and isolated
- Use meaningful assertions and error messages

### Debugging Tests

```bash
# Run a specific test file
npx playwright test e2e/app-loading.spec.js

# Run with debug mode
npx playwright test --debug

# Run with headed browser
npx playwright test --headed

# Generate and view test report
npx playwright test && npx playwright show-report
```

## Continuous Integration

For CI/CD pipelines, use:

```bash
# In CI environment
npm run test:e2e
```

The configuration automatically detects CI environment and adjusts settings accordingly (retries, workers, etc.).

## Troubleshooting

### Common Issues

1. **Dev server not starting**: Ensure `npm run dev` works locally
2. **Browser installation**: Run `npx playwright install`
3. **Port conflicts**: Check if port 5173 is available
4. **Timeout issues**: Increase timeout in playwright.config.js if needed

### Environment Variables

Set these environment variables for customization:

- `CI=true` - Enables CI mode with retries and single worker
- `PLAYWRIGHT_BASE_URL` - Override the base URL

## Reports

Test reports are generated in HTML format and can be viewed with:

```bash
npx playwright show-report
```

The report includes:
- Test results and status
- Screenshots of failures
- Video recordings of failed tests
- Detailed error messages and stack traces
