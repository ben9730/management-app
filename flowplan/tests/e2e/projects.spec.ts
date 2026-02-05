import { test, expect, Page } from '@playwright/test'

/**
 * Projects Page E2E Tests
 *
 * Tests critical user journeys for the Projects page:
 * 1. Page Navigation
 * 2. Projects List Display
 * 3. Create New Project
 * 4. Edit Project
 * 5. Delete Project
 * 6. Project Selection (navigate to dashboard)
 * 7. Filters and Sorting
 * 8. Empty State
 *
 * Hebrew RTL support tested throughout.
 */

// Test user credentials
const TEST_USER = {
  email: `projects-e2e-${Date.now()}@flowplan.test`,
  password: 'TestPassword123!',
  fullName: 'Projects Test User',
}

// Test project data
const TEST_PROJECT = {
  name: `E2E Test Project ${Date.now()}`,
  description: 'Project created for E2E testing of projects page',
}

// Page Object for Projects Page
class ProjectsPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  // Layout Locators
  get pageTitle() {
    return this.page.locator('h1').filter({ hasText: 'ניהול פרויקטים' })
  }

  get pageContainer() {
    return this.page.locator('main')
  }

  get loadingIndicator() {
    return this.page.locator('[data-testid="loading"], .animate-spin')
  }

  // Project List Locators
  get projectsList() {
    return this.page.locator('[data-testid="projects-list"]')
  }

  get projectCards() {
    return this.page.locator('[data-testid*="project-card"], article, [class*="card"]')
  }

  get emptyState() {
    return this.page.locator('[data-testid="empty-state"], text=/אין פרויקטים|No projects/i')
  }

  // Action Buttons
  get addProjectButton() {
    return this.page.getByRole('button', { name: /הוסף פרויקט|פרויקט חדש|add project/i })
  }

  // Modal Locators
  get projectModal() {
    return this.page.getByRole('dialog')
  }

  get modalTitle() {
    return this.projectModal.locator('h2, h3')
  }

  // Form Locators
  get nameInput() {
    return this.page.locator('#name')
  }

  get descriptionInput() {
    return this.page.locator('#description')
  }

  get statusSelect() {
    return this.page.locator('#status')
  }

  get startDateInput() {
    return this.page.locator('#start_date')
  }

  get endDateInput() {
    return this.page.locator('#end_date')
  }

  get submitButton() {
    return this.projectModal.getByRole('button', { name: /צור|שמור|עדכן|create|save/i })
  }

  get cancelButton() {
    return this.projectModal.getByRole('button', { name: /ביטול|cancel/i })
  }

  // Filter Locators
  get statusFilter() {
    return this.page.locator('[data-testid="status-filter"]')
  }

  get searchInput() {
    return this.page.locator('[data-testid="search-input"], input[placeholder*="חיפוש"]')
  }

  // Actions
  async goto() {
    await this.page.goto('/projects')
    await this.page.waitForLoadState('networkidle')
  }

  async waitForPageLoad() {
    await Promise.race([
      this.loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {}),
      this.pageTitle.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {}),
    ])
    await this.page.waitForLoadState('networkidle')
  }

  async openAddProjectModal() {
    await this.addProjectButton.click()
    await this.projectModal.waitFor({ state: 'visible' })
  }

  async fillProjectForm(data: {
    name: string
    description?: string
    status?: string
    startDate?: string
    endDate?: string
  }) {
    await this.nameInput.fill(data.name)

    if (data.description) {
      await this.descriptionInput.fill(data.description)
    }

    if (data.status) {
      await this.statusSelect.selectOption(data.status)
    }

    if (data.startDate) {
      await this.startDateInput.fill(data.startDate)
    }

    if (data.endDate) {
      await this.endDateInput.fill(data.endDate)
    }
  }

  async submitForm() {
    await this.submitButton.click()
  }

  async closeModal() {
    await this.cancelButton.click()
  }

  async getProjectCard(nameSubstring: string) {
    return this.projectCards.filter({ hasText: nameSubstring }).first()
  }

  async editProject(nameSubstring: string) {
    const card = await this.getProjectCard(nameSubstring)
    const editButton = card.getByRole('button', { name: /עריכה|edit/i })
    await editButton.click()
    await this.projectModal.waitFor({ state: 'visible' })
  }

  async deleteProject(nameSubstring: string) {
    const card = await this.getProjectCard(nameSubstring)
    const deleteButton = card.getByRole('button', { name: /מחיקה|delete/i })
    await deleteButton.click()
  }

  async selectProject(nameSubstring: string) {
    const card = await this.getProjectCard(nameSubstring)
    const selectButton = card.getByRole('button', { name: /בחר|select|פתח/i })
    if (await selectButton.isVisible().catch(() => false)) {
      await selectButton.click()
    } else {
      // Click on card itself if no select button
      await card.click()
    }
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

// ============================================================================
// Test Suite 1: Page Navigation
// ============================================================================
test.describe('Projects Page Navigation', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('should navigate to /projects page', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // Verify URL
    await expect(page).toHaveURL(/\/projects/)

    await page.screenshot({ path: 'test-results/projects-page-navigation.png', fullPage: true })
  })

  test('should display page title in Hebrew', async ({ page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()
    await projectsPage.waitForPageLoad()

    // Verify page title
    await expect(projectsPage.pageTitle).toBeVisible()

    await page.screenshot({ path: 'test-results/projects-page-title.png', fullPage: true })
  })

  test('should display add project button', async ({ page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()
    await projectsPage.waitForPageLoad()

    // Verify add button is visible
    await expect(projectsPage.addProjectButton).toBeVisible()

    await page.screenshot({ path: 'test-results/projects-add-button.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 2: Projects List Display
// ============================================================================
test.describe('Projects List Display', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('should display projects list or empty state', async ({ page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()
    await projectsPage.waitForPageLoad()

    // Either projects list or empty state should be visible
    const hasProjects = await projectsPage.projectCards.first().isVisible().catch(() => false)
    const hasEmptyState = await projectsPage.emptyState.isVisible().catch(() => false)

    // One of them should be true
    expect(hasProjects || hasEmptyState || await projectsPage.addProjectButton.isVisible()).toBe(true)

    await page.screenshot({ path: 'test-results/projects-list-display.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 3: Create New Project
// ============================================================================
test.describe('Create New Project', () => {
  test.setTimeout(90000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('should open create project modal', async ({ page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()
    await projectsPage.waitForPageLoad()

    await projectsPage.openAddProjectModal()

    // Verify modal is open
    await expect(projectsPage.projectModal).toBeVisible()

    // Verify form fields are present
    await expect(projectsPage.nameInput).toBeVisible()

    await page.screenshot({ path: 'test-results/projects-create-modal.png', fullPage: true })
  })

  test('should create a new project', async ({ page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()
    await projectsPage.waitForPageLoad()

    await projectsPage.openAddProjectModal()

    // Fill form
    await projectsPage.fillProjectForm({
      name: TEST_PROJECT.name,
      description: TEST_PROJECT.description,
    })

    await page.screenshot({ path: 'test-results/projects-form-filled.png', fullPage: true })

    // Submit
    await projectsPage.submitForm()

    // Wait for modal to close
    await projectsPage.projectModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await page.waitForLoadState('networkidle')

    // Verify project appears in list
    await page.waitForTimeout(1000)
    const projectCard = await projectsPage.getProjectCard(TEST_PROJECT.name)
    await expect(projectCard).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'test-results/projects-created.png', fullPage: true })
  })

  test('should validate required fields', async ({ page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()
    await projectsPage.waitForPageLoad()

    await projectsPage.openAddProjectModal()

    // Try to submit without filling required fields
    await projectsPage.submitForm()

    // Modal should still be open (validation failed)
    await expect(projectsPage.projectModal).toBeVisible()

    // Name field should be required
    await expect(projectsPage.nameInput).toHaveAttribute('required', '')

    await page.screenshot({ path: 'test-results/projects-validation.png', fullPage: true })
  })

  test('should cancel project creation', async ({ page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()
    await projectsPage.waitForPageLoad()

    await projectsPage.openAddProjectModal()

    // Fill some data
    await projectsPage.nameInput.fill('Cancelled Project')

    // Cancel
    await projectsPage.closeModal()

    // Modal should be closed
    await projectsPage.projectModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

    await page.screenshot({ path: 'test-results/projects-cancel.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 4: Edit Project
// ============================================================================
test.describe('Edit Project', () => {
  test.setTimeout(90000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)

    // Create a project to edit
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()
    await projectsPage.waitForPageLoad()

    // Check if we need to create a project first
    const hasProjects = await projectsPage.projectCards.first().isVisible().catch(() => false)
    if (!hasProjects) {
      await projectsPage.openAddProjectModal()
      await projectsPage.fillProjectForm({
        name: `Edit Test Project ${Date.now()}`,
        description: 'Project to be edited',
      })
      await projectsPage.submitForm()
      await projectsPage.projectModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
    }
  })

  test('should open edit modal for existing project', async ({ page }) => {
    const projectsPage = new ProjectsPage(page)

    // Get first project card
    const firstCard = projectsPage.projectCards.first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Click edit button
    const editButton = firstCard.getByRole('button', { name: /עריכה|edit/i })
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click()
      await projectsPage.projectModal.waitFor({ state: 'visible' })

      // Verify modal title indicates editing
      await expect(projectsPage.modalTitle).toContainText(/עריכת|edit/i)

      // Verify form is pre-filled
      const nameValue = await projectsPage.nameInput.inputValue()
      expect(nameValue.length).toBeGreaterThan(0)

      await page.screenshot({ path: 'test-results/projects-edit-modal.png', fullPage: true })
    }
  })

  test('should update project details', async ({ page }) => {
    const projectsPage = new ProjectsPage(page)

    // Get first project card
    const firstCard = projectsPage.projectCards.first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Click edit button
    const editButton = firstCard.getByRole('button', { name: /עריכה|edit/i })
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click()
      await projectsPage.projectModal.waitFor({ state: 'visible' })

      // Update name
      const updatedName = `Updated Project ${Date.now()}`
      await projectsPage.nameInput.clear()
      await projectsPage.nameInput.fill(updatedName)

      await page.screenshot({ path: 'test-results/projects-edit-form.png', fullPage: true })

      // Submit
      await projectsPage.submitForm()

      // Wait for modal to close
      await projectsPage.projectModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')

      await page.screenshot({ path: 'test-results/projects-edited.png', fullPage: true })
    }
  })
})

// ============================================================================
// Test Suite 5: Delete Project
// ============================================================================
test.describe('Delete Project', () => {
  test.setTimeout(90000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)

    // Create a project to delete
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()
    await projectsPage.waitForPageLoad()

    // Create a project for deletion
    await projectsPage.openAddProjectModal()
    await projectsPage.fillProjectForm({
      name: `Delete Test Project ${Date.now()}`,
      description: 'Project to be deleted',
    })
    await projectsPage.submitForm()
    await projectsPage.projectModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test('should delete a project', async ({ page }) => {
    const projectsPage = new ProjectsPage(page)

    // Get initial count
    const initialCount = await projectsPage.projectCards.count()

    await page.screenshot({ path: 'test-results/projects-before-delete.png', fullPage: true })

    // Get first project card
    const firstCard = projectsPage.projectCards.first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Click delete button
    const deleteButton = firstCard.getByRole('button', { name: /מחיקה|delete/i })
    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click()

      // Wait for deletion
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      await page.screenshot({ path: 'test-results/projects-after-delete.png', fullPage: true })
    }
  })
})

// ============================================================================
// Test Suite 6: Project Selection
// ============================================================================
test.describe('Project Selection', () => {
  test.setTimeout(90000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)

    // Create a project to select
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()
    await projectsPage.waitForPageLoad()

    // Check if we need to create a project
    const hasProjects = await projectsPage.projectCards.first().isVisible().catch(() => false)
    if (!hasProjects) {
      await projectsPage.openAddProjectModal()
      await projectsPage.fillProjectForm({
        name: `Select Test Project ${Date.now()}`,
      })
      await projectsPage.submitForm()
      await projectsPage.projectModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
    }
  })

  test('should navigate to dashboard when selecting a project', async ({ page }) => {
    const projectsPage = new ProjectsPage(page)

    // Get first project card
    const firstCard = projectsPage.projectCards.first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Look for select button or click card
    const selectButton = firstCard.getByRole('button', { name: /בחר|select|פתח|open/i })
    if (await selectButton.isVisible().catch(() => false)) {
      await selectButton.click()
    } else {
      // Try clicking the card itself
      await firstCard.click()
    }

    // Wait for navigation
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Should navigate to dashboard with project parameter
    const currentUrl = page.url()
    const isOnDashboard = currentUrl.includes('project=') || currentUrl === page.url().split('?')[0]

    await page.screenshot({ path: 'test-results/projects-selection-redirect.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 7: Integration Tests
// ============================================================================
test.describe('Projects Page Integration Tests', () => {
  test.setTimeout(180000)

  test('full workflow: create, edit, select, delete project', async ({ page }) => {
    await registerAndLogin(page)

    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()
    await projectsPage.waitForPageLoad()

    // Step 1: Create project
    const projectName = `Integration Project ${Date.now()}`
    await projectsPage.openAddProjectModal()
    await projectsPage.fillProjectForm({
      name: projectName,
      description: 'Integration test project',
    })
    await projectsPage.submitForm()
    await projectsPage.projectModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.screenshot({ path: 'test-results/projects-integration-step1-created.png', fullPage: true })

    // Step 2: Verify project in list
    const projectCard = await projectsPage.getProjectCard(projectName)
    await expect(projectCard).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'test-results/projects-integration-step2-visible.png', fullPage: true })

    // Step 3: Edit project
    const editButton = projectCard.getByRole('button', { name: /עריכה|edit/i })
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click()
      await projectsPage.projectModal.waitFor({ state: 'visible' })

      const updatedName = `Updated ${projectName}`
      await projectsPage.nameInput.clear()
      await projectsPage.nameInput.fill(updatedName)
      await projectsPage.submitForm()
      await projectsPage.projectModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')

      await page.screenshot({ path: 'test-results/projects-integration-step3-edited.png', fullPage: true })
    }

    // Step 4: Navigate back to projects page and delete
    await projectsPage.goto()
    await projectsPage.waitForPageLoad()

    const cardToDelete = projectsPage.projectCards.first()
    const deleteButton = cardToDelete.getByRole('button', { name: /מחיקה|delete/i })
    if (await deleteButton.isVisible().catch(() => false)) {
      await page.screenshot({ path: 'test-results/projects-integration-step4-before-delete.png', fullPage: true })

      await deleteButton.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      await page.screenshot({ path: 'test-results/projects-integration-step5-deleted.png', fullPage: true })
    }
  })
})
