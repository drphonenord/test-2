import fetch from 'node-fetch';

export async function handler(event) {
  const { GH_TOKEN, GH_OWNER, GH_REPO, GH_BRANCH, GH_PATH_TICKETS } = process.env;

  const ticketId = event.queryStringParameters.id;
  if (!ticketId) {
    return { statusCode: 400, body: 'ID requis' };
  }

  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH_TICKETS}?ref=${GH_BRANCH}`;

  const res = await fetch(url, {
    headers: { Authorization: `token ${GH_TOKEN}` }
  });

  if (res.status !== 200) {
    return { statusCode: res.status, body: 'Impossible de récupérer les données' };
  }

  const data = await res.json();
  const tickets = JSON.parse(Buffer.from(data.content, 'base64').toString());

  const ticket = tickets.find(t => t.id === ticketId);
  if (!ticket) {
    return { statusCode: 404, body: 'Ticket introuvable' };
  }

  return { statusCode: 200, body: JSON.stringify(ticket) };
}
