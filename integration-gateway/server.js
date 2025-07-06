const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const tokens = new Map();

app.get('/authorize', (req, res) => {
    const code = crypto.randomBytes(16).toString('hex');
    
    tokens.set(code, {
        clientId: req.query.client_id,
        redirectUri: req.query.redirect_uri,
        timestamp: Date.now()
    });

    const url = new URL(req.query.redirect_uri);
    url.searchParams.set('code', code);
    
    res.redirect(url.toString());
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.0.0'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
