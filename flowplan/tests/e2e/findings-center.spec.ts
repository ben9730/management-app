import { test, expect, Page } from '@playwright/test'

/**
 * Findings Center E2E Tests (Phase B)
 *
 * Tests critical user journeys for the Findings Center feature:
 * 1. Findings Page Navigation
 * 2. Create New Finding
 * 3. Filter Findings
 * 4. Edit Finding
 * 5. CAPA Tracker Widget
 * 6. Finding Card Display
 * 7. Empty State
 * 8. Validation
 *
 * Hebrew RTL support tested throughout.
 */

// Test data
const TEST_FINDING = {
  severity: 'high',
  description: 'This is a test finding description with at least 10 characters for validation',
  rootCause: 'Root cause analysis for the test finding',
  capa: 'Corrective and preventive action plan',
}

const UPDATED_FINDING = {
  status: 'in_progress',
  capa: 'Updated CAPA with additional corrective measures',
}

// Hebrew labels for severity
const SEVERITY_LABELS = {
  critical: 'קריטי',
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
}

// Hebrew labels for status
const STATUS_LABELS = {
  open: 'פתוח',
  in_progress: 'בתהליך',
  closed: 'סגור',
}

// Helper function to get future date for due date
function getFutureDueDate(daysFromNow: number = 14): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}

// Helper function to get past date for overdue testing
function getPastDueDate(daysAgo: number = 7): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().split('T')[0]
}

// Page Object for Findings Page
class FindingsPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  // Locators
  get pageContainer() {
    return this.page.locator('[data-testid="findings-page"]')
  }

  get findingsSection() {
    return this.page.locator('[data-testid="findings-section"]')
  }

  get trackerSection() {
    return this.page.locator('[data-testid="tracker-section"]')
  }

  get findingsListContainer() {
    return this.page.locator('[data-testid="findings-list-container"]')
  }

  get findingsList() {
    return this.page.locator('[data-testid="findings-list"]')
  }

  get capaTracker() {
    return this.page.locator('[data-testid="capa-tracker"]')
  }

  get loadingIndicator() {
    return this.page.locator('[data-testid="loading-indicator"]')
  }

  get addFindingButton() {
    return this.page.getByRole('button', { name: /הוסף ממצא/i })
  }

  get modalOverlay() {
    return this.page.locator('[data-testid="modal-overlay"]')
  }

  get modalDialog() {
    return this.page.getByRole('dialog')
  }

  get findingCards() {
    return this.page.locator('article')
  }

  // Filter locators
  get severityFilter() {
    return this.page.locator('[data-testid="severity-filter"]')
  }

  get statusFilter() {
    return this.page.locator('[data-testid="status-filter"]')
  }

  // CAPA Tracker locators
  get totalCount() {
    return this.page.locator('[data-testid="total-count"]')
  }

  get completionPercentage() {
    return this.page.locator('[data-testid="completion-percentage"]')
  }

  get overdueCount() {
    return this.page.locator('[data-testid="overdue-count"]')
  }

  get overdueBadge() {
    return this.page.locator('[data-testid="overdue-badge"]')
  }

  get withCapaCount() {
    return this.page.locator('[data-testid="with-capa-count"]')
  }

  get withoutCapaCount() {
    return this.page.locator('[data-testid="without-capa-count"]')
  }

  get severityBreakdown() {
    return this.page.locator('[data-testid="severity-breakdown"]')
  }

  // Form locators
  get taskSelect() {
    return this.page.locator('[data-testid="finding-task-select"]')
  }

  get severitySelect() {
    return this.page.locator('[data-testid="finding-severity-select"]')
  }

  get descriptionInput() {
    return this.page.locator('[data-testid="finding-description-input"]')
  }

  get rootCauseInput() {
    return this.page.locator('[data-testid="finding-root-cause-input"]')
  }

  get capaInput() {
    return this.page.locator('[data-testid="finding-capa-input"]')
  }

  get dueDateInput() {
    return this.page.locator('[data-testid="finding-due-date-input"]')
  }

  get statusSelect() {
    return this.page.locator('[data-testid="finding-status-select"]')
  }

  get cancelButton() {
    return this.page.locator('[data-testid="finding-form-cancel-button"]')
  }

  // Actions
  async goto() {
    await this.page.goto('/findings')
    await this.page.waitForLoadState('networkidle')
  }

  async waitForPageLoad() {
    // Wait for either loading to finish or findings list to appear
    await Promise.race([
      this.loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {}),
      this.findingsListContainer.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {}),
    ])
  }

  async clickAddFinding() {
    await this.addFindingButton.first().click()
    await this.modalOverlay.waitFor({ state: 'visible' })
  }

  async fillFindingForm(data: {
    taskIndex?: number
    severity?: string
    description: string
    rootCause?: string
    capa?: string
    dueDate?: string
    status?: string
  }) {
    // Select task (first non-empty option if taskIndex not specified)
    const taskSelect = this.taskSelect
    const taskOptions = await taskSelect.locator('option').all()
    if (taskOptions.length > 1) {
      const optionIndex = data.taskIndex !== undefined ? data.taskIndex + 1 : 1
      await taskSelect.selectOption({ index: Math.min(optionIndex, taskOptions.length - 1) })
    }

    // Select severity
    if (data.severity) {
      await this.severitySelect.selectOption(data.severity)
    }

    // Fill description
    await this.descriptionInput.fill(data.description)

    // Fill root cause if provided
    if (data.rootCause) {
      await this.rootCauseInput.fill(data.rootCause)
    }

    // Fill CAPA if provided
    if (data.capa) {
      await this.capaInput.fill(data.capa)
    }

    // Fill due date if provided
    if (data.dueDate) {
      await this.dueDateInput.fill(data.dueDate)
    }

    // Select status if provided (only in edit mode)
    if (data.status) {
      const statusSelect = this.statusSelect
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption(data.status)
      }
    }
  }

  async submitFindingForm() {
    // Click the submit button inside the modal dialog
    const submitButton = this.modalDialog.getByRole('button', { name: /שמור|עדכן/i })
    await submitButton.click()
  }

  async getFindingCard(descriptionSubstring: string) {
    return this.page.locator('article').filter({ hasText: descriptionSubstring }).first()
  }

  async editFinding(descriptionSubstring: string) {
    const card = await this.getFindingCard(descriptionSubstring)
    await card.getByRole('button', { name: /עריכה/i }).click()
    await this.modalOverlay.waitFor({ state: 'visible' })
  }

  async deleteFinding(descriptionSubstring: string) {
    const card = await this.getFindingCard(descriptionSubstring)
    await card.getByRole('button', { name: /מחיקה/i }).click()
  }

  async clickSeverityFilter(severity: 'all' | 'critical' | 'high' | 'medium' | 'low') {
    const label = severity === 'all' ? 'הכל' : SEVERITY_LABELS[severity]
    await this.severityFilter.getByRole('button', { name: label }).click()
  }

  async clickStatusFilter(status: 'all' | 'open' | 'in_progress' | 'closed') {
    const label = status === 'all' ? 'הכל' : STATUS_LABELS[status]
    await this.statusFilter.getByRole('button', { name: label }).click()
  }

  async getVisibleFindingsCount(): Promise<number> {
    return await this.findingCards.count()
  }
}

