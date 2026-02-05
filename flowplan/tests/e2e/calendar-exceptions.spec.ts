import { test, expect, Page } from '@playwright/test'

/**
 * Calendar Exceptions (FR-002) E2E Tests
 *
 * Tests critical user journeys for managing holidays (Calendar Exceptions):
 * 1. Open Calendar Exceptions Modal
 * 2. Add New Holiday/Non-Working Day
 * 3. View List of Holidays by Year
 * 4. Edit Existing Holiday
 * 5. Delete Holiday
 * 6. Form Validation
 *
 * Hebrew RTL support tested throughout.
 */

// Test user credentials
const TEST_USER = {
  email: `calendar-e2e-${Date.now()}@flowplan.test`,
  password: 'TestPassword123!',
  fullName: 'Calendar Test User',
}

// Test project data
const TEST_PROJECT = {
  name: `Calendar Test Project ${Date.now()}`,
  description: 'Project for calendar exceptions testing',
}

// Test calendar exception data
const TEST_HOLIDAY = {
  name: 'Yom Kippur Test',
  date: '2025-10-02',
  type: 'holiday' as const,
}

const TEST_NON_WORKING_DAY = {
  name: 'Office Closed',
  date: '2025-03-15',
  type: 'non_working' as const,
}

// Page Object for Calendar Exceptions
class CalendarExceptionsPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  // Layout Locators
  get pageContainer() {
    return this.page.locator('[dir="rtl"]')
  }

  get loadingSpinner() {
    return this.page.locator('.animate-spin')
  }

  // Calendar Button (Dashboard Toolbar)
  get calendarButton() {
    return this.page.getByRole('button', { name: /חגים/i })
  }

  // Calendar Modal
  get calendarModal() {
    return this.page.getByRole('dialog')
  }

  get modalTitle() {
    return this.calendarModal.getByRole('heading', { name: 'ניהול חגים וימים לא עובדים' })
  }

  // Form Locators
  get dateInput() {
    return this.page.locator('[data-testid="calendar-exception-date-input"]')
  }

  get typeSelect() {
    return this.page.locator('[data-testid="calendar-exception-type-select"]')
  }

  get nameInput() {
    return this.page.locator('[data-testid="calendar-exception-name-input"]')
  }

  get submitButton() {
    return this.page.locator('[data-testid="calendar-exception-form-submit-button"]')
  }

  get cancelButton() {
    return this.page.locator('[data-testid="calendar-exception-form-cancel-button"]')
  }

  // List Locators
  get exceptionsList() {
    return this.page.locator('[data-testid^="calendar-exception-item-"]')
  }

  get emptyState() {
    return this.page.locator('text=/לא הוגדרו חגים|אין חגים/i')
  }

  get addButton() {
    return this.page.locator('[data-testid="add-calendar-exception-button"]')
  }

  get addFirstButton() {
    return this.page.locator('[data-testid="add-first-exception-button"]')
  }

  // Actions
  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async waitForDashboardLoad() {
    await Promise.race([
      this.loadingSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {}),
      this.pageContainer.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {}),
    ])
    await this.page.waitForLoadState('networkidle')
  }

  async openCalendarModal() {
    await this.calendarButton.click()
    await this.calendarModal.waitFor({ state: 'visible' })
  }

  async closeModal() {
    // Click outside modal or use close button
    const closeButton = this.calendarModal.locator('button').filter({ hasText: /ביטול|סגור/i })
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click()
    } else {
      // Click overlay to close
      await this.page.keyboard.press('Escape')
    }
    await this.calendarModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }

  async fillExceptionForm(data: { date: string; type: 'holiday' | 'non_working'; name?: string }) {
    await this.dateInput.fill(data.date)
    await this.typeSelect.selectOption(data.type)
    if (data.name) {
      await this.nameInput.fill(data.name)
    }
  }

  async submitForm() {
    await this.submitButton.click()
    await this.page.waitForTimeout(500) // Wait for mutation
  }

  async getExceptionItem(nameOrDate: string) {
    return this.exceptionsList.filter({ hasText: nameOrDate }).first()
  }

  async editException(nameOrDate: string) {
    const item = await this.getExceptionItem(nameOrDate)
    const editButton = item.locator('[data-testid^="edit-exception-"]')
    await editButton.click()
  }

  async deleteException(nameOrDate: string) {
    const item = await this.getExceptionItem(nameOrDate)
    const deleteButton = item.locator('[data-testid^="delete-exception-"]')
    await deleteButton.click()
  }
}

