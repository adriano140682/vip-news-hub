import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

import { createServer } from 'node:http';
import { createClient } from '@supabase/supabase-js';

const PORT = Number(process.env.ADMIN_API_PORT || 8787);
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  console.error(
    'Configure SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY para iniciar a API administrativa.'
  );
  process.exit(1);
}

const adminClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

function messageForAuthError(error) {
  const message = String(error?.message || '').toLowerCase();

  if (
    message.includes('already registered') ||
    message.includes('already been registered') ||
    error?.code === 'email_exists'
  ) {
    return 'Este e-mail já está cadastrado.';
  }

  if (message.includes('password')) {
    return 'A senha não atende aos requisitos do Supabase.';
  }

  return 'Não foi possível criar o usuário no Auth.';
}

async function readJson(request) {
  let raw = '';

  for await (const chunk of request) {
    raw += chunk;

    if (raw.length > 32768) {
      throw new Error('Payload muito grande.');
    }
  }

  return JSON.parse(raw || '{}');
}

async function authenticateAdmin(request) {
  const authorization = request.headers.authorization || '';

  if (!authorization.startsWith('Bearer ')) {
    return {
      error: {
        status: 401,
        message: 'Sessão ausente.',
      },
    };
  }

  const accessToken =
    authorization.slice('Bearer '.length).trim();

  if (!accessToken) {
    return {
      error: {
        status: 401,
        message: 'Sessão ausente.',
      },
    };
  }

  const callerClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: 'Bearer ' + accessToken,
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser(accessToken);

  if (userError || !user) {
    console.error('DIAGNÓSTICO SESSÃO:', {
      userError,
      user: user
        ? {
            id: user.id,
            email: user.email,
          }
        : null,
    });

    return {
      error: {
        status: 401,
        message: 'Sessão inválida ou expirada.',
      },
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await adminClient
    .from('profiles')
    .select('user_id, role')
    .eq('user_id', user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.role !== 'admin'
  ) {
    console.error('DIAGNÓSTICO ADMIN:', {
      userId: user.id,
      profile,
      profileError,
    });

    return {
      error: {
        status: 403,
        message: 'Somente usuários admin podem criar usuários.',
      },
    };
  }

  return {
    user,
    profile,
  };
}

async function createUser(request, response) {
  const authentication =
    await authenticateAdmin(request);

  if (authentication.error) {
    return json(
      response,
      authentication.error.status,
      {
        error: authentication.error.message,
      }
    );
  }

  let payload;

  try {
    payload = await readJson(request);
  } catch {
    return json(response, 400, {
      error: 'JSON inválido.',
    });
  }

  const name =
    typeof payload.name === 'string'
      ? payload.name.trim()
      : '';

  const email =
    typeof payload.email === 'string'
      ? payload.email.trim().toLowerCase()
      : '';

  const password =
    typeof payload.password === 'string'
      ? payload.password
      : '';

  const role = payload.role;

  if (!name || name.length > 120) {
    return json(response, 400, {
      error: 'Informe um nome válido.',
    });
  }

  if (
    !/^\S+@\S+\.\S+$/.test(email) ||
    email.length > 254
  ) {
    return json(response, 400, {
      error: 'Informe um e-mail válido.',
    });
  }

  if (
    password.length < 6 ||
    password.length > 128
  ) {
    return json(response, 400, {
      error: 'A senha deve ter entre 6 e 128 caracteres.',
    });
  }

  if (role !== 'editor' && role !== 'admin') {
    return json(response, 400, {
      error: 'A role deve ser editor ou admin.',
    });
  }

  const {
    data: created,
    error: authError,
  } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

  if (authError || !created.user) {
    console.error(
      'ERRO AO CRIAR AUTH USER:',
      authError
    );

    return json(response, 400, {
      error: messageForAuthError(authError),
    });
  }

  const {
    data: profile,
    error: profileError,
  } =
    await adminClient
      .from('profiles')
      .upsert(
        {
          user_id: created.user.id,
          name,
          role,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select(
        'id, user_id, name, role, created_at, updated_at'
      )
      .single();

  if (profileError || !profile) {
    console.error(
      'ERRO AO CRIAR PROFILE:',
      profileError
    );

    await adminClient.auth.admin.deleteUser(
      created.user.id
    );

    return json(response, 500, {
      error:
        'O usuário foi criado no Auth, mas o perfil falhou; a operação foi revertida.',
    });
  }

  return json(response, 201, {
    profile,
  });
}

const server = createServer(
  async (request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin':
          'http://localhost:8080',
        'Access-Control-Allow-Headers':
          'authorization, content-type',
        'Access-Control-Allow-Methods':
          'POST, OPTIONS',
      });

      return response.end();
    }

    if (
      request.method === 'POST' &&
      request.url === '/api/admin/users'
    ) {
      try {
        await createUser(request, response);
      } catch (error) {
        console.error(
          'Erro inesperado na API administrativa:',
          error
        );

        if (!response.headersSent) {
          json(response, 500, {
            error: 'Erro interno ao criar usuário.',
          });
        }
      }

      return;
    }

    json(response, 404, {
      error: 'Rota não encontrada.',
    });
  }
);

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    'API administrativa local disponível em http://127.0.0.1:' +
      PORT
  );
});