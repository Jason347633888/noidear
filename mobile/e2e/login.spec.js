describe('Login Flow', () => {
  let page

  beforeAll(async () => {
    page = await program.reLaunch('/pages/login/index')
    await page.waitFor(1000)
  })

  it('should display login form', async () => {
    const username = await page.$('.login-page__input')
    const password = await page.$('.login-page__input:nth-child(2)')
    const submitBtn = await page.$('.login-page__btn--primary')

    expect(username).toBeTruthy()
    expect(password).toBeTruthy()
    expect(submitBtn).toBeTruthy()
  })

  it('should show error for empty credentials', async () => {
    const submitBtn = await page.$('.login-page__btn--primary')
    await submitBtn.tap()
    await page.waitFor(500)

    // uni.showToast will be called with error message
    const toast = await page.data('$uniShowToastOptions')
    expect(toast).toBeTruthy()
  })

  it('should login successfully with valid credentials', async () => {
    const usernameInput = await page.$('.login-page__input')
    const passwordInput = await page.$('.login-page__input:nth-child(2)')
    const submitBtn = await page.$('.login-page__btn--primary')

    await usernameInput.input('admin')
    await passwordInput.input('12345678')
    await submitBtn.tap()
    await page.waitFor(2000)

    // Should navigate to home page
    const path = await page.path()
    expect(path).toBe('pages/home/index')
  })
})
