# Windows Stability & Safe Validation Rules for Antigravity

## Critical Environment Constraints

1. **Do NOT Launch Browser Subagents or Browser Scratchpads Automatically**
   - On Windows, spawning interactive browser subagents or browser scratchpads inside the Antigravity IDE environment has been reported by the user to trigger IDE reloads/instability.
   - All interactive UI testing must be verified manually by the developer in their regular browser at `http://localhost:3000`.

2. **Zero-Browser Automated Validation Pipeline**
   - In `Property_Ledge`, validate changes safely without launching any browser processes by executing:
     ```bash
     npm run test:safe
     ```
   - This executes:
     1. TypeScript static verification: `npm run typecheck` (`tsc --noEmit`)
     2. Node-only unit test suite: `npm run test:unit` (`playwright test --project=unit`)
   - Both commands run purely inside Node.js and do NOT spawn Chromium or Edge.

3. **E2E Browser Testing Protocol**
   - E2E tests in `tests/e2e` must only be run when explicitly authorized by the user.
   - When running E2E tests, execute:
     ```bash
     npm run test:e2e
     ```
   - The configuration in `playwright.config.ts` enforces `workers: 1` to run sequentially, ensuring database stability and preventing port collisions.
