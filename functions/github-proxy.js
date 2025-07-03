// functions/github-proxy.js

// Acessa o token que salvaremos na interface da Netlify
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_PATH = process.env.GITHUB_PATH;

exports.handler = async function(event, context) {
    // A API do GitHub que queremos chamar
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
    
    // Configurações da requisição que faremos para o GitHub
    const fetchOptions = {
        method: event.httpMethod, // Usa o mesmo método (GET, PUT) que o frontend enviou
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        }
    };

    // Se a requisição for PUT (salvar), adicione o corpo
    if (event.httpMethod === 'PUT') {
        fetchOptions.body = event.body;
    }

    try {
        const response = await fetch(url, fetchOptions);
        const data = await response.json();

        // Se o status da resposta for 404 (Not Found), o arquivo ainda não existe.
        // Retornamos um status especial para o frontend lidar com isso.
        if (response.status === 404) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "File not found" })
            };
        }

        if (!response.ok) {
            // Se a API do GitHub retornou um erro, repasse-o para o frontend
            throw new Error(`GitHub API Error: ${response.status} ${data.message || ''}`);
        }

        // Retorna a resposta do GitHub para o nosso frontend
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};