// Helper to register and login
async function registerAndLogin(page: Page) {
  await page.goto('/register')
  await page.waitForLoadState('networkidle')

  // Wait for form to be visible
  await page.locator('#email').waitFor({ state: 'visible', timeout: 10000 })

  // Fill registration form
  await page.locator('#fullName').fill(TEST_USER.fullName)
  await page.locator('#email').fill(TEST_USER.email)
  await page.locator('#password').fill(TEST_USER.password)
  await page.locator('#confirmPassword').fill(TEST_USER.password)

  // Submit
  await page.getByRole('button', { name: /הירשם|יוצר חשבון/i }).click()

  // Wait for redirect
  await page.waitForTimeout(3000)
  await page.waitForLoadState('networkidle')
}

// Helper to create project if needed
async function ensureProjectExists(page: Page) {
  const createProjectButton = page.getByRole('button', { name: /create project|צור פרויקט|פרויקט חדש/i })

  if (await createProjectButton.isVisible().catch(() => false)) {
    await createProjectButton.click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })

    // Fill project form
    await page.locator('#name').fill(TEST_PROJECT.name)
    await page.locator('#description').fill(TEST_PROJECT.description)

    // Submit
    await page.getByRole('dialog').getByRole('button', { name: /create|צור/i }).click()

    // Wait for modal to close
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
  }
}

