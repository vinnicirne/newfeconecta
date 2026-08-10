const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const execFileAsync = promisify(execFile);

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://ic-supabase-kong:8000';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is not set.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Use the bundled yt-dlp binary from the npm package (same version as global)
const YT_DLP_PATH = path.join(__dirname, 'node_modules/youtube-dl-exec/bin/yt-dlp');
const COOKIES_PATH = path.join(__dirname, 'cookies.txt');
const NODE_PATH = '/usr/local/bin/node';
const EXTERNAL_SUPABASE_URL = process.env.EXTERNAL_SUPABASE_URL || 'https://supabase.vps9432.panel.icontainer.cloud';

function buildYtDlpArgs(url, outputPath, format) {
    const args = [
        url,
        '--output', outputPath,
        '--format', format,
        '--no-warnings',
        '--no-check-certificate',
        '--js-runtimes', `node:${NODE_PATH}`,
    ];
    if (fs.existsSync(COOKIES_PATH)) {
        args.push('--cookies', COOKIES_PATH);
    }
    return args;
}

async function uploadToSupabase(filePath, filename, contentType) {
    const fileBuffer = fs.readFileSync(filePath);
    const { data, error } = await supabase.storage
        .from('videos')
        .upload(filename, fileBuffer, { contentType, upsert: false });
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(filename);
    let finalUrl = publicUrlData.publicUrl;
    finalUrl = finalUrl.replace('http://ic-supabase-kong:8000', EXTERNAL_SUPABASE_URL);
    return finalUrl;
}

app.post('/extract', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const filename = `${uuidv4()}.mp4`;
    const filepath = path.join('/tmp', filename);

    try {
        console.log(`Starting video extraction for ${url}`);
        const args = buildYtDlpArgs(url, filepath, 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
        await execFileAsync(YT_DLP_PATH, args, { timeout: 120000 });
        console.log(`Downloaded to ${filepath}`);

        const finalUrl = await uploadToSupabase(filepath, filename, 'video/mp4');
        fs.unlinkSync(filepath);

        console.log('Upload successful!');
        res.json({ success: true, url: finalUrl, path: filename });

    } catch (err) {
        console.error('Error during extraction:', err.stderr || err.message);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        res.status(500).json({ error: 'Failed to extract video', details: err.stderr || err.message });
    }
});

app.post('/extract-audio', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const baseFilename = `audio-${uuidv4()}`;
    // yt-dlp may output .webm or .m4a depending on what's available
    const filepath = path.join('/tmp', `${baseFilename}.%(ext)s`);

    try {
        console.log(`Starting audio extraction for ${url}`);
        const args = buildYtDlpArgs(url, filepath, 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio');
        await execFileAsync(YT_DLP_PATH, args, { timeout: 120000 });

        // Find the actual output file
        const tmpFiles = fs.readdirSync('/tmp');
        const outputFile = tmpFiles.find(f => f.startsWith(baseFilename));
        if (!outputFile) throw new Error('Output file not found after download');

        const actualPath = path.join('/tmp', outputFile);
        const contentType = outputFile.endsWith('.m4a') ? 'audio/mp4' : 'audio/webm';

        console.log(`Audio downloaded: ${outputFile}`);

        const finalUrl = await uploadToSupabase(actualPath, outputFile, contentType);
        fs.unlinkSync(actualPath);

        console.log('Upload successful!');
        res.json({ success: true, url: finalUrl, path: outputFile });

    } catch (err) {
        console.error('Error during audio extraction:', err.stderr || err.message);
        // Cleanup any temp files
        const tmpFiles = fs.readdirSync('/tmp');
        tmpFiles.filter(f => f.startsWith(baseFilename)).forEach(f => {
            try { fs.unlinkSync(path.join('/tmp', f)); } catch {}
        });
        res.status(500).json({ error: 'Failed to extract audio on VPS', details: err.stderr || err.message });
    }
});

const PORT = process.env.PORT || 8086;
app.listen(PORT, () => {
    console.log(`Media Extractor Engine running on port ${PORT}`);
});
