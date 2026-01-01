const { GoogleGenerativeAI } = require("@google/generative-ai");

async function reviewPR() {
  const apiKey = process.env.gemini_api_key;
  const prDiff = process.env.PR_DIFF;
  const repoName = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER;

  if (!apiKey || !prDiff) {
    console.error("Missing required environment variables.");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    You are an expert Senior Full-Stack Engineer and Security Researcher.
    Review the following Pull Request diff for the repository ${repoName} (PR #${prNumber}).
    
    Instructions:
    1. Summarize the changes briefly.
    2. Identify potential bugs, logic errors, or edge cases.
    3. Check for security vulnerabilities (hardcoded keys, injection risks, etc.).
    4. Suggest performance or readability improvements.
    5. Be professional and constructive.
    
    If the code looks excellent, state that clearly.
    
    PR DIFF:
    ${prDiff.substring(0, 20000)} // Truncate if extremely large
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log(response.text());
  } catch (error) {
    console.error("Error during AI review:", error);
    process.exit(1);
  }
}

reviewPR();
