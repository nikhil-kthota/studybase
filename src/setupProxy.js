const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    // Proxy configuration for Hugging Face API
    app.use(
        '/api/hf',
        createProxyMiddleware({
            target: 'https://api-inference.huggingface.co',
            changeOrigin: true,
            pathRewrite: {
                '^/api/hf': '/models/meta-llama/Meta-Llama-3-8B-Instruct',
            },
            onProxyReq: (proxyReq, req, res) => {
                // Add Authorization header with API key from environment
                if (process.env.REACT_APP_HF_API_KEY) {
                    proxyReq.setHeader('Authorization', `Bearer ${process.env.REACT_APP_HF_API_KEY}`);
                }
            },
            onProxyRes: (proxyRes) => {
                // Log status for debugging
                console.log('Proxy response status:', proxyRes.statusCode);
            },
            onError: (err, req, res) => {
                console.error('Proxy error:', err);
                res.status(500).send('Proxy Error');
            }
        })
    );
};
