import type { paths } from '@/types/openapi';

type HttpMethod = 'get' | 'post' | 'delete';

type MethodPath<M extends HttpMethod> = {
  [P in keyof paths]: paths[P][M] extends never | undefined ? never : P;
}[keyof paths];

type OperationByMethod<
  M extends HttpMethod,
  P extends MethodPath<M>,
> = paths[P][M];

type OperationQuery<Op> = Op extends {
  parameters: {
    query?: infer Q;
  };
}
  ? Q
  : never;

type OperationRequestBody<Op> = Op extends {
  requestBody: {
    content: {
      'application/json': infer Body;
    };
  };
}
  ? Body
  : never;

type OperationSuccessResponse<Op> = Op extends {
  responses: {
    200: {
      content: {
        'application/json': infer Resp;
      };
    };
  };
}
  ? Resp
  : never;

type JsonQuery = Record<string, string | number | boolean | null | undefined>;

function buildUrlWithQuery(path: string, query?: JsonQuery): string {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.set(key, String(value));
  });
  const qs = params.toString();
  if (!qs) return path;
  return path.includes('?') ? `${path}&${qs}` : `${path}?${qs}`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response
    .json()
    .catch(() => ({ error: `HTTP ${response.status}` }))) as T;
}

export interface OpenApiResult<T> {
  ok: boolean;
  status: number;
  data: T | { error?: string };
}

interface RequestOpenApiOptions<Q> extends Omit<
  RequestInit,
  'method' | 'body'
> {
  request?: (input: string, init?: RequestInit) => Promise<Response>;
  query?: Q extends never ? never : Q;
}

interface PostOpenApiOptions extends Omit<RequestInit, 'method' | 'body'> {
  request?: (input: string, init?: RequestInit) => Promise<Response>;
}

type PostPath = MethodPath<'post'>;
type GetPath = MethodPath<'get'>;
type DeletePath = MethodPath<'delete'>;

type PostRequestBody<P extends PostPath> = OperationRequestBody<
  OperationByMethod<'post', P>
>;
type PostSuccessResponse<P extends PostPath> = OperationSuccessResponse<
  OperationByMethod<'post', P>
>;
type GetQuery<P extends GetPath> = OperationQuery<OperationByMethod<'get', P>>;
type GetSuccessResponse<P extends GetPath> = OperationSuccessResponse<
  OperationByMethod<'get', P>
>;
type DeleteQuery<P extends DeletePath> = OperationQuery<
  OperationByMethod<'delete', P>
>;
type DeleteSuccessResponse<P extends DeletePath> = OperationSuccessResponse<
  OperationByMethod<'delete', P>
>;

export async function postOpenApi<P extends PostPath>(
  path: P,
  body: PostRequestBody<P>,
  options?: PostOpenApiOptions,
): Promise<OpenApiResult<PostSuccessResponse<P>>> {
  const { request, ...requestInit } = options || {};
  const requestImpl = request || fetch;
  const response = await requestImpl(path, {
    ...requestInit,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(requestInit.headers || {}),
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonResponse<
    PostSuccessResponse<P> | { error?: string }
  >(response);

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export async function getOpenApi<P extends GetPath>(
  path: P,
  options?: RequestOpenApiOptions<GetQuery<P>>,
): Promise<OpenApiResult<GetSuccessResponse<P>>> {
  const { request, query, ...requestInit } = options || {};
  const requestImpl = request || fetch;
  const response = await requestImpl(
    buildUrlWithQuery(path, query ? (query as JsonQuery) : undefined),
    {
      ...requestInit,
      method: 'GET',
    },
  );

  const data = await parseJsonResponse<
    GetSuccessResponse<P> | { error?: string }
  >(response);

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export async function deleteOpenApi<P extends DeletePath>(
  path: P,
  options?: RequestOpenApiOptions<DeleteQuery<P>>,
): Promise<OpenApiResult<DeleteSuccessResponse<P>>> {
  const { request, query, ...requestInit } = options || {};
  const requestImpl = request || fetch;
  const response = await requestImpl(
    buildUrlWithQuery(path, query ? (query as JsonQuery) : undefined),
    {
      ...requestInit,
      method: 'DELETE',
    },
  );

  const data = await parseJsonResponse<
    DeleteSuccessResponse<P> | { error?: string }
  >(response);

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export type {
  DeletePath,
  DeleteQuery,
  DeleteSuccessResponse,
  GetPath,
  GetQuery,
  GetSuccessResponse,
  PostPath,
  PostRequestBody,
  PostSuccessResponse,
};
