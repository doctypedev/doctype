---
title: Installation Guide
description: Step-by-step instructions for installing the sintesi-monorepo-root CLI tool, including pre-requisites and environment setup.
icon: ⚙️
order: 10
---

# Installation Guide

This document provides a comprehensive guide to installing the `sintesi-monorepo-root` CLI tool. Follow the steps below to ensure a smooth installation process.

## Prerequisites

Before installing the CLI tool, ensure that you have the following prerequisites:

1. **Node.js**: Ensure you have Node.js installed on your machine. You can download it from [nodejs.org](https://nodejs.org/).
2. **Package Manager**: You should have a package manager like `npm` or `yarn` installed. If you have Node.js installed, `npm` will be available by default.

## Environment Setup

1. **Clone the Repository**:
   First, clone the `sintesi-monorepo-root` repository to your local machine. Open your terminal and run:
   ```bash
   git clone https://github.com/doctypedev/sintesi.git
   cd sintesi
   ```

2. **Install Dependencies**:
   Navigate to the root of the cloned repository and install the necessary dependencies using your preferred package manager:
   ```bash
   npm install
   ```
   or
   ```bash
   yarn install
   ```

3. **Build the Project**:
   After installing the dependencies, build the project to ensure everything is set up correctly:
   ```bash
   npm run build
   ```
   or
   ```bash
   yarn build
   ```

## Installing the CLI Tool Globally

To use the `sintesi` CLI tool from anywhere in your terminal, you can install it globally:

```bash
npm install -g @sintesi/sintesi
```
or
```bash
yarn global add @sintesi/sintesi
```

## Usage Examples

Once installed, you can use the CLI tool with various commands. Here are some examples:

1. **Check for Documentation Drift**:
   To check for any drift in your documentation, run:
   ```bash
   sintesi check --smart --base main
   ```

2. **Generate a README**:
   To generate a README file based on your project context, use:
   ```bash
   sintesi readme
   ```

3. **Generate Documentation**:
   To generate project documentation, execute:
   ```bash
   sintesi documentation
   ```

4. **Create a Changeset**:
   To create a changeset based on your code changes, run:
   ```bash
   sintesi changeset --base main --forceFetch
   ```

## Conclusion

You have successfully installed the `sintesi-monorepo-root` CLI tool. For further information on commands and usage, refer to the [documentation](https://github.com/your-username/sintesi-monorepo-root/docs).

If you encounter any issues during installation, please check the repository's issues section or reach out for support.
