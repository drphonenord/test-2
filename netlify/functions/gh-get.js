import fetch from 'node-fetch';

export async function handler() {
  const { GH_TOKEN, GH_OWNER, GH_REPO, GH_BRANCH, GH_PATH_TICKETS } = process.env;
  
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH_TICKETS}?ref=${GH_BRANCH}`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GH_TOKEN}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (res.status === 404) {
    return { statusCode: 200, body: JSON.stringify([]) };
  }

  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString();
  
  return {
    statusCode: 200,
    body: content
  };
}
