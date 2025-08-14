import fetch from 'node-fetch';

export async function handler(event) {
  const { GH_TOKEN, GH_OWNER, GH_REPO, GH_BRANCH, GH_PATH_TICKETS } = process.env;
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Méthode non autorisée' };
  }

  const newTicket = JSON.parse(event.body);

  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH_TICKETS}?ref=${GH_BRANCH}`;
  
  let sha = null;
  let tickets = [];

  const res = await fetch(url, {
    headers: { Authorization: `token ${GH_TOKEN}` }
  });

  if (res.status === 200) {
    const data = await res.json();
    sha = data.sha;
    tickets = JSON.parse(Buffer.from(data.content, 'base64').toString());
  }

  // Ajout ou mise à jour
  const index = tickets.findIndex(t => t.id === newTicket.id);
  if (index >= 0) {
    tickets[index] = newTicket;
  } else {
    tickets.push(newTicket);
  }

  const updatedContent = Buffer.from(JSON.stringify(tickets, null, 2)).toString('base64');

  const updateRes = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GH_TOKEN}`,
      Accept: 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      message: 'Mise à jour tickets',
      content: updatedContent,
      sha,
      branch: GH_BRANCH
    })
  });

  return { statusCode: updateRes.status, body: await updateRes.text() };
}
