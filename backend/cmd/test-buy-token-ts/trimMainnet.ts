import { Connection, PublicKey } from '@solana/web3.js';
import { LiquidityPoolKeys, ApiPoolInfoV4 } from '@raydium-io/raydium-sdk-v2';
import axios from 'axios';
import * as fs from 'fs';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import * as jsonstream from 'jsonstream';
import * as path from 'path';
import * as os from 'os';

const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const TOKEN_A_MINT = 'So11111111111111111111111111111111111111112'; // SOL
const TOKEN_B_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
const OUTPUT_FILE = 'trimmed_mainnet.json';
const TMP_DIR = path.join(__dirname, 'tmp');

// Ensure tmp directory exists
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Clean up any leftover temp files
function cleanupTempFiles(): void {
  if (!fs.existsSync(TMP_DIR)) return;
  
  const files = fs.readdirSync(TMP_DIR);
  for (const file of files) {
    if (file.startsWith('raydium-pools-') && file.endsWith('.json')) {
      const filePath = path.join(TMP_DIR, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up temp file: ${file}`);
      } catch (error) {
        console.error(`Failed to clean up temp file ${file}:`, error);
      }
    }
  }
}

// Spinner animation frames
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerInterval: ReturnType<typeof setInterval>;
let currentSpinnerText = '';

function startSpinner(text: string) {
  currentSpinnerText = text;
  let i = 0;
  process.stdout.write('\x1B[?25l'); // Hide cursor
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\r${spinnerFrames[i]} ${currentSpinnerText}`);
    i = (i + 1) % spinnerFrames.length;
  }, 80);
}

function updateSpinnerText(text: string) {
  currentSpinnerText = text;
}

function stopSpinner() {
  clearInterval(spinnerInterval);
  process.stdout.write('\r\x1B[K'); // Clear line
  process.stdout.write('\x1B[?25h'); // Show cursor
}

// Create a temporary file with a unique name
function createTempFile(): string {
  return path.join(TMP_DIR, `raydium-pools-${Date.now()}.json`);
}

// Download file in chunks
async function downloadFile(url: string, tempFilePath: string): Promise<void> {
  const writer = fs.createWriteStream(tempFilePath);
  let downloadedBytes = 0;
  const mb = 1024 * 1024; // 1 MB

  return new Promise<void>(async (resolve, reject) => {
    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
      });

      response.data.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        updateSpinnerText(`Downloading... ${(downloadedBytes / mb).toFixed(1)} MB`);
      });

      writer.on('error', (error: Error) => {
        console.error('Write stream error:', error);
        writer.close();
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        reject(error);
      });

      writer.on('finish', () => {
        // Check file size after writing is complete
        const stats = fs.statSync(tempFilePath);
        console.log(`\nTemp file size: ${(stats.size / mb).toFixed(1)} MB`);
        
        // Read first few bytes using a read stream
        const previewStream = fs.createReadStream(tempFilePath, { 
          encoding: 'utf8',
          start: 0,
          end: 100
        });
        
        let preview = '';
        previewStream.on('data', (chunk: string | Buffer) => {
          preview += chunk.toString();
        });
        
        previewStream.on('end', () => {
          console.log(`File preview: ${preview}`);
          resolve();
        });
      });

      // Add error handler for the response stream
      response.data.on('error', (error: Error) => {
        console.error('Response stream error:', error);
        writer.close();
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        reject(error);
      });

      response.data.pipe(writer);

    } catch (error) {
      console.error('Download error:', error);
      writer.close();
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      reject(error);
    }
  });
}

// Process the downloaded file using streams
async function processPoolsFile(tempFilePath: string): Promise<ApiPoolInfoV4[]> {
  // Check file size before processing
  const stats = fs.statSync(tempFilePath);
  console.log(`\nProcessing file size: ${(stats.size / (1024 * 1024)).toFixed(1)} MB`);
  
  const tokenAMint = TOKEN_A_MINT.toLowerCase();
  const tokenBMint = TOKEN_B_MINT.toLowerCase();
  const matchingPools: ApiPoolInfoV4[] = [];
  let poolCount = 0;

  return new Promise<ApiPoolInfoV4[]>((resolve, reject) => {
    const readStream = fs.createReadStream(tempFilePath, { 
      encoding: 'utf8',
      highWaterMark: 1024 * 1024 // 1MB chunks
    });
    
    // Parse the JSON array inside the "official" field
    const parser = jsonstream.parse('official.*');

    parser.on('data', (pool: any) => {
      if (!pool || typeof pool !== 'object') {
        return;
      }

      poolCount++;
      try {
        const baseMint = (pool.baseMint || '').toLowerCase();
        const quoteMint = (pool.quoteMint || '').toLowerCase();
        
        const matchesDirectPair = 
          baseMint === tokenAMint && 
          quoteMint === tokenBMint;
        
        const matchesReversePair = 
          baseMint === tokenBMint && 
          quoteMint === tokenAMint;
        
        if (matchesDirectPair || matchesReversePair) {
          matchingPools.push(pool);
          updateSpinnerText(`Found ${matchingPools.length} matches in ${poolCount} pools`);
        } else {
          updateSpinnerText(`Checked ${poolCount} pools`);
        }
      } catch (error) {
        console.error('Error processing pool:', error);
      }
    });

    parser.on('end', () => resolve(matchingPools));
    parser.on('error', reject);

    readStream.pipe(parser);
  });
}

// Write the filtered pools to the output file
async function writeFilteredPools(pools: ApiPoolInfoV4[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(OUTPUT_FILE);
    writer.write(JSON.stringify(pools, null, 2));
    writer.end();
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function main() {
  let tempFilePath: string | null = null;
  
  try {
    // Clean up any leftover temp files first
    cleanupTempFiles();

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    
    console.log('🌊 Raydium Pool Fetcher');
    console.log('------------------------');
    console.log(`SOL-USDC Pool Filter`);
    console.log(`Input: ${TOKEN_A_MINT}`);
    console.log(`Output: ${TOKEN_B_MINT}\n`);
    
    startSpinner('Initializing download...');
    
    // Create temporary file
    tempFilePath = createTempFile();
    
    // Step 1: Download file
    await downloadFile('https://api.raydium.io/v2/sdk/liquidity/mainnet.json', tempFilePath);
    updateSpinnerText('Processing pools...');
    
    // Step 2: Process pools
    const filteredPools = await processPoolsFile(tempFilePath);
    
    // Step 3: Write results
    await writeFilteredPools(filteredPools);
    
    stopSpinner();

    if (filteredPools.length === 0) {
      console.log('❌ No matching pools found for token pair');
      process.exit(1);
    }

    console.log(`✨ Successfully found and wrote ${filteredPools.length} pools to ${OUTPUT_FILE}`);
    
  } catch (error) {
    stopSpinner();
    console.error('\n❌ Error processing pools:');
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      console.error('Request timed out. Please try again.');
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

// Ensure spinner is stopped and temp files are cleaned up on process exit
process.on('SIGINT', () => {
  stopSpinner();
  console.log('\n🛑 Process interrupted');
  process.exit(0);
});

main();