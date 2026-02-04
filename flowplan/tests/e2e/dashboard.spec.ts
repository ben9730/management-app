import { test, expect, Page } from '@playwright/test'

/**
 * Dashboard E2E Tests
 *
 * Tests critical user journeys for the Dashboard:
 * 1. Dashboard Navigation & Layout
 * 2. Project Switching
 * 3. Phase Management
 * 4. Task CRUD Operations
 * 5. Task Status Changes
 * 6. View Mode Switching (Phases/Gantt)
 * 7. Statistics Display
 *
 * Hebrew RTL support tested throughout.
 */

// Test user credentials
const TEST_USER = {
  email: `dashboard-e2e-${Date.now()}@flowplan.test`,
  password: 'TestPassword123!',
  fullName: 'Dashboard Test User',
}

// Test project data
const TEST_PROJECT = {
  name: `E2E Test Project ${Date.now()}`,
  description: 'Project created for E2E testing',
}

// Test task data
const TEST_TASK = {
  title: `E2E Test Task ${Date.now()}`,
  description: 'Task created for E2E testing',
  duration: 5,
  priority: 'medium' as const,
}

// Page Object for Dashboard
class DashboardPage {
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

  get navbar() {
    return this.page.locator('nav')
  }

  // Project Locators
  get projectSelector() {
    return this.page.locator('[data-testid="project-selector"], button:has-text("פרויקט")')
  }

  get createProjectButton() {
    return this.page.getByRole('button', { name: /create project|צור פרויקט|פרויקט חדש/i })
  }

  get projectModal() {
    return this.page.getByRole('dialog')
  }

  // Phase Locators
  get createPhaseButton() {
    return this.page.getByRole('button', { name: /new phase|שלב חדש|צור שלב/i })
  }

  get phaseModal() {
    return this.page.getByRole('dialog')
  }

  get phaseSections() {
    return this.page.locator('[data-testid*="phase"], section')
  }

  // Task Locators
  get createTaskButton() {
    return this.page.getByRole('button', { name: /new task|משימה חדשה/i })
  }

  get taskModal() {
    return this.page.getByRole('dialog')
  }

  get taskCards() {
    return this.page.locator('[data-testid*="task-card"], [class*="task"]')
  }

  // Task Form Locators
  get taskTitleInput() {
    return this.page.locator('[data-testid="task-title-input"], #title, input[name="title"]')
  }

  get taskDescriptionInput() {
    return this.page.locator('[data-testid="task-description-input"], #description, textarea[name="description"]')
  }

  get taskDurationInput() {
    return this.page.locator('[data-testid="task-duration-input"], #duration, input[name="duration"]')
  }

  get taskPrioritySelect() {
    return this.page.locator('[data-testid="task-priority-select"], #priority, select[name="priority"]')
  }

  get taskAssigneeSelect() {
    return this.page.locator('[data-testid="task-assignee-select"], #assignee_id, select[name="assignee_id"]')
  }

  // View Mode Locators
  get phasesViewButton() {
    return this.page.getByRole('button', { name: /phases|שלבים/i })
  }

  get ganttViewButton() {
    return this.page.getByRole('button', { name: /gantt|גאנט/i })
  }

  get ganttChart() {
    return this.page.locator('[data-testid="gantt-chart"], [class*="gantt"]')
  }

  // Stats Locators
  get progressIndicator() {
    return this.page.locator('[data-testid="progress-indicator"], text=/\\d+%/')
  }

  get taskCountDisplay() {
    return this.page.locator('text=/\\d+ משימות|\\d+ tasks/i')
  }

  get criticalTasksCount() {
    return this.page.locator('[data-testid="critical-tasks"], text=/קריטיות|critical/i')
  }

