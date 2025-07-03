// functions/github-proxy.js

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_PATH } = process.env;

    // --- VERIFICAÇÃO INICIAL ---
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !GITHUB_PATH) {
        const errorMsg = "Uma ou mais variáveis de ambiente (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_PATH) não estão definidas na Netlify.";
        console.error("[PROXY_ERROR]", errorMsg);
        return { statusCode: 500, body: JSON.stringify({ error: errorMsg }) };
    }

    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
    
    const headers = {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };
    
    const fetchOptions = {
        method: event.httpMethod,
        headers: headers
    };

    if (event.httpMethod === 'PUT') {
        fetchOptions.body = event.body;
    }
    
    console.log(`[PROXY_LOG] Chamando ${fetchOptions.method} ${url}`);

    try {
        const response = await fetch(url, fetchOptions);
        
        // --- ANÁLISE DETALHADA DA RESPOSTA DO GITHUB ---
        // Se a resposta NÃO for OK, vamos descobrir exatamente por quê.
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: "Não foi possível ler o corpo do erro como JSON." }));
            const githubErrorMsg = `Erro da API do GitHub: Status ${response.status}. Mensagem: ${errorBody.message}`;
            
            console.error("[PROXY_ERROR]", githubErrorMsg);
            
            // Retorna o status e a mensagem de erro originais do GitHub para o frontend
            return { 
                statusCode: response.status, 
                body: JSON.stringify({ error: githubErrorMsg, github_response: errorBody }) 
            };
        }

        // Se a resposta for OK, continue normalmente
        const data = await response.json();
        console.log(`[PROXY_LOG] Sucesso na chamada para o GitHub. Status: ${response.status}`);
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        const criticalErrorMsg = `Erro crítico na execução do fetch: ${error.message}`;
        console.error("[PROXY_ERROR]", criticalErrorMsg);
        return {
            statusCode: 502, // Bad Gateway
            body: JSON.stringify({ error: criticalErrorMsg })
        };
    }
};