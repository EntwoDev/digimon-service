const https = require('https');
const tls = require('tls');
require('dotenv').config();




exports.getLoadNet = async (req, res) => {
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

    // Make the GET request to the external API
    const apiRequest = https.request(options, (apiRes) => {
        let data = '';

        // Collect the data chunks
        apiRes.on('data', (chunk) => {
            data += chunk;
        });

        // Handle the end of the response
        apiRes.on('end', () => {
            // Parse the API response into an object
            const arrayContent = JSON.parse(data);

            // Initialize an empty array to store the data
            const dataI = [];
            let dataLastUpdate;
            let dataLastUpdate2;

            // Iterate through the Items array in the parsed JSON object
            for (let i = 0; i < arrayContent.Items.length; i++) {
                const content = arrayContent.Items[i];

                // Prepare the data for each item
                dataI[i] = {
                    name: content.Name,
                    value: content.Value.Value,
                    source: 'pi',
                };

                // Check for the "U3_NET" Name and store the Timestamp value
                if (content.Name === "U3_NET") {
                    dataLastUpdate = content.Value.Timestamp;
                    dataLastUpdate2 = content.Value.Timestamp;
                }
            }

            res.status(200).json({
                message: 'Data fetched successfully',
                data: dataI, // Parse the response data to JSON
            });
        });
    });

    apiRequest.on('error', (err) => {
        res.status(500).json({
            message: 'Error fetching data',
            error: err.message,
        });
    });

    // End the request
    apiRequest.end();
};