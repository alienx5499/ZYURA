import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const { filePath, message } = await request.json();

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
    const GITHUB_PATH = process.env.GITHUB_PATH || "metadata";

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return NextResponse.json(
        { error: "GitHub configuration not set" },
        { status: 500 }
      );
    }

    const fullPath = `${GITHUB_PATH}/${filePath}`;

    // First, get the file to obtain its SHA (required for deletion)
    const checkUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullPath}?ref=${GITHUB_BRANCH}`;
    
    const checkResponse = await fetch(checkUrl, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!checkResponse.ok) {
      if (checkResponse.status === 404) {
        // File doesn't exist, consider it already deleted
        return NextResponse.json({ success: true, message: "File not found (already deleted)" });
      }
      const error = await checkResponse.text();
      return NextResponse.json(
        { error: `Failed to check file: ${error}` },
        { status: checkResponse.status }
      );
    }

    const fileData = await checkResponse.json();
    const fileSha = fileData.sha;

    // Delete the file using the GitHub API
    const deleteUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullPath}`;
    const deleteBody = {
      message: message || `Delete ${filePath}`,
      sha: fileSha,
      branch: GITHUB_BRANCH,
    };

    const deleteResponse = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify(deleteBody),
    });

    if (!deleteResponse.ok) {
      const error = await deleteResponse.text();
      return NextResponse.json(
        { error: `Failed to delete file: ${error}` },
        { status: deleteResponse.status }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${filePath}` 
    });

  } catch (error: any) {
    console.error("GitHub delete error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
