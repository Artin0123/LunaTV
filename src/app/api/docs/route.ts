import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SWAGGER_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LunaTV API Docs</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
    />
    <style>
      :root {
        --lunatv-doc-font:
          'Inter',
          'Segoe UI',
          'Microsoft YaHei UI',
          'Microsoft YaHei',
          'Noto Sans CJK TC',
          'Noto Sans CJK SC',
          'Microsoft JhengHei',
          'PingFang TC',
          'PingFang SC',
          'Arial',
          'sans-serif';
      }

      body {
        margin: 0;
        background: #fafafa;
        font-family: var(--lunatv-doc-font);
      }

      /* Swagger UI 默认在部分节点使用 monospace，中文会回退到 NSimSun/衬线字体 */
      .swagger-ui,
      .swagger-ui .info,
      .swagger-ui .scheme-container,
      .swagger-ui .opblock-tag,
      .swagger-ui .opblock .opblock-summary-description,
      .swagger-ui .responses-inner h4,
      .swagger-ui .responses-inner h5,
      .swagger-ui .response-col_status,
      .swagger-ui .response-col_description,
      .swagger-ui .tab li,
      .swagger-ui .parameters-col_description,
      .swagger-ui .parameter__name,
      .swagger-ui .parameter__type,
      .swagger-ui .model-title {
        font-family: var(--lunatv-doc-font) !important;
      }

      .swagger-ui .opblock .opblock-summary-path,
      .swagger-ui .opblock .opblock-summary-method {
        font-family: var(--lunatv-doc-font) !important;
      }

      /* 保留代码块等技术内容的等宽字体 */
      .swagger-ui pre,
      .swagger-ui code,
      .swagger-ui .microlight {
        font-family:
          ui-monospace,
          'SFMono-Regular',
          Menlo,
          Monaco,
          Consolas,
          'Liberation Mono',
          'Courier New',
          monospace !important;
      }

      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = () => {
        window.SwaggerUIBundle({
          url: '/api/docs/openapi',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            window.SwaggerUIBundle.presets.apis,
            window.SwaggerUIStandalonePreset
          ],
          layout: 'BaseLayout'
        });
      };
    </script>
  </body>
</html>`;

export async function GET() {
  return new NextResponse(SWAGGER_HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
