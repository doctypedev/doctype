# Contributing to sintesi-monorepo-root

Thank you for your interest in contributing to the **sintesi-monorepo-root** project! We welcome contributions from the community and appreciate your efforts in helping us improve the project. This document outlines the guidelines for contributing, including code standards and the pull request process.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Code Standards](#code-standards)
3. [Pull Request Process](#pull-request-process)
4. [Reporting Issues](#reporting-issues)
5. [Additional Resources](#additional-resources)

## Getting Started

To get started with contributing, please follow these steps:

1. **Fork the repository**: Create a personal copy of the repository by forking it on GitHub.
2. **Clone your fork**: Clone your forked repository to your local machine.
   ```bash
   git clone https://github.com/your-username/sintesi-monorepo-root.git
   ```
3. **Install dependencies**: Navigate to the project directory and install the necessary dependencies using `pnpm`.
   ```bash
   cd sintesi-monorepo-root
   pnpm install
   ```

## Code Standards

To maintain a high quality of code, please adhere to the following standards:

- **JavaScript/TypeScript**: Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) for JavaScript and TypeScript code.
- **Linting**: Use the provided linting tools to ensure code quality. Run the following command to lint your code:
  ```bash
  pnpm run lint
  ```
- **Testing**: Ensure that your changes are covered by tests. Run the test suite with:
  ```bash
  pnpm run test
  ```
- **Documentation**: Update relevant documentation when making changes to the codebase. Use the existing documentation structure as a reference.

## Pull Request Process

When you're ready to submit your changes, please follow these steps:

1. **Create a new branch**: Create a new branch for your changes. Use a descriptive name that reflects the nature of your changes.
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Commit your changes**: Make your changes and commit them with a clear and concise commit message.
   ```bash
   git commit -m "Add a brief description of your changes"
   ```
3. **Push to your fork**: Push your changes to your forked repository.
   ```bash
   git push origin feature/your-feature-name
   ```
4. **Open a pull request**: Navigate to the original repository on GitHub and open a pull request. Provide a detailed description of your changes and reference any related issues.

### Pull Request Guidelines

- Ensure that your pull request is targeting the `main` branch.
- Clearly describe the purpose of your changes and any relevant context.
- Link to any related issues or discussions.
- Be open to feedback and willing to make changes as requested by reviewers.

## Reporting Issues

If you encounter any issues or bugs, please report them by following these steps:

1. **Check existing issues**: Before creating a new issue, check the existing issues to see if it has already been reported.
2. **Create a new issue**: If the issue is not reported, create a new issue in the repository. Provide a clear and descriptive title and include the following information:
   - Steps to reproduce the issue
   - Expected behavior
   - Actual behavior
   - Any relevant logs or screenshots

## Additional Resources

- [Project Documentation](./docs)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contribution Guidelines](CONTRIBUTING.md)

Thank you for your contributions to **sintesi-monorepo-root**! Together, we can make this project better.
