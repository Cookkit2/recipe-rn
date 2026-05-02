#!/bin/bash

# Authentication Test Runner
# Runs all authentication module tests with coverage

set -e

echo "🧪 Running Authentication Module Tests"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test suites
TEST_SUITES=(
  "authStore"
  "auth-db"
  "LoginScreen"
  "RegisterScreen"
  "AuthContext"
)

# Function to run a test suite
run_test_suite() {
  local suite=$1
  echo -e "${YELLOW}Running $suite tests...${NC}"

  if npm test -- --testPathPatterns="$suite" --no-coverage --passWithNoTests; then
    echo -e "${GREEN}✓ $suite tests passed${NC}"
  else
    echo -e "${RED}✗ $suite tests failed${NC}"
    return 1
  fi
  echo ""
}

# Function to run all tests with coverage
run_coverage() {
  echo -e "${YELLOW}Running all tests with coverage...${NC}"

  if npm test -- --coverage --coverageReporters=text --coverageReporters=html; then
    echo -e "${GREEN}✓ Coverage report generated${NC}"
    echo "📊 HTML report: coverage/lcov-report/index.html"
  else
    echo -e "${RED}✗ Coverage failed${NC}"
    return 1
  fi
}

# Function to validate test structure
validate_structure() {
  echo -e "${YELLOW}Validating test structure...${NC}"

  local test_files=(
    "src/store/__tests__/authStore.test.ts"
    "src/services/database/__tests__/auth-db.test.ts"
    "src/screens/auth/__tests__/LoginScreen.test.tsx"
    "src/screens/auth/__tests__/RegisterScreen.test.tsx"
    "src/contexts/__tests__/AuthContext.test.tsx"
  )

  local missing_files=0

  for file in "${test_files[@]}"; do
    if [ -f "$file" ]; then
      echo -e "${GREEN}✓ $file exists${NC}"
    else
      echo -e "${RED}✗ $file missing${NC}"
      missing_files=$((missing_files + 1))
    fi
  done

  if [ $missing_files -eq 0 ]; then
    echo -e "${GREEN}All test files present${NC}"
    return 0
  else
    echo -e "${RED}$missing_files test files missing${NC}"
    return 1
  fi
}

# Main script
case "${1:-all}" in
  "all")
    validate_structure
    echo ""

    local failed=0
    for suite in "${TEST_SUITES[@]}"; do
      if ! run_test_suite "$suite"; then
        failed=$((failed + 1))
      fi
    done

    echo ""
    if [ $failed -eq 0 ]; then
      echo -e "${GREEN}✓ All test suites passed${NC}"
      run_coverage
    else
      echo -e "${RED}✗ $failed test suite(s) failed${NC}"
      exit 1
    fi
    ;;

  "coverage")
    run_coverage
    ;;

  "structure")
    validate_structure
    ;;

  *)
    # Run specific test suite
    if [[ " ${TEST_SUITES[@]} " =~ " $1 " ]]; then
      run_test_suite "$1"
    else
      echo "Usage: $0 [all|coverage|structure|<test-suite>]"
      echo ""
      echo "Available test suites:"
      for suite in "${TEST_SUITES[@]}"; do
        echo "  - $suite"
      done
      exit 1
    fi
    ;;
esac

echo ""
echo -e "${GREEN}✓ Test run complete${NC}"
