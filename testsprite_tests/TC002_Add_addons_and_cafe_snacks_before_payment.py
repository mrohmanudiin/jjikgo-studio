import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3000
        await page.goto("http://localhost:3000")
        
        # -> Navigate to the Cashier App at http://localhost:5173 (the correct dev server) to load the Cashier POS entry screen, then click 'Start new transaction'.
        await page.goto("http://localhost:5173")
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        current_url = await frame.evaluate("() => window.location.href")
        assert 'localhost:5173' in current_url
        assert await frame.locator("xpath=//*[contains(., 'Start new transaction')]").nth(0).is_visible(), "Expected 'Start new transaction' to be visible"
        assert await frame.locator("xpath=//*[contains(., 'Addons Snacks Customer')]").nth(0).is_visible(), "Expected 'Addons Snacks Customer' to be visible"
        assert await frame.locator("xpath=//*[contains(., 'Theme')]").nth(0).is_visible(), "Expected 'Theme' to be visible"
        assert await frame.locator("xpath=//*[contains(., 'Package')]").nth(0).is_visible(), "Expected 'Package' to be visible"
        assert await frame.locator("xpath=//*[contains(., 'Addons')]").nth(0).is_visible(), "Expected 'Addons' to be visible"
        assert await frame.locator("xpath=//*[contains(., 'Snacks')]").nth(0).is_visible(), "Expected 'Snacks' to be visible"
        assert await frame.locator("xpath=//*[contains(., 'Pay')]").nth(0).is_visible(), "Expected 'Pay' to be visible"
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    