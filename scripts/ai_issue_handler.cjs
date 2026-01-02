const { GoogleGenerativeAI } = require("@google/generative-ai");

async function analyzeIssue() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
    process.exit(1);
  }

  const issueTitle = process.env.ISSUE_TITLE;
  const issueBody = process.env.ISSUE_BODY;
  const issueNumber = process.env.ISSUE_NUMBER;
  const repoName = process.env.GITHUB_REPOSITORY;

  if (!issueTitle || !issueBody) {
    console.error("Issue title or body is missing.");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  const prompt = `
    You are an expert software engineer assistant.
    I have a GitHub issue in the repository ${repoName}.
    
    Issue #${issueNumber}: ${issueTitle}
    
    Description:
    ${issueBody}
    
    Please analyze this issue and provide:
    1. A summary of the problem.
    2. Potential root causes (if technical details are provided).
    3. Suggested steps to resolve it.
    4. If it looks like a security vulnerability (e.g. from Dependabot) that wasn't auto-fixed, suggest a manual fix or mitigation.
    
    Keep your response concise and helpful. Format it in Markdown.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(text); // Output the suggestion to stdout so the workflow can capture it
  } catch (error) {
    console.error("Error generating content:", error);
    process.exit(1);
  }
}

analyzeIssue();
