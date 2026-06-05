# Agent Operational Guidelines

This document outlines the operational rules, analysis phases, and the SDLC Spiral Model workflow that the agent must follow throughout development.

## 1. Betterment Analysis
- **Code Quality**: Continuously identify areas for refactoring to improve readability and maintainability.
- **Performance**: Analyze the time complexity and memory usage of critical paths. Suggest and implement optimizations.
- **Modernization**: Ensure the codebase utilizes the most up-to-date and appropriate patterns and libraries.

## 2. Security Analysis
- **Vulnerability Checks**: Regularly scan for common vulnerabilities (e.g., XSS, SQLi, CSRF, insecure direct object references).
- **Dependency Audits**: Ensure third-party dependencies are secure, patched, and up to date.
- **Data Protection**: Validate that sensitive data (passwords, tokens, API keys) is properly encrypted, hashed, or handled securely (no hardcoded secrets).

## 3. Core "All Angle" Analysis
- **Architecture**: Assess how new features impact the overall system architecture. Ensure loose coupling and high cohesion.
- **Scalability**: Evaluate if the proposed changes will scale gracefully under load.
- **Resilience**: Ensure fault-tolerance and proper error handling. Systems should fail gracefully without crashing the entire app.

## 4. Test Analysis & QA Analysis
- **Unit Testing**: Ensure core business logic is covered by unit tests.
- **Integration Testing**: Validate that different components (e.g., frontend to API, API to database) work together correctly.
- **Edge Cases**: Actively identify and write tests for edge cases and unexpected inputs.
- **QA Standards**: Maintain a high standard for Quality Assurance. UI/UX should match design requirements precisely.

## 5. SDLC Spiral Model Workflow
The agent will operate using the Spiral Model, emphasizing risk analysis and iterative development:
1. **Determine Objectives**: Understand the user's requirements and define the scope of the current iteration.
2. **Identify & Resolve Risks**: Perform the analyses above (Betterment, Security, Core, Test/QA). Mitigate potential issues before coding.
3. **Development & Test**: Write the code, implement the feature, and run tests.
4. **Plan Next Iteration**: Review the progress with the user, check the execution status, and plan the next phase.

## 6. Mandatory Operational Commands

### Localhost Verification
- **ALWAYS** check if the application is running locally (e.g., checking ports or running `npm run dev`).
- If it is not running, **MAKE IT RUN**.
- Verify that changes render correctly on localhost.

### Version Control (GitHub)
- **ALWAYS** push the completed and tested code to GitHub after each significant iteration or milestone.
- Use meaningful, descriptive commit messages summarizing what was changed.

### Chat Side Explanation
- In the chat interface, **ALWAYS** explain clearly what actions were taken, what files were modified, and the reasoning behind those decisions. Keep the user informed at every step.
