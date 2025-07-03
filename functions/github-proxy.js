// functions/github-proxy.js

// Importa o fetch se não estiver disponível globalmente (boa prática em Node.js)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Acessa as variáveis de ambiente
const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_PATH } = process.env;

exports.handler = async function(event, context) {
    // Validação inicial para garantir que as variáveis de ambiente estão definidas
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !GITHUB_PATH) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Variáveis de ambiente do GitHub não estão configuradas corretamente na Netlify.' })
        };
    }

    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
    
    const fetchOptions = {
        method: event.httpMethod,
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    };

    if (event.httpMethod === 'PUT') {
        // Para PUT, o corpo é esperado e o Content-Type é crucial
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = event.body;
    }

    try {
        const response = await fetch(url, fetchOptions);
        
        // Se a resposta não for OK, precisamos ler o corpo para obter a mensagem de erro
        if (!response.ok) {
            // Se o arquivo não for encontrado (404), é um caso especial que o frontend já sabe lidar
            if (response.status === 404) {
                 return {
                    statusCode: 404,
                    body: JSON.stringify({ message: "File not found" })
                };
            }
            // Para outros erros, tente ler a mensagem da API do GitHub
            const errorData = await response.json();
            throw new Error(`GitHub API Error (${response.status}): ${errorData.message || 'Erro desconhecido'}`);
        }

        const data = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error("Erro na função do proxy:", error);
        return {
            statusCode: 502, // Bad Gateway, indica um erro ao comunicar com o GitHub
            body: JSON.stringify({ error: error.message })
        };
    }
};