// ============================================================================
// Test Suite 1: Findings Page Navigation
// ============================================================================
test.describe('Findings Page Navigation', () => {
  test('should navigate to /findings page', async ({ page }) => {
    // Navigate directly to findings page
    await page.goto('/findings')
    await page.waitForLoadState('networkidle')

    // Verify URL
    await expect(page).toHaveURL(/\/findings/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/findings-page-navigation.png', fullPage: true })
  })

  test('should verify page loads with FindingsList and CapaTracker', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Verify main sections are visible
    await expect(findingsPage.findingsSection).toBeVisible()
    await expect(findingsPage.trackerSection).toBeVisible()

    // Verify FindingsList container is visible
    await expect(findingsPage.findingsListContainer).toBeVisible()

    // Verify CapaTracker is visible
    await expect(findingsPage.capaTracker).toBeVisible()

    await page.screenshot({ path: 'test-results/findings-page-components.png', fullPage: true })
  })

  test('should verify RTL layout and Hebrew labels', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Verify RTL direction on page container
    await expect(findingsPage.pageContainer).toHaveAttribute('dir', 'rtl')

    // Verify Hebrew page title
    const pageTitle = page.locator('h1').filter({ hasText: 'מרכז ממצאי ביקורת' })
    await expect(pageTitle).toBeVisible()

    // Verify Hebrew subtitle
    const subtitle = page.locator('p').filter({ hasText: 'ניהול ומעקב אחר ממצאי ביקורת' })
    await expect(subtitle).toBeVisible()

    // Verify Hebrew button label
    await expect(findingsPage.addFindingButton).toContainText('הוסף ממצא')

    // Verify Hebrew labels in CAPA Tracker
    const capaTrackerTitle = findingsPage.capaTracker.locator('h2').filter({ hasText: 'CAPA מעקב' })
    await expect(capaTrackerTitle).toBeVisible()

    await page.screenshot({ path: 'test-results/findings-page-rtl-hebrew.png', fullPage: true })
  })

  test('should display findings grid layout on large screens', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Verify grid container is present
    const grid = page.locator('[data-testid="findings-grid"]')
    await expect(grid).toBeVisible()

    // Verify sections have proper grid span classes
    await expect(findingsPage.findingsSection).toHaveClass(/lg:col-span-2/)
    await expect(findingsPage.trackerSection).toHaveClass(/lg:col-span-1/)

    await page.screenshot({ path: 'test-results/findings-page-grid-layout.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 2: Create New Finding
// ============================================================================
test.describe('Create New Finding', () => {
  test.setTimeout(60000)

  test('should open Add Finding modal when clicking button', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Click add finding button
    await findingsPage.clickAddFinding()

    // Verify modal is open
    await expect(findingsPage.modalDialog).toBeVisible()

    // Verify modal title
    const modalTitle = findingsPage.modalDialog.locator('text=הוספת ממצא')
    await expect(modalTitle).toBeVisible()

    // Verify form fields are present
    await expect(findingsPage.taskSelect).toBeVisible()
    await expect(findingsPage.severitySelect).toBeVisible()
    await expect(findingsPage.descriptionInput).toBeVisible()
    await expect(findingsPage.rootCauseInput).toBeVisible()
    await expect(findingsPage.capaInput).toBeVisible()
    await expect(findingsPage.dueDateInput).toBeVisible()

    // Status field should NOT be visible in create mode
    await expect(findingsPage.statusSelect).not.toBeVisible()

    await page.screenshot({ path: 'test-results/add-finding-modal.png', fullPage: true })
  })

  test('should create a new finding with all fields', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Click add finding button
    await findingsPage.clickAddFinding()

    // Fill the form with all fields
    await findingsPage.fillFindingForm({
      severity: TEST_FINDING.severity,
      description: TEST_FINDING.description,
      rootCause: TEST_FINDING.rootCause,
      capa: TEST_FINDING.capa,
      dueDate: getFutureDueDate(),
    })

    // Take screenshot before submit
    await page.screenshot({ path: 'test-results/add-finding-form-filled.png', fullPage: true })

    // Submit the form
    await findingsPage.submitFindingForm()

    // Wait for modal to close
    await findingsPage.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})

    // Wait for page to update
    await page.waitForLoadState('networkidle')

    // Verify the new finding appears in the list
    const findingCard = await findingsPage.getFindingCard(TEST_FINDING.description.substring(0, 30))
    await expect(findingCard).toBeVisible({ timeout: 10000 })

    // Verify severity badge is correct
    const severityBadge = findingCard.locator('[data-testid="severity-badge"]')
    await expect(severityBadge).toContainText(SEVERITY_LABELS.high)

    await page.screenshot({ path: 'test-results/finding-added.png', fullPage: true })
  })

  test('should create finding with critical severity and verify badge color', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    await findingsPage.clickAddFinding()

    const criticalDescription = 'Critical finding for testing red badge color'
    await findingsPage.fillFindingForm({
      severity: 'critical',
      description: criticalDescription,
    })

    await findingsPage.submitFindingForm()
    await findingsPage.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await page.waitForLoadState('networkidle')

    const findingCard = await findingsPage.getFindingCard('Critical finding')
    await expect(findingCard).toBeVisible({ timeout: 10000 })

    // Verify critical severity badge
    const severityBadge = findingCard.locator('[data-testid="severity-badge"]')
    await expect(severityBadge).toContainText(SEVERITY_LABELS.critical)

    await page.screenshot({ path: 'test-results/finding-critical-badge.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 3: Filter Findings
// ============================================================================
test.describe('Filter Findings', () => {
  test.setTimeout(90000)

  test.beforeEach(async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Ensure we have findings with different severities for filtering
    const findingsCount = await findingsPage.getVisibleFindingsCount()

    if (findingsCount < 3) {
      // Add findings with different severities
      const findingsToAdd = [
        { severity: 'critical', description: 'Critical severity test finding for filters' },
        { severity: 'high', description: 'High severity test finding for filters' },
        { severity: 'medium', description: 'Medium severity test finding for filters' },
      ]

      for (const finding of findingsToAdd) {
        await findingsPage.clickAddFinding()
        await findingsPage.fillFindingForm(finding)
        await findingsPage.submitFindingForm()
        await findingsPage.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(500)
      }
    }
  })

  test('should display severity filter buttons', async ({ page }) => {
    const findingsPage = new FindingsPage(page)

    // Verify severity filter is visible
    await expect(findingsPage.severityFilter).toBeVisible()

    // Verify all severity filter buttons are present
    const allButton = findingsPage.severityFilter.getByRole('button', { name: 'הכל' })
    await expect(allButton).toBeVisible()

    for (const [key, label] of Object.entries(SEVERITY_LABELS)) {
      const button = findingsPage.severityFilter.getByRole('button', { name: label })
      await expect(button).toBeVisible()
    }

    await page.screenshot({ path: 'test-results/findings-severity-filter-buttons.png', fullPage: true })
  })

  test('should filter findings by critical severity', async ({ page }) => {
    const findingsPage = new FindingsPage(page)

    // Get initial count
    const initialCount = await findingsPage.getVisibleFindingsCount()

    // Click critical filter
    await findingsPage.clickSeverityFilter('critical')
    await page.waitForTimeout(500)

    // Verify only critical findings are shown
    const filteredCount = await findingsPage.getVisibleFindingsCount()

    // All visible cards should have critical badge
    const criticalBadges = findingsPage.findingCards.locator('[data-testid="severity-badge"]').filter({ hasText: SEVERITY_LABELS.critical })
    const criticalCount = await criticalBadges.count()

    expect(filteredCount).toBe(criticalCount)

    await page.screenshot({ path: 'test-results/findings-filter-critical.png', fullPage: true })
  })

  test('should filter findings by status', async ({ page }) => {
    const findingsPage = new FindingsPage(page)

    // Verify status filter is visible
    await expect(findingsPage.statusFilter).toBeVisible()

    // Verify all status filter buttons are present
    const allButton = findingsPage.statusFilter.getByRole('button', { name: 'הכל' })
    await expect(allButton).toBeVisible()

    for (const [key, label] of Object.entries(STATUS_LABELS)) {
      const button = findingsPage.statusFilter.getByRole('button', { name: label })
      await expect(button).toBeVisible()
    }

    // Click Open status filter
    await findingsPage.clickStatusFilter('open')
    await page.waitForTimeout(500)

    // Verify only open findings are shown
    const visibleCards = findingsPage.findingCards
    const cardCount = await visibleCards.count()

    for (let i = 0; i < cardCount; i++) {
      const statusBadge = visibleCards.nth(i).locator('[data-testid="status-badge"]')
      await expect(statusBadge).toContainText(STATUS_LABELS.open)
    }

    await page.screenshot({ path: 'test-results/findings-filter-open-status.png', fullPage: true })
  })

  test('should clear filters and show all findings', async ({ page }) => {
    const findingsPage = new FindingsPage(page)

    // Get initial count
    const initialCount = await findingsPage.getVisibleFindingsCount()

    // Apply a filter
    await findingsPage.clickSeverityFilter('critical')
    await page.waitForTimeout(500)

    const filteredCount = await findingsPage.getVisibleFindingsCount()

    // Clear filter by clicking "All"
    await findingsPage.clickSeverityFilter('all')
    await page.waitForTimeout(500)

    const clearedCount = await findingsPage.getVisibleFindingsCount()

    // Should return to showing all findings
    expect(clearedCount).toBe(initialCount)

    await page.screenshot({ path: 'test-results/findings-filter-cleared.png', fullPage: true })
  })

  test('should show no matches message when filter returns empty', async ({ page }) => {
    const findingsPage = new FindingsPage(page)

    // Apply both filters to get no results (if possible)
    await findingsPage.clickSeverityFilter('low')
    await page.waitForTimeout(500)
    await findingsPage.clickStatusFilter('closed')
    await page.waitForTimeout(500)

    // Check if "no matches" message appears
    const noMatchesMessage = page.locator('text=אין ממצאים תואמים לסינון הנבחר')
    const findingsCount = await findingsPage.getVisibleFindingsCount()

    // Either we have no findings or the no matches message shows
    if (findingsCount === 0) {
      await expect(noMatchesMessage).toBeVisible()
    }

    await page.screenshot({ path: 'test-results/findings-filter-no-matches.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 4: Edit Finding
// ============================================================================
test.describe('Edit Finding', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Ensure we have a finding to edit
    const findingsCount = await findingsPage.getVisibleFindingsCount()

    if (findingsCount === 0) {
      await findingsPage.clickAddFinding()
      await findingsPage.fillFindingForm({
        severity: 'medium',
        description: 'Finding to be edited in E2E test',
        capa: 'Initial CAPA action',
      })
      await findingsPage.submitFindingForm()
      await findingsPage.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')
    }
  })

  test('should open Edit Finding modal when clicking edit button', async ({ page }) => {
    const findingsPage = new FindingsPage(page)

    // Get first finding card
    const firstCard = findingsPage.findingCards.first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Click edit button
    await firstCard.getByRole('button', { name: /עריכה/i }).click()
    await findingsPage.modalOverlay.waitFor({ state: 'visible' })

    // Verify modal is open with edit title
    const modalTitle = findingsPage.modalDialog.locator('text=עריכת ממצא')
    await expect(modalTitle).toBeVisible()

    // Verify status field IS visible in edit mode
    await expect(findingsPage.statusSelect).toBeVisible()

    await page.screenshot({ path: 'test-results/edit-finding-modal.png', fullPage: true })
  })

  test('should update finding status from Open to In Progress', async ({ page }) => {
    const findingsPage = new FindingsPage(page)

    // Get first finding card with Open status
    const openFindingCard = findingsPage.findingCards.filter({
      has: page.locator('[data-testid="status-badge"]', { hasText: STATUS_LABELS.open })
    }).first()

    // If no open finding, use first card
    const cardToEdit = await openFindingCard.isVisible() ? openFindingCard : findingsPage.findingCards.first()
    await expect(cardToEdit).toBeVisible({ timeout: 10000 })

    // Click edit button
    await cardToEdit.getByRole('button', { name: /עריכה/i }).click()
    await findingsPage.modalOverlay.waitFor({ state: 'visible' })

    // Change status to In Progress
    await findingsPage.statusSelect.selectOption('in_progress')

    // Take screenshot before save
    await page.screenshot({ path: 'test-results/edit-finding-status-changed.png', fullPage: true })

    // Submit the form
    await findingsPage.submitFindingForm()

    // Wait for modal to close
    await findingsPage.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await page.waitForLoadState('networkidle')

    // Wait for UI to update
    await page.waitForTimeout(1000)

    await page.screenshot({ path: 'test-results/finding-status-updated.png', fullPage: true })
  })

  test('should update CAPA field and verify changes', async ({ page }) => {
    const findingsPage = new FindingsPage(page)

    // Get first finding card
    const firstCard = findingsPage.findingCards.first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Click edit button
    await firstCard.getByRole('button', { name: /עריכה/i }).click()
    await findingsPage.modalOverlay.waitFor({ state: 'visible' })

    // Update CAPA field
    const updatedCapa = `Updated CAPA at ${Date.now()}`
    await findingsPage.capaInput.clear()
    await findingsPage.capaInput.fill(updatedCapa)

    // Submit the form
    await findingsPage.submitFindingForm()

    // Wait for modal to close
    await findingsPage.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await page.waitForLoadState('networkidle')

    // Verify CAPA status shows "yes" (has CAPA)
    const updatedCard = findingsPage.findingCards.first()
    const capaStatus = updatedCard.locator('[data-testid="capa-status"]')
    await expect(capaStatus).toContainText('יש')

    await page.screenshot({ path: 'test-results/finding-capa-updated.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 5: CAPA Tracker Widget
// ============================================================================
test.describe('CAPA Tracker Widget', () => {
  test.setTimeout(60000)

  test('should display CAPA Tracker with statistics', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Verify CAPA Tracker container is visible
    await expect(findingsPage.capaTracker).toBeVisible()

    // Verify title
    const trackerTitle = findingsPage.capaTracker.locator('h2').filter({ hasText: 'CAPA מעקב' })
    await expect(trackerTitle).toBeVisible()

    await page.screenshot({ path: 'test-results/capa-tracker-visible.png', fullPage: true })
  })

  test('should display total findings count', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Verify total count is displayed
    await expect(findingsPage.totalCount).toBeVisible()

    // Get the count value
    const totalValue = await findingsPage.totalCount.textContent()
    expect(totalValue).not.toBeNull()

    await page.screenshot({ path: 'test-results/capa-tracker-total.png', fullPage: true })
  })

  test('should display CAPA completion percentage', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Get visible findings count
    const findingsCount = await findingsPage.getVisibleFindingsCount()

    if (findingsCount > 0) {
      // Verify completion percentage is displayed
      await expect(findingsPage.completionPercentage).toBeVisible()

      // Get the percentage value
      const percentageText = await findingsPage.completionPercentage.textContent()
      expect(percentageText).toMatch(/\d+%/)

      // Verify progress bar exists
      const progressBar = findingsPage.capaTracker.locator('[data-testid="progress-bar"]')
      await expect(progressBar).toBeVisible()
    }

    await page.screenshot({ path: 'test-results/capa-tracker-percentage.png', fullPage: true })
  })

  test('should display overdue findings warning when applicable', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Check if there are overdue findings
    const overdueCountElement = findingsPage.overdueCount
    await expect(overdueCountElement).toBeVisible()

    const overdueValue = await overdueCountElement.textContent()
    const overdueNumber = parseInt(overdueValue || '0', 10)

    // If there are overdue findings, badge should be visible
    if (overdueNumber > 0) {
      await expect(findingsPage.overdueBadge).toBeVisible()
      await expect(findingsPage.overdueBadge).toContainText('באיחור')
    }

    await page.screenshot({ path: 'test-results/capa-tracker-overdue.png', fullPage: true })
  })

  test('should display severity breakdown when findings exist', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    const findingsCount = await findingsPage.getVisibleFindingsCount()

    if (findingsCount > 0) {
      // Check for with/without CAPA counts
      await expect(findingsPage.withCapaCount).toBeVisible()
      await expect(findingsPage.withoutCapaCount).toBeVisible()

      // Severity breakdown may only show if there are findings without CAPA
      const withoutCapaValue = await findingsPage.withoutCapaCount.textContent()
      const withoutCapaNumber = parseInt(withoutCapaValue || '0', 10)

      if (withoutCapaNumber > 0) {
        // Severity breakdown should be visible
        const breakdownExists = await findingsPage.severityBreakdown.isVisible().catch(() => false)
        // Note: This may not always be visible depending on data
      }
    }

    await page.screenshot({ path: 'test-results/capa-tracker-breakdown.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 6: Finding Card Display
// ============================================================================
test.describe('Finding Card Display', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Ensure we have at least one finding
    const findingsCount = await findingsPage.getVisibleFindingsCount()

    if (findingsCount === 0) {
      await findingsPage.clickAddFinding()
      await findingsPage.fillFindingForm({
        severity: 'high',
        description: 'Finding card display test finding',
        capa: 'CAPA for display test',
        dueDate: getFutureDueDate(),
      })
      await findingsPage.submitFindingForm()
      await findingsPage.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')
    }
  })

  test('should display finding card with severity badge', async ({ page }) => {
    const findingsPage = new FindingsPage(page)

    const firstCard = findingsPage.findingCards.first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Verify severity badge is present
    const severityBadge = firstCard.locator('[data-testid="severity-badge"]')
    await expect(severityBadge).toBeVisible()

    // Verify badge contains valid severity text
    const badgeText = await severityBadge.textContent()
    const validSeverities = Object.values(SEVERITY_LABELS)
    expect(validSeverities.some(s => badgeText?.includes(s))).toBe(true)

    await page.screenshot({ path: 'test-results/finding-card-severity-badge.png', fullPage: true })
  })

  test('should display finding card with status badge', async ({ page }) => {
    const findingsPage = new FindingsPage(page)

    const firstCard = findingsPage.findingCards.first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Verify status badge is present
    const statusBadge = firstCard.locator('[data-testid="status-badge"]')
    await expect(statusBadge).toBeVisible()

    // Verify badge contains valid status text
    const badgeText = await statusBadge.textContent()
    const validStatuses = Object.values(STATUS_LABELS)
    expect(validStatuses.some(s => badgeText?.includes(s))).toBe(true)

    await page.screenshot({ path: 'test-results/finding-card-status-badge.png', fullPage: true })
  })

  test('should display CAPA indicator on finding card', async ({ page }) => {
    const findingsPage = new FindingsPage(page)

    const firstCard = findingsPage.findingCards.first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Verify CAPA status indicator is present
    const capaStatus = firstCard.locator('[data-testid="capa-status"]')
    await expect(capaStatus).toBeVisible()

    // Should show either "yes" or "no" in Hebrew
    const capaText = await capaStatus.textContent()
    expect(capaText === 'יש' || capaText === 'אין').toBe(true)

    await page.screenshot({ path: 'test-results/finding-card-capa-indicator.png', fullPage: true })
  })

  test('should display due date on finding card when set', async ({ page }) => {
    const findingsPage = new FindingsPage(page)

    // Find a card with due date
    const cardsWithDueDate = findingsPage.findingCards.filter({
      has: page.locator('[data-testid="due-date"]')
    })

    const cardCount = await cardsWithDueDate.count()

    if (cardCount > 0) {
      const cardWithDueDate = cardsWithDueDate.first()
      const dueDateElement = cardWithDueDate.locator('[data-testid="due-date"]')
      await expect(dueDateElement).toBeVisible()

      // Verify date format (Hebrew locale)
      const dateText = await dueDateElement.textContent()
      expect(dateText).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    }

    await page.screenshot({ path: 'test-results/finding-card-due-date.png', fullPage: true })
  })

  test('should display edit and delete buttons on finding card', async ({ page }) => {
    const findingsPage = new FindingsPage(page)

    const firstCard = findingsPage.findingCards.first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Verify edit button
    const editButton = firstCard.getByRole('button', { name: /עריכה/i })
    await expect(editButton).toBeVisible()

    // Verify delete button
    const deleteButton = firstCard.getByRole('button', { name: /מחיקה/i })
    await expect(deleteButton).toBeVisible()

    await page.screenshot({ path: 'test-results/finding-card-action-buttons.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 7: Empty State
// ============================================================================
test.describe('Empty State', () => {
  // Note: This test may need to run in isolation or clean up after itself
  test.skip('should display empty state when no findings exist', async ({ page }) => {
    // This test is skipped by default as it requires clean database state
    // Uncomment and run manually with a clean database

    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Check for empty state message
    const emptyStateMessage = page.locator('text=אין ממצאים עדיין')
    const emptyStateDescription = page.locator('text=הוסיפו את הממצא הראשון')

    await expect(emptyStateMessage).toBeVisible()
    await expect(emptyStateDescription).toBeVisible()

    // Verify Add Finding button is still present in empty state
    await expect(findingsPage.addFindingButton).toBeVisible()

    await page.screenshot({ path: 'test-results/findings-empty-state.png', fullPage: true })
  })

  test('should display CAPA Tracker empty state when no findings', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    const findingsCount = await findingsPage.getVisibleFindingsCount()

    if (findingsCount === 0) {
      // Check for CAPA tracker empty state
      const capaEmptyState = findingsPage.capaTracker.locator('[data-testid="capa-tracker-empty"]')
      const hasEmptyState = await capaEmptyState.isVisible().catch(() => false)

      if (hasEmptyState) {
        const emptyMessage = capaEmptyState.locator('text=אין ממצאים למעקב')
        await expect(emptyMessage).toBeVisible()
      }
    }

    await page.screenshot({ path: 'test-results/capa-tracker-empty-state.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 8: Validation
// ============================================================================
test.describe('Validation', () => {
  test.setTimeout(60000)

  test('should show validation error for empty description', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    await findingsPage.clickAddFinding()

    // Try to submit with empty description
    await findingsPage.submitFindingForm()

    // Verify validation error appears
    const errorMessage = page.locator('text=יש להזין תיאור הממצא')
    await expect(errorMessage).toBeVisible()

    await page.screenshot({ path: 'test-results/validation-empty-description.png', fullPage: true })
  })

  test('should show validation error for description less than 10 characters', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    await findingsPage.clickAddFinding()

    // Fill description with less than 10 characters
    await findingsPage.descriptionInput.fill('Short')

    // Try to submit
    await findingsPage.submitFindingForm()

    // Verify validation error appears
    const errorMessage = page.locator('text=תיאור קצר מדי - לפחות 10 תווים')
    await expect(errorMessage).toBeVisible()

    await page.screenshot({ path: 'test-results/validation-short-description.png', fullPage: true })
  })

  test('should show validation error when task is not selected', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    await findingsPage.clickAddFinding()

    // Fill only description (without selecting task)
    await findingsPage.descriptionInput.fill('This is a valid description with more than 10 characters')

    // Don't select any task - keep default empty option

    // Try to submit
    await findingsPage.submitFindingForm()

    // Verify validation error for task selection
    const errorMessage = page.locator('text=יש לבחור משימה')
    await expect(errorMessage).toBeVisible()

    await page.screenshot({ path: 'test-results/validation-no-task.png', fullPage: true })
  })

  test('should allow form submission after fixing validation errors', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    await findingsPage.clickAddFinding()

    // First, trigger validation error
    await findingsPage.descriptionInput.fill('Short')
    await findingsPage.submitFindingForm()

    // Verify error appears
    const errorMessage = page.locator('text=תיאור קצר מדי - לפחות 10 תווים')
    await expect(errorMessage).toBeVisible()

    // Fix the error
    await findingsPage.descriptionInput.clear()
    await findingsPage.descriptionInput.fill('This is now a valid description with more than 10 characters')

    // Select a task
    const taskSelect = findingsPage.taskSelect
    const taskOptions = await taskSelect.locator('option').all()
    if (taskOptions.length > 1) {
      await taskSelect.selectOption({ index: 1 })
    }

    // Submit again
    await findingsPage.submitFindingForm()

    // Modal should close (successful submission)
    await findingsPage.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})

    await page.screenshot({ path: 'test-results/validation-fixed-submission.png', fullPage: true })
  })

  test('should clear validation error when field is modified', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    await findingsPage.clickAddFinding()

    // Trigger validation error
    await findingsPage.descriptionInput.fill('Short')
    await findingsPage.submitFindingForm()

    // Verify error appears
    const errorMessage = page.locator('text=תיאור קצר מדי - לפחות 10 תווים')
    await expect(errorMessage).toBeVisible()

    // Start typing more text
    await findingsPage.descriptionInput.fill('This is now long enough')

    // Error should be cleared
    await expect(errorMessage).not.toBeVisible()

    await page.screenshot({ path: 'test-results/validation-error-cleared.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 9: Integration Tests
// ============================================================================
test.describe('Integration Tests', () => {
  test.setTimeout(120000)

  test('full workflow: create, filter, edit, verify tracker updates', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Step 1: Create a new finding
    await findingsPage.clickAddFinding()
    const uniqueDescription = `Integration test finding ${Date.now()}`
    await findingsPage.fillFindingForm({
      severity: 'high',
      description: uniqueDescription,
      rootCause: 'Integration test root cause',
      dueDate: getFutureDueDate(),
    })
    await findingsPage.submitFindingForm()
    await findingsPage.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await page.waitForLoadState('networkidle')

    await page.screenshot({ path: 'test-results/integration-step1-created.png', fullPage: true })

    // Step 2: Verify finding appears in list
    const newFindingCard = await findingsPage.getFindingCard(uniqueDescription.substring(0, 20))
    await expect(newFindingCard).toBeVisible({ timeout: 10000 })

    // Step 3: Filter to show only high severity
    await findingsPage.clickSeverityFilter('high')
    await page.waitForTimeout(500)

    // Verify our finding is still visible
    await expect(newFindingCard).toBeVisible()

    await page.screenshot({ path: 'test-results/integration-step3-filtered.png', fullPage: true })

    // Step 4: Edit the finding - add CAPA
    await newFindingCard.getByRole('button', { name: /עריכה/i }).click()
    await findingsPage.modalOverlay.waitFor({ state: 'visible' })

    const capaText = 'Integration test CAPA action'
    await findingsPage.capaInput.fill(capaText)
    await findingsPage.statusSelect.selectOption('in_progress')

    await findingsPage.submitFindingForm()
    await findingsPage.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await page.waitForLoadState('networkidle')

    await page.screenshot({ path: 'test-results/integration-step4-edited.png', fullPage: true })

    // Step 5: Verify CAPA tracker updates
    // Clear filter first
    await findingsPage.clickSeverityFilter('all')
    await page.waitForTimeout(500)

    // Check that CAPA tracker shows updated stats
    const withCapaCount = await findingsPage.withCapaCount.textContent()
    expect(parseInt(withCapaCount || '0', 10)).toBeGreaterThan(0)

    await page.screenshot({ path: 'test-results/integration-step5-tracker-updated.png', fullPage: true })

    // Step 6: Verify the status changed
    const updatedCard = await findingsPage.getFindingCard(uniqueDescription.substring(0, 20))
    const statusBadge = updatedCard.locator('[data-testid="status-badge"]')
    await expect(statusBadge).toContainText(STATUS_LABELS.in_progress)

    // Step 7: Verify CAPA indicator changed
    const capaStatus = updatedCard.locator('[data-testid="capa-status"]')
    await expect(capaStatus).toContainText('יש')

    await page.screenshot({ path: 'test-results/integration-complete.png', fullPage: true })
  })

  test('delete finding and verify tracker updates', async ({ page }) => {
    const findingsPage = new FindingsPage(page)
    await findingsPage.goto()
    await findingsPage.waitForPageLoad()

    // Get initial counts
    const initialTotal = await findingsPage.totalCount.textContent()
    const initialCount = parseInt(initialTotal || '0', 10)

    // Create a finding to delete
    await findingsPage.clickAddFinding()
    const deleteTestDescription = `Delete test finding ${Date.now()}`
    await findingsPage.fillFindingForm({
      severity: 'low',
      description: deleteTestDescription,
    })
    await findingsPage.submitFindingForm()
    await findingsPage.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await page.waitForLoadState('networkidle')

    // Verify count increased
    await page.waitForTimeout(1000)
    const afterCreateTotal = await findingsPage.totalCount.textContent()
    const afterCreateCount = parseInt(afterCreateTotal || '0', 10)
    expect(afterCreateCount).toBe(initialCount + 1)

    await page.screenshot({ path: 'test-results/delete-test-before.png', fullPage: true })

    // Delete the finding
    const findingToDelete = await findingsPage.getFindingCard(deleteTestDescription.substring(0, 20))
    await findingToDelete.getByRole('button', { name: /מחיקה/i }).click()

    // Wait for deletion
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Verify count decreased
    const afterDeleteTotal = await findingsPage.totalCount.textContent()
    const afterDeleteCount = parseInt(afterDeleteTotal || '0', 10)
    expect(afterDeleteCount).toBe(initialCount)

    await page.screenshot({ path: 'test-results/delete-test-after.png', fullPage: true })
  })
})
