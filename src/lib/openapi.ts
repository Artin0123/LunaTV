import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  addSearchHistorySchema,
  changePasswordSchema,
  loginSchema,
  saveFavoriteSchema,
  savePlayRecordSchema,
  saveSkipConfigSchema,
} from './api-schemas';
import { CURRENT_VERSION } from './version';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const ErrorSchema = registry.register(
  'ApiError',
  z.object({
    error: z.string(),
  }),
);

const OkSchema = registry.register(
  'ApiOk',
  z.object({
    ok: z.boolean(),
  }),
);

const SuccessSchema = registry.register(
  'ApiSuccess',
  z.object({
    success: z.boolean(),
  }),
);

registry.registerPath({
  method: 'post',
  path: '/api/login',
  tags: ['Auth'],
  summary: '用户登录',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: loginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '登录成功',
      content: {
        'application/json': {
          schema: OkSchema,
        },
      },
    },
    400: {
      description: '参数验证失败',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: '认证失败',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/change-password',
  tags: ['Auth'],
  summary: '修改当前用户密码',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: changePasswordSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '修改成功',
      content: {
        'application/json': {
          schema: OkSchema,
        },
      },
    },
    400: {
      description: '参数验证失败',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: '未授权',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/favorites',
  tags: ['User Data'],
  summary: '保存收藏',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: saveFavoriteSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '保存成功',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
    400: {
      description: '参数验证失败',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/playrecords',
  tags: ['User Data'],
  summary: '保存播放记录',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: savePlayRecordSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '保存成功',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
    400: {
      description: '参数验证失败',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/searchhistory',
  tags: ['User Data'],
  summary: '新增搜索历史',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: addSearchHistorySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '返回更新后的历史列表',
      content: {
        'application/json': {
          schema: z.array(z.string()),
        },
      },
    },
    400: {
      description: '参数验证失败',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/skipconfigs',
  tags: ['User Data'],
  summary: '保存跳过片头片尾配置',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: saveSkipConfigSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '保存成功',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
    400: {
      description: '参数验证失败',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export function generateOpenApiDocument(baseUrl: string) {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'LunaTV API',
      version: CURRENT_VERSION,
      description: 'LunaTV 核心 API 文档（持续补充中）',
    },
    servers: [
      {
        url: baseUrl,
      },
    ],
    tags: [
      { name: 'Auth', description: '认证相关接口' },
      { name: 'User Data', description: '用户数据相关接口' },
    ],
  });
}