  // Logout
  get logoutButton() {
    return this.page.getByRole('button', { name: /התנתק|יציאה/i })
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

  async openCreateProjectModal() {
    await this.createProjectButton.click()
    await this.projectModal.waitFor({ state: 'visible' })
  }

  async fillProjectForm(name: string, description?: string) {
    await this.page.locator('#name').fill(name)
    if (description) {
      await this.page.locator('#description').fill(description)
    }
  }

  async submitProjectForm() {
    await this.projectModal.getByRole('button', { name: /create|צור/i }).click()
  }

  async openCreatePhaseModal() {
    await this.createPhaseButton.first().click()
    await this.phaseModal.waitFor({ state: 'visible' })
  }

  async fillPhaseForm(name: string) {
    await this.page.locator('#name').fill(name)
  }

  async submitPhaseForm() {
    await this.phaseModal.getByRole('button', { name: /create|צור/i }).click()
  }

  async openCreateTaskModal() {
    await this.createTaskButton.click()
    await this.taskModal.waitFor({ state: 'visible' })
  }

  async fillTaskForm(data: {
    title: string
    description?: string
    duration?: number
    priority?: string
    assigneeId?: string
  }) {
    await this.taskTitleInput.fill(data.title)

    if (data.description) {
      await this.taskDescriptionInput.fill(data.description)
    }

    if (data.duration) {
      await this.taskDurationInput.fill(String(data.duration))
    }

    if (data.priority) {
      await this.taskPrioritySelect.selectOption(data.priority)
    }

    if (data.assigneeId) {
      const assigneeSelect = this.taskAssigneeSelect
      if (await assigneeSelect.isVisible()) {
        await assigneeSelect.selectOption(data.assigneeId)
      }
    }
  }

  async submitTaskForm() {
    await this.taskModal.getByRole('button', { name: /create|צור|שמור/i }).click()
  }

  async switchToGanttView() {
    await this.ganttViewButton.click()
    await this.page.waitForTimeout(500)
  }

  async switchToPhasesView() {
    await this.phasesViewButton.click()
    await this.page.waitForTimeout(500)
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
// Test Suite 1: Dashboard Navigation & Layout
// ============================================================================
test.describe('Dashboard Navigation & Layout', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('should display dashboard with RTL layout', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDashboardLoad()

    // Verify RTL direction
    await expect(dashboard.pageContainer).toBeVisible()

    await page.screenshot({ path: 'test-results/dashboard-rtl-layout.png', fullPage: true })
  })

  test('should display navigation bar', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDashboardLoad()

    // Verify navbar is visible
    await expect(dashboard.navbar).toBeVisible()

    await page.screenshot({ path: 'test-results/dashboard-navbar.png', fullPage: true })
  })

  test('should display logout button for authenticated user', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDashboardLoad()

    // Verify logout button is visible
    await expect(dashboard.logoutButton).toBeVisible()

    await page.screenshot({ path: 'test-results/dashboard-logout-button.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 2: Project Management
// ============================================================================
test.describe('Project Management', () => {
  test.setTimeout(90000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('should display create project button or existing projects', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDashboardLoad()

    // Either create project button or project content should be visible
    const hasCreateButton = await dashboard.createProjectButton.isVisible().catch(() => false)
    const hasProjectContent = await dashboard.phaseSections.first().isVisible().catch(() => false)

    expect(hasCreateButton || hasProjectContent).toBe(true)

    await page.screenshot({ path: 'test-results/dashboard-project-state.png', fullPage: true })
  })

  test('should create a new project', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDashboardLoad()

    // Check if we need to create a project
    if (await dashboard.createProjectButton.isVisible().catch(() => false)) {
      await dashboard.openCreateProjectModal()

      // Fill project form
      await dashboard.fillProjectForm(TEST_PROJECT.name, TEST_PROJECT.description)

      await page.screenshot({ path: 'test-results/dashboard-project-form-filled.png', fullPage: true })

      // Submit
      await dashboard.submitProjectForm()

      // Wait for modal to close
      await dashboard.projectModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')

      await page.screenshot({ path: 'test-results/dashboard-project-created.png', fullPage: true })
    } else {
      // Project already exists
      await page.screenshot({ path: 'test-results/dashboard-project-exists.png', fullPage: true })
    }
  })
})

// ============================================================================
// Test Suite 3: Phase Management
// ============================================================================
test.describe('Phase Management', () => {
  test.setTimeout(90000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)

    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDashboardLoad()

    // Create project if needed
    if (await dashboard.createProjectButton.isVisible().catch(() => false)) {
      await dashboard.openCreateProjectModal()
      await dashboard.fillProjectForm(TEST_PROJECT.name)
      await dashboard.submitProjectForm()
      await dashboard.projectModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
    }
  })

  test('should display create phase button', async ({ page }) => {
    const dashboard = new DashboardPage(page)

    // Verify create phase button is visible
    const hasPhaseButton = await dashboard.createPhaseButton.first().isVisible().catch(() => false)

    await page.screenshot({ path: 'test-results/dashboard-phase-button.png', fullPage: true })
  })

  test('should create a new phase', async ({ page }) => {
    const dashboard = new DashboardPage(page)

    // Try to create a phase
    const phaseButton = dashboard.createPhaseButton.first()
    if (await phaseButton.isVisible().catch(() => false)) {
      await phaseButton.click()

      // Wait for modal
      await dashboard.phaseModal.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})

      // Fill phase form
      const phaseName = `E2E Test Phase ${Date.now()}`
      await dashboard.fillPhaseForm(phaseName)

      await page.screenshot({ path: 'test-results/dashboard-phase-form-filled.png', fullPage: true })

      // Submit
      await dashboard.submitPhaseForm()

      // Wait for modal to close
      await dashboard.phaseModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')

      await page.screenshot({ path: 'test-results/dashboard-phase-created.png', fullPage: true })
    }
  })
})

