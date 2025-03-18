const https = require('https');
const fs = require('fs');
const path = require('path');

const ICONS = {
    'website': 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png',
    'twitter': 'https://cdn-icons-png.flaticon.com/512/3256/3256013.png',
    'telegram': 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png',
    'discord': 'https://cdn-icons-png.flaticon.com/512/5968/5968756.png',
    'coingecko': 'https://static.coingecko.com/s/coingecko-branding-guide-8447de673439420efa0ab1e0e03a1f8b0137270fbc9c0b7c086ee284bd417fa1.png'
};

const downloadIcon = (name, url) => {
    const iconPath = path.join(__dirname, '..', 'assets', 'icons', `${name}.png`);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(iconPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };

    https.get(url, options, (response) => {
        if (response.statusCode === 200) {
            const file = fs.createWriteStream(iconPath);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`✅ Downloaded ${name} icon`);
            });
        } else {
            console.error(`❌ Failed to download ${name} icon: ${response.statusCode}`);
        }
    }).on('error', (err) => {
        console.error(`❌ Error downloading ${name} icon:`, err.message);
    });
};

console.log('📥 Starting icon downloads...');

// Download all icons
Object.entries(ICONS).forEach(([name, url]) => {
    downloadIcon(name, url);
}); 