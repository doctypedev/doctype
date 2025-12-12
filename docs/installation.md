# Installation Guide for sintesi-monorepo-root

This document provides step-by-step instructions on how to install and set up the `sintesi-monorepo-root` project. Follow the instructions carefully to ensure a successful installation.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: Version 20 or later. You can download it from [Node.js official website](https://nodejs.org/).
- **pnpm**: Ensure `pnpm` is installed globally. You can install it using npm:

  ```bash
  npm install -g pnpm
  ```

## Installation Steps

1. **Clone the Repository**

   Begin by cloning the repository from GitHub (or your source control):

   ```bash
   git clone https://github.com/your-username/sintesi-monorepo-root.git
   ```

   Navigate into the cloned directory:

   ```bash
   cd sintesi-monorepo-root
   ```

2. **Install Dependencies**

   Once you are in the project directory, install the necessary dependencies using pnpm:

   ```bash
   pnpm install
   ```

   This command will install all the required packages defined in the `package.json` file.

3. **Verify Installation**

   To ensure everything is set up correctly, you can run the following command to check the installed packages:

   ```bash
   pnpm list
   ```

   This will display a tree of installed packages.

## Running the Project

After the installation is complete, you can run various scripts defined in the `package.json`. Here are some common commands you might find useful:

- **Build the Project**

   To build the project, use the following command:

   ```bash
   pnpm run build
   ```

- **Clean the Project**

   To clean the build artifacts, run:

   ```bash
   pnpm run clean
   ```

- **Run Development Server for Documentation**

   To start a development server for the documentation, execute:

   ```bash
   pnpm run docs:dev
   ```

- **Run Tests**

   To execute the tests, use:

   ```bash
   pnpm run test
   ```

## Using Sintesi CLI

To automate the generation and maintenance of project documentation, you can use the Sintesi CLI tool. Here are some commands:

- **Check for Documentation Drift**

   To check if the documentation is in sync with the code, run:

   ```bash
   npx sintesi check
   ```

   You can also use the `--verbose` option for detailed output:

   ```bash
   npx sintesi check --verbose
   ```

   You can specify a custom map location with:

   ```bash
   npx sintesi check --map ./path/to/sintesi-map.json
   ```

- **Fix Outdated Documentation**

   To update documentation when drift is detected, use:

   ```bash
   npx sintesi fix
   ```

   You can preview changes without writing them using the `--dry-run` option:

   ```bash
   npx sintesi fix --dry-run
   ```

   To auto-commit changes to git, use:

   ```bash
   npx sintesi fix --auto-commit
   ```

   To use placeholder content instead of AI, run:

   ```bash
   npx sintesi fix --no-ai
   ```

- **Generate a README File**

   To create a README file based on your project structure, execute:

   ```bash
   npx sintesi readme
   ```

- **Generate Documentation**

   To automatically create documentation using AI, run:

   ```bash
   npx sintesi documentation
   ```

## Environment Configuration

Before using Sintesi, you need to configure your environment variables. Create a `.env` file by copying the example provided:

```bash
cp .env.example .env
```

Fill in your actual values, especially the `OPENAI_API_KEY`:

```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## Conclusion

You have successfully installed and set up the `sintesi-monorepo-root` project. You can now start contributing to the project or using it as intended. For further assistance, refer to the project's documentation or contact the project maintainers.

Happy coding!