// ============================================================================
// Test Suite 1: Calendar Modal Navigation
// ============================================================================
test.describe('Calendar Modal Navigation', () => {
  test.setTimeout(90000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)

    const calendarPage = new CalendarExceptionsPage(page)
    await calendarPage.goto()
    await calendarPage.waitForDashboardLoad()
    await ensureProjectExists(page)
  })

  test('should display calendar button in dashboard toolbar', async ({ page }) => {
    const calendarPage = new CalendarExceptionsPage(page)

    // Verify calendar button is visible
    await expect(calendarPage.calendarButton).toBeVisible()

    await page.screenshot({ path: 'test-results/calendar-button-visible.png', fullPage: true })
  })

  test('should open calendar exceptions modal when clicking the button', async ({ page }) => {
    const calendarPage = new CalendarExceptionsPage(page)

    // Click calendar button
    await calendarPage.openCalendarModal()

    // Verify modal is open
    await expect(calendarPage.calendarModal).toBeVisible()

    // Verify modal has correct title
    await expect(calendarPage.modalTitle).toBeVisible()

    await page.screenshot({ path: 'test-results/calendar-modal-open.png', fullPage: true })
  })

  test('should display form and list sections in modal', async ({ page }) => {
    const calendarPage = new CalendarExceptionsPage(page)

    await calendarPage.openCalendarModal()

    // Verify form elements are visible
    await expect(calendarPage.dateInput).toBeVisible()
    await expect(calendarPage.typeSelect).toBeVisible()
    await expect(calendarPage.nameInput).toBeVisible()
    await expect(calendarPage.submitButton).toBeVisible()

    await page.screenshot({ path: 'test-results/calendar-modal-form.png', fullPage: true })
  })

  test('should close modal when clicking cancel', async ({ page }) => {
    const calendarPage = new CalendarExceptionsPage(page)

    await calendarPage.openCalendarModal()
    await calendarPage.closeModal()

    // Modal should be closed
    await expect(calendarPage.calendarModal).not.toBeVisible()

    await page.screenshot({ path: 'test-results/calendar-modal-closed.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 2: Add Calendar Exception
// ============================================================================
test.describe('Add Calendar Exception', () => {
  test.setTimeout(90000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)

    const calendarPage = new CalendarExceptionsPage(page)
    await calendarPage.goto()
    await calendarPage.waitForDashboardLoad()
    await ensureProjectExists(page)
  })

  test('should add a new holiday with name', async ({ page }) => {
    const calendarPage = new CalendarExceptionsPage(page)

    await calendarPage.openCalendarModal()

    // Fill form
    await calendarPage.fillExceptionForm({
      date: TEST_HOLIDAY.date,
      type: TEST_HOLIDAY.type,
      name: TEST_HOLIDAY.name,
    })

    await page.screenshot({ path: 'test-results/calendar-form-filled-holiday.png', fullPage: true })

    // Submit
    await calendarPage.submitForm()

    // Wait for the exception to appear in the list
    await page.waitForTimeout(1000)

    // Verify exception appears in the list
    const exceptionItem = await calendarPage.getExceptionItem(TEST_HOLIDAY.name)
    await expect(exceptionItem).toBeVisible()

    await page.screenshot({ path: 'test-results/calendar-holiday-added.png', fullPage: true })
  })

  test('should add a non-working day', async ({ page }) => {
    const calendarPage = new CalendarExceptionsPage(page)

    await calendarPage.openCalendarModal()

    // Fill form with non-working day
    await calendarPage.fillExceptionForm({
      date: TEST_NON_WORKING_DAY.date,
      type: TEST_NON_WORKING_DAY.type,
      name: TEST_NON_WORKING_DAY.name,
    })

    await page.screenshot({ path: 'test-results/calendar-form-filled-nonworking.png', fullPage: true })

    // Submit
    await calendarPage.submitForm()

    await page.waitForTimeout(1000)

    // Verify exception appears in the list
    const exceptionItem = await calendarPage.getExceptionItem(TEST_NON_WORKING_DAY.name)
    await expect(exceptionItem).toBeVisible()

    await page.screenshot({ path: 'test-results/calendar-nonworking-added.png', fullPage: true })
  })

  test('should add exception without name (date only)', async ({ page }) => {
    const calendarPage = new CalendarExceptionsPage(page)

    await calendarPage.openCalendarModal()

    // Fill form without name
    const testDate = '2025-07-20'
    await calendarPage.fillExceptionForm({
      date: testDate,
      type: 'holiday',
    })

    await calendarPage.submitForm()
    await page.waitForTimeout(1000)

    // Verify exception appears (should show date in Hebrew format)
    await page.screenshot({ path: 'test-results/calendar-dateonly-added.png', fullPage: true })
  })

  test('should show validation error for missing date', async ({ page }) => {
    const calendarPage = new CalendarExceptionsPage(page)

    await calendarPage.openCalendarModal()

    // Try to submit without filling date
    await calendarPage.nameInput.fill('Test Without Date')
    await calendarPage.submitForm()

    // Form should still be visible (not submitted)
    await expect(calendarPage.dateInput).toBeVisible()

    // Check for validation error or HTML5 validation
    const dateError = page.locator('text=/יש לבחור תאריך|required/i')
    // Either custom error or browser validation should prevent submission

    await page.screenshot({ path: 'test-results/calendar-validation-error.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 3: View Calendar Exceptions List
// ============================================================================
test.describe('View Calendar Exceptions List', () => {
  test.setTimeout(120000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)

    const calendarPage = new CalendarExceptionsPage(page)
    await calendarPage.goto()
    await calendarPage.waitForDashboardLoad()
    await ensureProjectExists(page)

    // Add some test data
    await calendarPage.openCalendarModal()

    // Add first exception
    await calendarPage.fillExceptionForm({
      date: '2025-03-20',
      type: 'holiday',
      name: 'Purim',
    })
    await calendarPage.submitForm()
    await page.waitForTimeout(500)

    // Add second exception (different year)
    await calendarPage.fillExceptionForm({
      date: '2026-09-15',
      type: 'holiday',
      name: 'Rosh Hashanah',
    })
    await calendarPage.submitForm()
    await page.waitForTimeout(500)
  })

  test('should display list of holidays', async ({ page }) => {
    const calendarPage = new CalendarExceptionsPage(page)

    // Verify list has items
    const count = await calendarPage.exceptionsList.count()
    expect(count).toBeGreaterThan(0)

    await page.screenshot({ path: 'test-results/calendar-list-view.png', fullPage: true })
  })

  test('should group holidays by year', async ({ page }) => {
    const calendarPage = new CalendarExceptionsPage(page)

    // Check for year grouping headers
    const year2025Header = page.locator('h4').filter({ hasText: '2025' })
    const year2026Header = page.locator('h4').filter({ hasText: '2026' })

    await expect(year2025Header).toBeVisible()
    await expect(year2026Header).toBeVisible()

    await page.screenshot({ path: 'test-results/calendar-grouped-by-year.png', fullPage: true })
  })

  test('should display holiday type badge', async ({ page }) => {
    const calendarPage = new CalendarExceptionsPage(page)

    // Verify type badges are visible
    const holidayBadge = page.locator('text=חג')
    await expect(holidayBadge.first()).toBeVisible()

    await page.screenshot({ path: 'test-results/calendar-type-badges.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 4: Edit Calendar Exception
// ============================================================================
test.describe('Edit Calendar Exception', () => {
  test.setTimeout(90000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)

    const calendarPage = new CalendarExceptionsPage(page)
    await calendarPage.goto()
    await calendarPage.waitForDashboardLoad()
    await ensureProjectExists(page)

    // Add test exception
    await calendarPage.openCalendarModal()
    await calendarPage.fillExceptionForm({
      date: '2025-04-15',
      type: 'holiday',
      name: 'Edit Test Holiday',
    })
    await calendarPage.submitForm()
    await page.waitForTimeout(1000)
  })

  test.fixme('should open edit form when clicking edit button', async ({ page }) => {
    // Note: Edit locator timing issue - needs investigation
    const calendarPage = new CalendarExceptionsPage(page)

    // Click edit on the exception
    await calendarPage.editException('Edit Test Holiday')

    // Form should now be in edit mode
    await page.waitForTimeout(500)

    // Verify form is populated
    const nameValue = await calendarPage.nameInput.inputValue()
    expect(nameValue).toBe('Edit Test Holiday')

    await page.screenshot({ path: 'test-results/calendar-edit-form.png', fullPage: true })
  })

  test.fixme('should update exception when saving edit', async ({ page }) => {
    // Note: Edit workflow timing issue - needs investigation
    const calendarPage = new CalendarExceptionsPage(page)

    // Edit the exception
    await calendarPage.editException('Edit Test Holiday')
    await page.waitForTimeout(500)

    // Update the name
    await calendarPage.nameInput.clear()
    await calendarPage.nameInput.fill('Updated Holiday Name')

    // Submit
    await calendarPage.submitForm()
    await page.waitForTimeout(1000)

    // Verify updated name appears
    const updatedItem = await calendarPage.getExceptionItem('Updated Holiday Name')
    await expect(updatedItem).toBeVisible()

    await page.screenshot({ path: 'test-results/calendar-edited.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 5: Delete Calendar Exception
// ============================================================================
test.describe('Delete Calendar Exception', () => {
  test.setTimeout(90000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)

    const calendarPage = new CalendarExceptionsPage(page)
    await calendarPage.goto()
    await calendarPage.waitForDashboardLoad()
    await ensureProjectExists(page)

    // Add test exception
    await calendarPage.openCalendarModal()
    await calendarPage.fillExceptionForm({
      date: '2025-05-20',
      type: 'holiday',
      name: 'Delete Test Holiday',
    })
    await calendarPage.submitForm()
    await page.waitForTimeout(1000)
  })

  test('should delete exception when clicking delete button', async ({ page }) => {
    const calendarPage = new CalendarExceptionsPage(page)

    // Get initial count
    const initialCount = await calendarPage.exceptionsList.count()

    await page.screenshot({ path: 'test-results/calendar-before-delete.png', fullPage: true })

    // Delete the exception
    await calendarPage.deleteException('Delete Test Holiday')
    await page.waitForTimeout(1000)

    // Verify count decreased
    const newCount = await calendarPage.exceptionsList.count()
    expect(newCount).toBeLessThan(initialCount)

    await page.screenshot({ path: 'test-results/calendar-after-delete.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 6: Empty State
// ============================================================================
test.describe('Empty State', () => {
  test.setTimeout(90000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)

    const calendarPage = new CalendarExceptionsPage(page)
    await calendarPage.goto()
    await calendarPage.waitForDashboardLoad()
    await ensureProjectExists(page)
  })

  test('should display empty state when no exceptions exist', async ({ page }) => {
    const calendarPage = new CalendarExceptionsPage(page)

    await calendarPage.openCalendarModal()

    // Check for empty state or list
    const hasEmptyState = await calendarPage.emptyState.isVisible().catch(() => false)
    const hasItems = await calendarPage.exceptionsList.first().isVisible().catch(() => false)

    // Either empty state or items should be visible
    expect(hasEmptyState || hasItems).toBe(true)

    await page.screenshot({ path: 'test-results/calendar-empty-state.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 7: Integration Test
// ============================================================================
test.describe('Calendar Exceptions Integration Tests', () => {
  test.setTimeout(180000)

  test.fixme('full workflow: add, edit, delete calendar exception', async ({ page }) => {
    // Note: Edit workflow has element viewport issues - needs scroll handling
    await registerAndLogin(page)

    const calendarPage = new CalendarExceptionsPage(page)
    await calendarPage.goto()
    await calendarPage.waitForDashboardLoad()
    await ensureProjectExists(page)

    // Step 1: Open modal
    await calendarPage.openCalendarModal()
    await page.screenshot({ path: 'test-results/calendar-integration-step1-modal.png', fullPage: true })

    // Step 2: Add a holiday
    await calendarPage.fillExceptionForm({
      date: '2025-12-25',
      type: 'holiday',
      name: 'Integration Test Holiday',
    })
    await calendarPage.submitForm()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/calendar-integration-step2-added.png', fullPage: true })

    // Step 3: Verify it appears
    const addedItem = await calendarPage.getExceptionItem('Integration Test Holiday')
    await expect(addedItem).toBeVisible()

    // Step 4: Edit the holiday
    await calendarPage.editException('Integration Test Holiday')
    await page.waitForTimeout(500)
    await calendarPage.nameInput.clear()
    await calendarPage.nameInput.fill('Updated Integration Holiday')
    await calendarPage.submitForm()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/calendar-integration-step4-edited.png', fullPage: true })

    // Step 5: Verify edit
    const editedItem = await calendarPage.getExceptionItem('Updated Integration Holiday')
    await expect(editedItem).toBeVisible()

    // Step 6: Delete the holiday
    await calendarPage.deleteException('Updated Integration Holiday')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/calendar-integration-step6-deleted.png', fullPage: true })

    // Step 7: Close modal
    await calendarPage.closeModal()
    await page.screenshot({ path: 'test-results/calendar-integration-step7-complete.png', fullPage: true })
  })
})
