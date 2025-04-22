const https = require('https');
const { resolve } = require('path');
const tls = require('tls');


class PlamoRepository {
    loadNet() {
        // Get the URI from environment variable
        const PLAMO_URI = process.env.PLAMO_URI;

        // Parse the URI to separate parts (host, path, etc.)
        const url = new URL(PLAMO_URI);
        const options = {
            hostname: url.hostname,
            port: 443, // Use 443 for HTTPS
            path: url.pathname + url.search,
            method: 'GET',
            secureProtocol: 'TLS_method',  // This forces the usage of the best available TLS version
            rejectUnauthorized: false, // Disables SSL verification
            headers: {
                'Authorization': `Basic ${Buffer.from(url.username + ':' + url.password).toString('base64')}`
            }
        };

        return new Promise((resolve, reject) => {
            const apiRequest = https.request(options, (apiRes) => {
                let rawData = '';

                apiRes.on('data', (chunk) => rawData += chunk);
                apiRes.on('end', () => {
                    try {
                        const arrayContent = JSON.parse(rawData);

                        const dataI = [];
                        let lastUpdate = null;
            
                        arrayContent.Items.forEach((content) => {
                            dataI.push({
                                name: content.Name,
                                value: content.Value.Value,
                                source: 'pi',
                            });
            
                            if (content.Name === "U3_NET") {
                                lastUpdate = content.Value.Timestamp;
                            }
                        });
                        resolve(dataI);
                    } catch (err) {
                        reject(new Error(`Invalid JSON: ${err.message}`));
                    }
                });
            });

            apiRequest.on('error', (err) => {
                reject(new Error(`Network error: ${err.message}`));
            });

            apiRequest.end();
        });
    }
}

module.exports = PlamoRepository