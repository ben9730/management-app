import { test, expect, Page } from '@playwright/test'

/**
 * FlowPlan Demo Recording Script
 *
 * Records a video walkthrough of the entire FlowPlan application
 * showing all major features as if presenting to an audience.
 *
 * Run with: npx playwright test tests/demo-recording.spec.ts --project=chromium
 * Video will be saved in: test-results/
 */

// Helper: slow down interactions for demo visibility
async function slowAction(page: Page, ms = 800) {
  await page.waitForTimeout(ms)
}

// Helper: scroll smoothly to element
async function scrollToElement(page: Page, selector: string) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, selector)
  await slowAction(page, 600)
}

test.use({
  viewport: { width: 1920, height: 1080 },
  video: { mode: 'on', size: { width: 1920, height: 1080 } },
  launchOptions: { slowMo: 300 },
})

test.describe('FlowPlan Demo Recording', () => {
  test('Full Application Walkthrough', async ({ page }) => {
    // ========================================
    // SCENE 1: Login Page (RTL Hebrew UI)
    // ========================================
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('networkidle')
    await slowAction(page, 2000)

    // Show the Hebrew RTL login form
    await page.locator('input[placeholder="your@email.com"]').click()
    await slowAction(page, 500)
    await page.locator('input[placeholder="your@email.com"]').fill('zeass973@gmail.com')
    await slowAction(page, 500)
    await page.locator('input[placeholder="••••••••"]').click()
    await slowAction(page, 300)
    await page.locator('input[placeholder="••••••••"]').fill('demo1234')
    await slowAction(page, 1000)

    // Pause to show the login form filled
    await slowAction(page, 1500)

    // ========================================
    // SCENE 2: Navigate to Dashboard directly
    // ========================================
    await page.goto('http://localhost:3000/')
    await page.waitForLoadState('networkidle')
    await slowAction(page, 2000)

    // Wait for data to load
    await page.waitForSelector('h1', { timeout: 15000 })
    await slowAction(page, 2000)

    // ========================================
    // SCENE 3: Dashboard Overview
    // ========================================
    // Show the project hero area with stats
    await slowAction(page, 2000)

    // Hover over the stats cards
    const criticalPathCard = page.locator('text=נתיב קריטי').first()
    if (await criticalPathCard.isVisible()) {
      await criticalPathCard.hover()
      await slowAction(page, 1500)
    }

    const daysRemainingCard = page.locator('text=ימים נותרים').first()
    if (await daysRemainingCard.isVisible()) {
      await daysRemainingCard.hover()
      await slowAction(page, 1000)
    }

    const progressCard = page.locator('text=התקדמות משימות').first()
    if (await progressCard.isVisible()) {
      await progressCard.hover()
      await slowAction(page, 1000)
    }

    const percentCard = page.locator('text=אחוז ביצוע').first()
    if (await percentCard.isVisible()) {
      await percentCard.hover()
      await slowAction(page, 1000)
    }

    // ========================================
    // SCENE 4: Phase View - Tasks List
    // ========================================
    // Scroll down to see the phases and tasks
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }))
    await slowAction(page, 1500)

    // Click on first task to show sidebar detail
    const firstTask = page.locator('h4:text("תלות ראשונה")').first()
    if (await firstTask.isVisible()) {
      await firstTask.click()
      await slowAction(page, 2500)

      // Show the task detail sidebar
      await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }))
      await slowAction(page, 2000)

      // Close sidebar
      const closeButton = page.locator('button svg.rotate-45').first()
      if (await closeButton.isVisible()) {
        await closeButton.click()
        await slowAction(page, 1000)
      }
    }

    // Click on a different task to show different details
    const criticalTask = page.locator('h4:text("תלות שישית")').first()
    if (await criticalTask.isVisible()) {
      await criticalTask.click()
      await slowAction(page, 2500)
    }

    // Close sidebar again
    const closeBtn2 = page.locator('button svg.rotate-45').first()
    if (await closeBtn2.isVisible()) {
      await closeBtn2.click()
      await slowAction(page, 800)
    }

    // ========================================
    // SCENE 5: Gantt Chart + CPM
    // ========================================
    // Switch to Gantt view
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    await slowAction(page, 800)

    const ganttButton = page.locator('button:text("תרשים גאנט")')
    if (await ganttButton.isVisible()) {
      await ganttButton.click()
      await slowAction(page, 2000)
    }

    // Scroll to see the full Gantt chart
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }))
    await slowAction(page, 2000)

    // Click on critical path task in Gantt
    const ganttCriticalTask = page.locator('[data-testid*="task-bar"]').last()
    if (await ganttCriticalTask.isVisible()) {
      await ganttCriticalTask.click()
      await slowAction(page, 2500)
    }

    // Click "Today" button to center the view
    const todayButton = page.locator('button:text("Today")')
    if (await todayButton.isVisible()) {
      await todayButton.click()
      await slowAction(page, 1500)
    }

    // Hover over different task bars to show tooltips
    const taskBars = page.locator('[data-testid*="task-bar"]')
    const count = await taskBars.count()
    for (let i = 0; i < Math.min(count, 4); i++) {
      await taskBars.nth(i).hover()
      await slowAction(page, 1200)
    }

    // ========================================
    // SCENE 6: Switch back to list & show phases
    // ========================================
    const listButton = page.locator('button:text("תצוגת רשימה")')
    if (await listButton.isVisible()) {
      await listButton.click()
      await slowAction(page, 1500)
    }

    // Show the locked phase
    await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }))
    await slowAction(page, 2000)

    // Scroll back up
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    await slowAction(page, 1000)

    // ========================================
    // SCENE 7: Open Calendar/Holidays modal
    // ========================================
    const calendarButton = page.locator('button:text("חגים")')
    if (await calendarButton.isVisible()) {
      await calendarButton.click()
      await slowAction(page, 2500)

      // Close the modal
      await page.keyboard.press('Escape')
      await slowAction(page, 1000)
    }

    // ========================================
    // SCENE 8: Projects Page
    // ========================================
    await page.goto('http://localhost:3000/projects')
    await page.waitForLoadState('networkidle')
    await slowAction(page, 1000)

    // Wait for projects to load
    await page.waitForSelector('article', { timeout: 10000 }).catch(() => {})
    await slowAction(page, 2500)

    // Hover over project cards
    const projectCards = page.locator('article')
    const projectCount = await projectCards.count()
    for (let i = 0; i < Math.min(projectCount, 3); i++) {
      await projectCards.nth(i).hover()
      await slowAction(page, 1000)
    }

    // ========================================
    // SCENE 9: Team Page
    // ========================================
    await page.goto('http://localhost:3000/team')
    await page.waitForLoadState('networkidle')
    await slowAction(page, 1000)

    // Wait for team to load
    await page.waitForSelector('article', { timeout: 10000 }).catch(() => {})
    await slowAction(page, 2500)

    // Scroll to see all team members
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }))
    await slowAction(page, 2000)

    // Show Time Off Calendar section
    const timeOffSection = page.locator('text=Time Off Calendar').first()
    if (await timeOffSection.isVisible()) {
      await timeOffSection.scrollIntoViewIfNeeded()
      await slowAction(page, 2000)
    }

    // Scroll back up
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    await slowAction(page, 1500)

    // ========================================
    // SCENE 10: Back to Dashboard - Final view
    // ========================================
    await page.goto('http://localhost:3000/')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('h1', { timeout: 15000 })
    await slowAction(page, 2000)

    // Switch to Gantt for final shot
    const finalGanttBtn = page.locator('button:text("תרשים גאנט")')
    if (await finalGanttBtn.isVisible()) {
      await finalGanttBtn.click()
      await slowAction(page, 3000)
    }

    // Final pause
    await slowAction(page, 2000)
  })
})