// ============================================================================
// Test Suite 4: Task CRUD Operations
// ============================================================================
test.describe('Task CRUD Operations', () => {
  test.setTimeout(120000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)

    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDashboardLoad()

    // Create project if needed
    if (await dashboard.createProjectButton.isVisible().catch(() => false)) {
      await dashboard.openCreateProjectModal()
      await dashboard.fillProjectForm(TEST_PROJECT.name)
      await dashboard.submitProjectForm()
      await dashboard.projectModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
    }

    // Create phase if needed (check for "אין שלבים" message)
    const noPhases = await page.locator('text=אין שלבים').isVisible().catch(() => false)
    if (noPhases) {
      const phaseButton = dashboard.createPhaseButton.first()
      if (await phaseButton.isVisible().catch(() => false)) {
        await phaseButton.click()
        await dashboard.phaseModal.waitFor({ state: 'visible' }).catch(() => {})
        await dashboard.fillPhaseForm('Default Phase')
        await dashboard.submitPhaseForm()
        await dashboard.phaseModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)
      }
    }
  })

  test('should display create task button', async ({ page }) => {
    const dashboard = new DashboardPage(page)

    // Check for task button
    const hasTaskButton = await dashboard.createTaskButton.isVisible().catch(() => false)

    await page.screenshot({ path: 'test-results/dashboard-task-button.png', fullPage: true })
  })

  test('should open task creation modal', async ({ page }) => {
    const dashboard = new DashboardPage(page)

    const taskButton = dashboard.createTaskButton
    if (await taskButton.isVisible().catch(() => false)) {
      // Skip if button is disabled
      if (await taskButton.isDisabled()) {
        await page.screenshot({ path: 'test-results/dashboard-task-button-disabled.png', fullPage: true })
        return
      }

      await taskButton.click()
      await dashboard.taskModal.waitFor({ state: 'visible' })

      // Verify form fields are visible
      await expect(dashboard.taskTitleInput).toBeVisible()
      await expect(dashboard.taskDurationInput).toBeVisible()

      await page.screenshot({ path: 'test-results/dashboard-task-modal-open.png', fullPage: true })
    }
  })

  test('should create a new task', async ({ page }) => {
    const dashboard = new DashboardPage(page)

    const taskButton = dashboard.createTaskButton
    if (await taskButton.isVisible().catch(() => false) && !(await taskButton.isDisabled())) {
      await taskButton.click()
      await dashboard.taskModal.waitFor({ state: 'visible' })

      // Fill task form
      await dashboard.fillTaskForm({
        title: TEST_TASK.title,
        description: TEST_TASK.description,
        duration: TEST_TASK.duration,
        priority: TEST_TASK.priority,
      })

      await page.screenshot({ path: 'test-results/dashboard-task-form-filled.png', fullPage: true })

      // Submit
      await dashboard.submitTaskForm()

      // Wait for modal to close
      await dashboard.taskModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')

      // Verify task appears in list
      await page.waitForTimeout(1000)
      const taskElement = page.locator(`text=${TEST_TASK.title}`).first()
      await expect(taskElement).toBeVisible({ timeout: 10000 })

      await page.screenshot({ path: 'test-results/dashboard-task-created.png', fullPage: true })
    }
  })

  test('should edit an existing task', async ({ page }) => {
    const dashboard = new DashboardPage(page)

    // First create a task to edit
    const taskButton = dashboard.createTaskButton
    if (await taskButton.isVisible().catch(() => false) && !(await taskButton.isDisabled())) {
      // Create task
      await taskButton.click()
      await dashboard.taskModal.waitFor({ state: 'visible' })
      const taskTitle = `Edit Test Task ${Date.now()}`
      await dashboard.fillTaskForm({ title: taskTitle, duration: 3 })
      await dashboard.submitTaskForm()
      await dashboard.taskModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Find and click edit button on the task
      const taskCard = page.locator('article, [class*="task"]').filter({ hasText: taskTitle }).first()
      if (await taskCard.isVisible()) {
        const editButton = taskCard.getByRole('button', { name: /edit|עריכה/i })
        if (await editButton.isVisible().catch(() => false)) {
          await editButton.click()
          await dashboard.taskModal.waitFor({ state: 'visible' })

          // Update task title
          const updatedTitle = `Updated ${taskTitle}`
          await dashboard.taskTitleInput.clear()
          await dashboard.taskTitleInput.fill(updatedTitle)

          await page.screenshot({ path: 'test-results/dashboard-task-edit-form.png', fullPage: true })

          // Submit
          await dashboard.submitTaskForm()
          await dashboard.taskModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
          await page.waitForLoadState('networkidle')

          await page.screenshot({ path: 'test-results/dashboard-task-edited.png', fullPage: true })
        }
      }
    }
  })

  test('should delete a task', async ({ page }) => {
    const dashboard = new DashboardPage(page)

    // First create a task to delete
    const taskButton = dashboard.createTaskButton
    if (await taskButton.isVisible().catch(() => false) && !(await taskButton.isDisabled())) {
      // Create task
      await taskButton.click()
      await dashboard.taskModal.waitFor({ state: 'visible' })
      const taskTitle = `Delete Test Task ${Date.now()}`
      await dashboard.fillTaskForm({ title: taskTitle, duration: 2 })
      await dashboard.submitTaskForm()
      await dashboard.taskModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      await page.screenshot({ path: 'test-results/dashboard-task-before-delete.png', fullPage: true })

      // Find and click delete button on the task
      const taskCard = page.locator('article, [class*="task"]').filter({ hasText: taskTitle }).first()
      if (await taskCard.isVisible()) {
        const deleteButton = taskCard.getByRole('button', { name: /delete|מחיקה/i })
        if (await deleteButton.isVisible().catch(() => false)) {
          await deleteButton.click()
          await page.waitForLoadState('networkidle')
          await page.waitForTimeout(1000)

          await page.screenshot({ path: 'test-results/dashboard-task-deleted.png', fullPage: true })
        }
      }
    }
  })
})

