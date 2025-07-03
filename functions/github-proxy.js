// functions/github-proxy.js

// Usando require para compatibilidade máxima com o ambiente da Netlify
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // Log para ver o evento que a função recebeu
    console.log(`[PROXY_LOG] Recebida requisição: ${event.httpMethod}`);

    const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_PATH } = process.env;

    // Validação robusta das variáveis de ambiente
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !GITHUB_PATH) {
        const errorMessage = '[PROXY_ERROR] Variáveis de ambiente do GitHub não estão configuradas corretamente na Netlify.';
        console.error(errorMessage);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage })
        };
    }

    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
    
    const headers = {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json' // Sempre incluir para PUTs
    };
    
    const fetchOptions = {
        method: event.httpMethod,
        headers: headers
    };

    if (event.httpMethod === 'PUT') {
        fetchOptions.body = event.body; // O corpo já é uma string JSON do frontend
    }

    try {
        console.log(`[PROXY_LOG] Fazendo chamada para a API do GitHub: ${fetchOptions.method} ${url}`);
        const response = await fetch(url, fetchOptions);
        
        const responseBody = await response.text(); // Lê como texto para evitar erro se não for JSON
        console.log(`[PROXY_LOG] GitHub respondeu com status: ${response.status}`);

        // O frontend lida com 404, apenas repassamos
        if (response.status === 404) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "File not found" })
            };
        }

        if (!response.ok) {
            const errorMessage = `[PROXY_ERROR] Erro da API do GitHub: ${response.status} - ${responseBody}`;
            console.error(errorMessage);
            // Tenta fazer parse do erro, se falhar, usa o texto puro
            try {
                 const errorJson = JSON.parse(responseBody);
                 return { statusCode: response.status, body: JSON.stringify(errorJson) };
            } catch (e) {
                 return { statusCode: response.status, body: JSON.stringify({ message: responseBody }) };
            }
        }
        
        // Se a resposta for OK, o corpo deve ser JSON
        return {
            statusCode: 200,
            body: responseBody
        };

    } catch (error) {
        const errorMessage = `[PROXY_ERROR] Erro catastrófico na função: ${error.message}`;
        console.error(errorMessage);
        return {
            statusCode: 502,
            body: JSON.stringify({ error: errorMessage })
        };
    }
};