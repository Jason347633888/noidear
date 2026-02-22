describe('Calendar View Flow', () => {
  let page

  beforeAll(async () => {
    // Login first
    page = await program.reLaunch('/pages/login/index')
    await page.waitFor(1000)

    const usernameInput = await page.$('.login-page__input')
    const passwordInput = await page.$('.login-page__input:nth-child(2)')
    const submitBtn = await page.$('.login-page__btn--primary')

    await usernameInput.input('admin')
    await passwordInput.input('12345678')
    await submitBtn.tap()
    await page.waitFor(2000)

    // Navigate to calendar page
    page = await program.switchTab('/pages/calendar/index')
    await page.waitFor(1000)
  })

  it('should display calendar grid with 42 days', async () => {
    const calendarDays = await page.$$('.calendar-view__day')
    expect(calendarDays.length).toBe(42)
  })

  it('should navigate to previous month', async () => {
    const prevBtn = await page.$('.calendar-page__nav-btn:first-child')
    const monthText = await page.$('.calendar-page__month')
    const currentMonth = await monthText.text()

    await prevBtn.tap()
    await page.waitFor(500)

    const newMonthText = await monthText.text()
    expect(newMonthText).not.toBe(currentMonth)
  })

  it('should navigate to next month', async () => {
    const nextBtn = await page.$('.calendar-page__nav-btn:last-child')
    const monthText = await page.$('.calendar-page__month')
    const currentMonth = await monthText.text()

    await nextBtn.tap()
    await page.waitFor(500)

    const newMonthText = await monthText.text()
    expect(newMonthText).not.toBe(currentMonth)
  })

  it('should select date and display plans', async () => {
    const dayWithPlan = await page.$('.calendar-view__day:has(.calendar-view__dot)')
    if (dayWithPlan) {
      await dayWithPlan.tap()
      await page.waitFor(500)

      // Should display plans for selected date
      const planCards = await page.$$('.plan-card')
      expect(planCards.length).toBeGreaterThan(0)
    }
  })

  it('should navigate to plan detail', async () => {
    const planCard = await page.$('.plan-card')
    if (planCard) {
      await planCard.tap()
      await page.waitFor(1000)

      // Should navigate to detail page
      const path = await page.path()
      expect(path).toContain('pages/records/detail')
    }
  })
})
