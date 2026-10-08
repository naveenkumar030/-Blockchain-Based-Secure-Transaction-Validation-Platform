# GSTAPP Automated Testing

This repository uses **Playwright** for End-to-End (E2E) testing, configured to run locally or across a cloud grid using **LambdaTest (TestMu AI)**.

The E2E tests are located in `tests/e2e/` and cover the following critical flows:
1. **Registration & OTP Mocking** (`register.spec.js`)
2. **Login valid/invalid credentials** (`login.spec.js`)
3. **GSTR-2B File Upload** (`upload.spec.js`)
4. **Smoke testing for Graph Pages** (`graphs.spec.js`)

**Note:** All tests utilize Playwright's network interception (`page.route`) to mock backend API responses. This guarantees that the UI tests are fast, reliable, and do not pollute the database with dummy test records or trigger real emails during CI/CD.

## Pre-requisites

Ensure you have your environment variables set up in the `.env` file at the root of the project:

```env
LT_USERNAME=your_lambdatest_username
LT_ACCESS_KEY=your_lambdatest_access_key
```

Also, install dependencies:
```bash
npm install
```

## Running Tests Locally

To run the tests locally using the standard Playwright Chromium/Firefox/WebKit browsers (without connecting to LambdaTest):

```bash
npm run test:e2e
```
*Note: Make sure your local frontend (http://localhost:5173) is running.*

## Running Cross-Browser Tests on LambdaTest

### 1. Local Application (with LambdaTest Tunnel)
To execute tests on LambdaTest's cloud grid against your local development server (`http://127.0.0.1:8000`):

```bash
npm run test:lambdatest
```
*The `run-lambdatest.js` runner automatically starts a secure **LambdaTest Tunnel** (`@lambdatest/node-tunnel`) so cloud browsers can reach your local machine.*

### 2. Live EC2 Server Deployment
To execute Playwright cross-browser tests directly against your live EC2 deployment (`http://100.55.59.23`):

```bash
npm run test:lambdatest:ec2
```
*Or set a custom EC2 URL:*
```bash
cross-env BASE_URL=http://100.55.59.23 npm run test:lambdatest
```
*When targeting a public EC2 instance, the tunnel is automatically bypassed and tests execute directly over the internet for faster execution.*

## Viewing Results

After running `npm run test:lambdatest`, log in to your LambdaTest (TestMu) account and navigate to the **Automation > Web Automation** or **Builds** dashboard. Look for the build named `GSTAPP Regression` to see detailed execution videos, logs, and tracebacks for each browser.
