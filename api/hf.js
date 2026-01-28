export default async function handler(request, response) {
    // Handle CORS for the API route itself
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.HF_API_KEY || process.env.REACT_APP_HF_API_KEY;

    if (!apiKey) {
        return response.status(500).json({ error: 'Server configuration error: Missing API Key' });
    }

    try {
        const apiResponse = await fetch(
            'https://router.huggingface.co/hf-inference/models/meta-llama/Meta-Llama-3-8B-Instruct',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request.body),
            }
        );

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            return response.status(apiResponse.status).json({
                error: data.error || 'Upstream API error',
                details: data
            });
        }

        return response.status(200).json(data);

    } catch (error) {
        console.error('Proxy error:', error);
        return response.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
