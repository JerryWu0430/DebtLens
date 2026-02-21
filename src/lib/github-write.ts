import { GitHubError } from "./github";

const GITHUB_API = "https://api.github.com";

function getHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github.v3+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function githubWriteFetch<T>(
  path: string,
  token: string,
  options: { method: string; body?: unknown }
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${GITHUB_API}${path}`, {
      method: options.method,
      headers: getHeaders(token),
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new GitHubError("NETWORK_ERROR", "Failed to connect to GitHub API");
  }

  if (res.ok) {
    return res.json();
  }

  if (res.status === 401) {
    throw new GitHubError("PRIVATE_REPO", "Invalid or expired GitHub token", 401);
  }

  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      throw new GitHubError("RATE_LIMITED", "GitHub API rate limit exceeded", 403);
    }
    throw new GitHubError("PRIVATE_REPO", "Token lacks required permissions (needs 'repo' scope)", 403);
  }

  if (res.status === 404) {
    throw new GitHubError("NOT_FOUND", "Resource not found", 404);
  }

  if (res.status === 422) {
    const data = await res.json().catch(() => ({}));
    throw new GitHubError("UNKNOWN", data.message || "Validation failed", 422);
  }

  throw new GitHubError("UNKNOWN", `GitHub API error: ${res.status}`, res.status);
}

// Validate token by checking user
export async function validateToken(token: string): Promise<{ login: string }> {
  return githubWriteFetch("/user", token, { method: "GET" });
}

// Get ref SHA for a branch
export async function getBranchRef(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<{ sha: string }> {
  const data = await githubWriteFetch<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    token,
    { method: "GET" }
  );
  return { sha: data.object.sha };
}

// Create a new branch
export async function createBranch(
  owner: string,
  repo: string,
  branchName: string,
  baseSha: string,
  token: string
): Promise<void> {
  await githubWriteFetch(
    `/repos/${owner}/${repo}/git/refs`,
    token,
    {
      method: "POST",
      body: { ref: `refs/heads/${branchName}`, sha: baseSha },
    }
  );
}

// Get file content with SHA
export async function getFileWithSha(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token: string
): Promise<{ content: string; sha: string }> {
  const data = await githubWriteFetch<{ content: string; sha: string; encoding: string }>(
    `/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
    token,
    { method: "GET" }
  );
  const content = data.encoding === "base64"
    ? Buffer.from(data.content, "base64").toString("utf-8")
    : data.content;
  return { content, sha: data.sha };
}

// Update file content
export async function updateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  fileSha: string,
  token: string
): Promise<void> {
  const base64Content = Buffer.from(content).toString("base64");
  await githubWriteFetch(
    `/repos/${owner}/${repo}/contents/${path}`,
    token,
    {
      method: "PUT",
      body: {
        message,
        content: base64Content,
        branch,
        sha: fileSha,
      },
    }
  );
}

// Create pull request
export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string,
  token: string
): Promise<{ url: string; number: number }> {
  const data = await githubWriteFetch<{ html_url: string; number: number }>(
    `/repos/${owner}/${repo}/pulls`,
    token,
    {
      method: "POST",
      body: { title, body, head, base },
    }
  );
  return { url: data.html_url, number: data.number };
}

// Get default branch name
export async function getDefaultBranch(
  owner: string,
  repo: string,
  token: string
): Promise<string> {
  const data = await githubWriteFetch<{ default_branch: string }>(
    `/repos/${owner}/${repo}`,
    token,
    { method: "GET" }
  );
  return data.default_branch;
}