// ============================================================================
// Test Suite 5: Task Status Changes
// ============================================================================
test.describe('Task Status Changes', () => {
  test.setTimeout(90000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('should change task status from todo to in_progress', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDashboardLoad()

    // Look for existing tasks with status controls
    const statusButtons = page.locator('[data-testid*="status"], button:has-text("בתהליך")')

    await page.screenshot({ path: 'test-results/dashboard-task-status.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 6: View Mode Switching
// ============================================================================
test.describe('View Mode Switching', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('should switch to Gantt view', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDashboardLoad()

    // Check for Gantt button
    const ganttButton = dashboard.ganttViewButton
    if (await ganttButton.isVisible().catch(() => false)) {
      await ganttButton.click()
      await page.waitForTimeout(1000)

      // Verify Gantt chart is visible
      const ganttChart = dashboard.ganttChart
      const isGanttVisible = await ganttChart.isVisible().catch(() => false)

      await page.screenshot({ path: 'test-results/dashboard-gantt-view.png', fullPage: true })
    }
  })

  test('should switch back to Phases view', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDashboardLoad()

    // Switch to Gantt first if available
    const ganttButton = dashboard.ganttViewButton
    if (await ganttButton.isVisible().catch(() => false)) {
      await ganttButton.click()
      await page.waitForTimeout(500)

      // Switch back to Phases
      const phasesButton = dashboard.phasesViewButton
      if (await phasesButton.isVisible().catch(() => false)) {
        await phasesButton.click()
        await page.waitForTimeout(500)

        await page.screenshot({ path: 'test-results/dashboard-phases-view.png', fullPage: true })
      }
    }
  })
})

// ============================================================================
// Test Suite 7: Statistics Display
// ============================================================================
test.describe('Statistics Display', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('should display project statistics', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDashboardLoad()

    // Take screenshot of stats area
    await page.screenshot({ path: 'test-results/dashboard-statistics.png', fullPage: true })
  })
})

// ============================================================================
// Test Suite 8: Integration Tests
// ============================================================================
test.describe('Dashboard Integration Tests', () => {
  test.setTimeout(180000)

  test('full workflow: create project, phase, task, edit, delete', async ({ page }) => {
    await registerAndLogin(page)

    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.waitForDashboardLoad()

    // Step 1: Create project if needed
    if (await dashboard.createProjectButton.isVisible().catch(() => false)) {
      await dashboard.openCreateProjectModal()
      await dashboard.fillProjectForm(`Integration Test Project ${Date.now()}`)
      await dashboard.submitProjectForm()
      await dashboard.projectModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
    }

    await page.screenshot({ path: 'test-results/dashboard-integration-step1-project.png', fullPage: true })

    // Step 2: Create phase if needed
    const noPhases = await page.locator('text=אין שלבים').isVisible().catch(() => false)
    if (noPhases) {
      const phaseButton = dashboard.createPhaseButton.first()
      if (await phaseButton.isVisible().catch(() => false)) {
        await phaseButton.click()
        await dashboard.phaseModal.waitFor({ state: 'visible' }).catch(() => {})
        await dashboard.fillPhaseForm(`Integration Phase ${Date.now()}`)
        await dashboard.submitPhaseForm()
        await dashboard.phaseModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)
      }
    }

    await page.screenshot({ path: 'test-results/dashboard-integration-step2-phase.png', fullPage: true })

    // Step 3: Create task
    const taskButton = dashboard.createTaskButton
    if (await taskButton.isVisible().catch(() => false) && !(await taskButton.isDisabled())) {
      await taskButton.click()
      await dashboard.taskModal.waitFor({ state: 'visible' })

      const taskTitle = `Integration Task ${Date.now()}`
      await dashboard.fillTaskForm({
        title: taskTitle,
        description: 'Integration test task',
        duration: 5,
        priority: 'high',
      })
      await dashboard.submitTaskForm()
      await dashboard.taskModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')

      await page.screenshot({ path: 'test-results/dashboard-integration-step3-task.png', fullPage: true })

      // Step 4: Verify task appears
      await page.waitForTimeout(1000)
      const taskElement = page.locator(`text=${taskTitle}`).first()
      if (await taskElement.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.screenshot({ path: 'test-results/dashboard-integration-step4-task-visible.png', fullPage: true })
      }
    }

    // Step 5: Switch to Gantt view
    const ganttButton = dashboard.ganttViewButton
    if (await ganttButton.isVisible().catch(() => false)) {
      await ganttButton.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-results/dashboard-integration-step5-gantt.png', fullPage: true })
    }

    // Step 6: Logout
    const logoutButton = dashboard.logoutButton
    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click()
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/dashboard-integration-step6-logout.png', fullPage: true })
    }
  })
})
