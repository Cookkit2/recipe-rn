from playwright.sync_api import sync_playwright

def test_a11y(page):
    page.goto('http://localhost:8081/preferences', wait_until='networkidle', timeout=120000)

    # Dump the page source
    html = page.content()
    print("Page HTML:", html)

    page.screenshot(path='/home/jules/verification/screenshot.png')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        test_a11y(page)
    except Exception as e:
        print(e)
    finally:
        browser.close()
