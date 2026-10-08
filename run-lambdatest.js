import { execSync } from 'child_process';
import tunnel from '@lambdatest/node-tunnel';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const tunnelInstance = new tunnel();

const tunnelArguments = {
  user: process.env.LT_USERNAME,
  key: process.env.LT_ACCESS_KEY,
  tunnelName: 'GST-App-Tunnel'
};

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8000';
const isLocal = baseURL.includes('localhost') || baseURL.includes('127.0.0.1');

async function runTests() {
  console.log(`\n========================================`);
  console.log(`  LambdaTest Grid Execution Target: ${baseURL}`);
  console.log(`========================================\n`);

  let tunnelStarted = false;
  try {
    if (isLocal || process.env.LT_FORCE_TUNNEL === 'true') {
      console.log('Starting LambdaTest Tunnel for local target...');
      await new Promise((resolve, reject) => {
        tunnelInstance.start(tunnelArguments, (error, status) => {
          if (!status) {
            reject(error || 'Tunnel failed to start');
          } else {
            resolve();
          }
        });
      });
      console.log('LambdaTest Tunnel Started Successfully.');
      tunnelStarted = true;
      process.env.LT_TUNNEL_NAME = tunnelArguments.tunnelName;
    } else {
      console.log('Targeting remote EC2 endpoint directly — LambdaTest Tunnel bypassed.');
    }
    
    process.env.LAMBDATEST = 'true';

    console.log('Executing Playwright tests on LambdaTest Cloud Grid...');
    execSync('npx playwright test', { stdio: 'inherit' });
    
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    if (tunnelStarted) {
      console.log('Stopping LambdaTest Tunnel...');
      tunnelInstance.stop();
    }
  }
}

runTests();
