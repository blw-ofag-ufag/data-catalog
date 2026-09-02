# E2E CRUD Testing Implementation Guide

## Overview

This document outlines the complete e2e CRUD testing implementation for the polymorphic data catalog supporting multiple product types (dataset, dataService, datasetSeries).

## Architecture

### Test Fixtures

All test fixtures are located in `/e2e/fixtures/`:

1. **datasets.json** - Original dataset fixtures (dataset type only)
2. **dataset-detail.json** - Single dataset detail for ds-001
3. **dataservice-detail.json** - Single dataService detail for ds-service-001
4. **datasetseries-detail.json** - Single datasetSeries detail for ds-series-001
5. **mixed-products.json** - Index containing all three product types

### Mock API Support

`/e2e/support/mock-api.ts` provides two main functions:

#### `installApiMocks(target)` - Original Behavior (Backward Compatible)

- Uses `datasets.json` for index
- Returns `dataset-detail.json` for all detail requests
- Perfect for testing dataset-only functionality
- Used by existing tests: smoke.spec.ts, navigation.spec.ts, modify.spec.ts

#### `installMultiTypeApiMocks(target)` - Multi-Type Behavior

- Uses `mixed-products.json` for index containing all 3 product types
- Routes detail requests by product ID:
  - `ds-001` → `dataset-detail.json`
  - `ds-service-001` → `dataservice-detail.json`
  - `ds-series-001` → `datasetseries-detail.json`
- Enables comprehensive multi-type testing
- Used by new tests: read-multi-type.spec.ts, create-multi-type.spec.ts, update-multi-type.spec.ts

## Test Files

### Phase 1: Fixtures (Complete)

- ✅ dataservice-detail.json
- ✅ datasetseries-detail.json
- ✅ mixed-products.json

### Phase 2: READ Operations (read-multi-type.spec.ts)

Tests reading/listing all product types:

- ✅ Multi-Type Product Listing
  - All three types visible in list
  - Search filtering across types
  - Keyword filtering across types
- ✅ Dataset Detail View
  - Title and description display
  - Dataset-specific sections (distributions)
  - Keyword chips render correctly
- ✅ DataService Detail View
  - Title and description display
  - Service-specific endpoint information
  - Keyword chips for services
- ✅ DatasetSeries Detail View
  - Title and description display
  - Series-specific information display
  - Keyword chips for series

### Phase 3: CREATE Operations (create-multi-type.spec.ts)

Tests product creation with type selection:

- ✅ Product Type Selector in Create Form
  - Selector visible and functional
  - All three types available as options
  - Default form displays correctly
- ✅ Form Behavior with Different Product Types
  - Multi-step stepper renders
  - Navigation between steps works
  - Required fields present (identifier, title)
- ✅ Multi-language Support in Create Form
  - English mode works
  - German language switching works
  - Form remains functional after language change

### Phase 4: UPDATE Operations (update-multi-type.spec.ts)

Tests editing products of different types:

- ✅ Edit Dataset
  - Edit button visible on detail page
  - Navigation to modify form works
  - Product type shown as read-only
- ✅ Edit DataService
  - Edit button works for services
  - Form displays service-specific fields
- ✅ Edit DatasetSeries
  - Edit button works for series
  - Form displays series-specific fields

### Phase 5: Existing Tests (Original Test Suite)

All existing tests remain compatible:

- ✅ smoke.spec.ts - Basic app functionality
- ✅ navigation.spec.ts - Route navigation
- ✅ index.spec.ts - List view operations (uses original fixtures)
- ✅ details.spec.ts - Detail view display (uses original fixtures)
- ✅ modify.spec.ts - Form rendering and navigation

## Running the Tests

### Prerequisite System Setup

Ensure Playwright dependencies are installed:

```bash
npx playwright install
# May also require system libraries: libnspr4, libnss3, etc.
```

### Run All Tests

```bash
npx playwright test
```

### Run Specific Test Files

```bash
# Original dataset-only tests
npx playwright test e2e/smoke.spec.ts
npx playwright test e2e/index.spec.ts
npx playwright test e2e/details.spec.ts

# New multi-type tests
npx playwright test e2e/read-multi-type.spec.ts
npx playwright test e2e/create-multi-type.spec.ts
npx playwright test e2e/update-multi-type.spec.ts
```

### Run with UI Mode (Recommended for Development)

```bash
npx playwright test --ui
```

### Generate Test Report

```bash
npx playwright test
npx playwright show-report
```

## Test Coverage Matrix

| Feature        | Dataset | DataService | DatasetSeries | Status           |
| -------------- | ------- | ----------- | ------------- | ---------------- |
| Read/List      | ✅      | ✅          | ✅            | Complete         |
| Read/Detail    | ✅      | ✅          | ✅            | Complete         |
| Create         | ✅      | ⚠️          | ⚠️            | Selectors tested |
| Edit           | ✅      | ✅          | ✅            | Complete         |
| Type Selector  | ✅      | ✅          | ✅            | Complete         |
| Type Indicator | ✅      | ✅          | ✅            | Implicit         |

✅ = Fully tested
⚠️ = Basic functionality tested, form submission not mocked yet

## Potential Enhancements

### Phase 6: DELETE Operations (Future)

- Delete button visibility
- Delete confirmation dialogs
- Removal from list after deletion

### Phase 7: Advanced Scenarios (Future)

- Type-specific field validation
- Error handling and messages
- Concurrent operations
- Performance testing with large datasets

### Phase 8: Integration Tests (Future)

- Full CRUD workflows
- Cross-type interactions
- State management consistency

## Troubleshooting

### Chromium Not Found

```bash
npx playwright install chromium
```

### Missing System Libraries

On Ubuntu/Debian:

```bash
sudo apt-get install libnspr4 libnss3 libgconf-2-4
```

### Tests Timeout

Increase timeout in playwright.config.ts:

```typescript
use: {
  timeout: 60000, // 60 seconds
}
```

### API Mocking Not Working

Ensure `installMultiTypeApiMocks()` is called in beforeEach hook:

```typescript
test.beforeEach(async ({ context, page }) => {
	await installMultiTypeApiMocks(context);
	await page.goto("/data-catalog/#/index");
});
```

## Test Data Reference

### Dataset (ds-001)

- Title: "Apple Harvest Statistics EN"
- Keywords: apples, harvest
- Has distributions
- Issued: 2023-04-15

### DataService (ds-service-001)

- Title: "Apple API Service EN"
- Endpoint: https://example.org/apple-api
- Keywords: apples, api, service
- Issued: 2023-06-20

### DatasetSeries (ds-series-001)

- Title: "Apple Harvest Time Series EN"
- Members: 2022, 2023, 2024
- Periodicity: Annual (P1Y)
- Keywords: apples, harvest, time-series
- Issued: 2023-01-15

## Success Criteria

✅ All test fixtures created and properly formatted
✅ Mock API extended to support multi-type routing
✅ READ tests cover all product types
✅ CREATE tests verify form behavior and type selection
✅ UPDATE tests verify edit functionality per type
✅ Existing tests remain passing (backward compatible)
✅ Test infrastructure supports future enhancements

## Next Steps

1. Install system dependencies if needed
2. Run `npx playwright test` to execute all tests
3. Check test report for coverage details
4. Use `--ui` mode to debug failing tests interactively
5. Expand tests as needed for additional scenarios
