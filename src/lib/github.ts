const GITHUB_API = "https://api.github.com";

type FetchOptions = {
  token?: string;
};

export type GitHubErrorCode =
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "PRIVATE_REPO"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export class GitHubError extends Error {
  code: GitHubErrorCode;
  status?: number;
  resetAt?: Date;

  constructor(code: GitHubErrorCode, message: string, status?: number, resetAt?: Date) {
    super(message);
    this.name = "GitHubError";
    this.code = code;
    this.status = status;
    this.resetAt = resetAt;
  }
}

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };
  const authToken = token || process.env.GITHUB_TOKEN;
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return headers;
}

async function githubFetch<T>(path: string, opts?: FetchOptions): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${GITHUB_API}${path}`, {
      headers: getHeaders(opts?.token),
    });
  } catch (err) {
    throw new GitHubError(
      "NETWORK_ERROR",
      "Failed to connect to GitHub API",
      undefined
    );
  }

  if (res.ok) {
    return res.json();
  }

  // Rate limit
  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const resetHeader = res.headers.get("x-ratelimit-reset");
    if (remaining === "0" && resetHeader) {
      const resetAt = new Date(parseInt(resetHeader, 10) * 1000);
      throw new GitHubError(
        "RATE_LIMITED",
        `GitHub API rate limit exceeded. Resets at ${resetAt.toLocaleTimeString()}`,
        403,
        resetAt
      );
    }
    // 403 without rate limit = likely private repo
    throw new GitHubError(
      "PRIVATE_REPO",
      "Repository is private or access denied. Provide a GitHub token.",
      403
    );
  }

  // Not found
  if (res.status === 404) {
    throw new GitHubError(
      "NOT_FOUND",
      "Repository not found. Check the URL and ensure the repo exists.",
      404
    );
  }

  throw new GitHubError("UNKNOWN", `GitHub API error: ${res.status}`, res.status);
}

export type TreeItem = {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
};

export type GitTree = {
  sha: string;
  url: string;
  tree: TreeItem[];
  truncated: boolean;
};

export type RepoMetadata = {
  truncated: boolean;
  fileCount: number;
  warning?: string;
};

export async function getFileTree(
  owner: string,
  repo: string,
  branch = "main",
  opts?: FetchOptions
): Promise<GitTree> {
  return githubFetch<GitTree>(
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    opts
  );
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref = "main",
  opts?: FetchOptions
): Promise<string> {
  const data = await githubFetch<{ content: string; encoding: string }>(
    `/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
    opts
  );
  if (data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return data.content;
}

export async function getPackageJson(
  owner: string,
  repo: string,
  ref = "main",
  opts?: FetchOptions
): Promise<Record<string, unknown> | null> {
  try {
    const content = await getFileContent(owner, repo, "package.json", ref, opts);
    return JSON.parse(content);
  } catch {
    return null;
  }
}

type ConfigFile = {
  name: string;
  content: string;
};

const CONFIG_PATTERNS = [
  "tsconfig.json",
  "jsconfig.json",
  ".eslintrc",
  ".eslintrc.json",
  ".eslintrc.js",
  ".prettierrc",
  ".prettierrc.json",
  "prettier.config.js",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.mjs",
  "tailwind.config.js",
  "tailwind.config.ts",
  "drizzle.config.ts",
  ".env.example",
];

export async function getConfigFiles(
  owner: string,
  repo: string,
  ref = "main",
  opts?: FetchOptions
): Promise<ConfigFile[]> {
  const tree = await getFileTree(owner, repo, ref, opts);
  const rootFiles = tree.tree.filter(
    (item) => item.type === "blob" && !item.path.includes("/")
  );

  const configFiles: ConfigFile[] = [];
  for (const file of rootFiles) {
    if (CONFIG_PATTERNS.includes(file.path)) {
      try {
        const content = await getFileContent(owner, repo, file.path, ref, opts);
        configFiles.push({ name: file.path, content });
      } catch {
        // skip if can't read
      }
    }
  }
  return configFiles;
}
