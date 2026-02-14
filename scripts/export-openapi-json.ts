import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { generateOpenApiDocument } from '../src/lib/openapi';

const outputPath = path.resolve(process.cwd(), 'openapi', 'openapi.json');
const baseUrl = process.env.OPENAPI_BASE_URL || 'http://localhost:3000';

async function main() {
  const document = generateOpenApiDocument(baseUrl);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(document, null, 2)}\n`,
    'utf-8',
  );
  process.stdout.write(`OpenAPI JSON generated: ${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(
    `Failed to generate OpenAPI JSON: ${error instanceof Error ? error.stack || error.message : String(error)}\n`,
  );
  process.exit(1);
});
