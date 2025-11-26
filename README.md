```markdown
# doctype

Doctype is the ultimate guardrail for conceptual documentation. By leveraging Abstract Syntax Tree (AST) analysis and Generative AI (GenAI), it guarantees the veracity of your Markdown guides in real-time. If the code changes, the documentation updates automatically.

## Features

- **Real-Time Documentation Updates**: Automatically updates documentation when code changes, ensuring that your guides are always up-to-date.
- **Generative AI Integration**: Utilizes AI models to provide insights and suggestions for documentation improvements.
- **GitHub Workflow Support**: Seamlessly integrates into your GitHub workflows to automate pull request reviews with AI-generated feedback.

## Usage

### Setting Up GitHub Workflow

Doctype now includes a GitHub workflow integration that allows for automated code reviews on pull requests using OpenAI's generative models. Follow these steps to set up:

1. **Add API Key**: Ensure your repository has the `OPENAI_API_KEY` set in your GitHub secrets to allow the AI review process to operate.
   
2. **Workflow Configuration**: Add the provided GitHub workflow files to your repository's `.github/workflows` directory. These scripts will automatically trigger on pull request events.

### Example Workflow Setup

To enable the automated AI code review, create a workflow file in your repository:

```yaml
name: Doctype AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  code_review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
      - name: Run Doctype AI Review
        uses: actions/github-script@v5
        with:
          script: |
            const evaluatePR = require('./.github/scripts/evaluate-pr.js');
            await evaluatePR({ github, context, core });
```

## Technical Implementation

The AI code review feature leverages a Node.js script to interact with the GitHub API and OpenAI's models:

- **Script Location**: `.github/scripts/evaluate-pr.js`
- **Functionality**: 
  - Fetches the pull request diff.
  - Trims the diff if it exceeds a specified length to optimize costs and efficiency.
  - Constructs a review prompt tailored for TypeScript projects and sends it to the OpenAI API.
  - Posts the generated review as a comment on the pull request.

- **AI Model**: Utilizes `gpt-4o` or `gpt-3.5-turbo` for generating concise and insightful code reviews.

- **Error Handling**: Includes comprehensive error checks to ensure API keys are present and handles API response errors gracefully.

## Contribution

Contributions are welcome! Please see the `CONTRIBUTING.md` for guidelines on how to contribute to the project.

For any issues or feature requests, please use the [GitHub Issues](https://github.com/your-repo/doctype/issues) page.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more information.
```
