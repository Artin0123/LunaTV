import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { generateOpenApiDocument } from '../src/lib/openapi';

const outputPath = path.resolve(process.cwd(), 'openapi', 'openapi.json');
const baseUrl = process.env.OPENAPI_BASE_URL || 'http://localhost:3000';

/** Replace save_time default (Date.now()) with fixed placeholder for deterministic output */
function makeDeterministic(doc: Record<string, unknown>): void {
  const replacer = (obj: unknown): void => {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const o = obj as Record<string, unknown>;
      for (const key of Object.keys(o)) {
        if (key === 'save_time' && o[key] && typeof o[key] === 'object') {
          const schema = o[key] as Record<string, unknown>;
          if ('default' in schema && typeof schema.default === 'number') {
            schema.default = 0;
          }
        } else {
          replacer(o[key]);
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(replacer);
    }
  };
  replacer(doc);
}

async function main() {
  const document = generateOpenApiDocument(baseUrl);
  makeDeterministic(document as unknown as Record<string, unknown>);
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
