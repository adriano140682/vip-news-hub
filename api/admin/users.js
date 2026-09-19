import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método não permitido.',
    });
  }

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    console.error('Variáveis Supabase não configuradas no Vercel.');

    return res.status(500).json({
      error: 'API administrativa não configurada.',
    });
  }

  try {
    const authorization = req.headers.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Sessão ausente.',
      });
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken) {
      return res.status(401).json({
        error: 'Sessão ausente.',
      });
    }

    const callerClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser(accessToken);

    if (userError || !user) {
      return res.status(401).json({
        error: 'Sessão inválida ou expirada.',
      });
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

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
      console.error('Usuário sem permissão administrativa:', {
        userId: user.id,
        profileError,
        profile,
      });

      return res.status(403).json({
        error: 'Somente usuários admin podem criar usuários.',
      });
    }

    const {
      name = '',
      email = '',
      password = '',
      role = '',
    } = req.body || {};

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);
    const cleanRole = String(role);

    if (!cleanName || cleanName.length > 120) {
      return res.status(400).json({
        error: 'Informe um nome válido.',
      });
    }

    if (
      !/^\S+@\S+\.\S+$/.test(cleanEmail) ||
      cleanEmail.length > 254
    ) {
      return res.status(400).json({
        error: 'Informe um e-mail válido.',
      });
    }

    if (
      cleanPassword.length < 6 ||
      cleanPassword.length > 128
    ) {
      return res.status(400).json({
        error: 'A senha deve ter entre 6 e 128 caracteres.',
      });
    }

    if (
      cleanRole !== 'editor' &&
      cleanRole !== 'admin'
    ) {
      return res.status(400).json({
        error: 'A função deve ser editor ou admin.',
      });
    }

    const {
      data: created,
      error: authError,
    } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPassword,
      email_confirm: true,
      user_metadata: {
        name: cleanName,
      },
    });

    if (authError || !created?.user) {
      console.error('Erro ao criar usuário no Auth:', authError);

      return res.status(400).json({
        error:
          authError?.message ||
          'Não foi possível criar o usuário.',
      });
    }

    const {
      data: newProfile,
      error: newProfileError,
    } = await adminClient
      .from('profiles')
      .upsert(
        {
          user_id: created.user.id,
          name: cleanName,
          role: cleanRole,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select(
        'id, user_id, name, role, created_at, updated_at'
      )
      .single();

    if (newProfileError || !newProfile) {
      console.error(
        'Erro ao criar perfil:',
        newProfileError
      );

      await adminClient.auth.admin.deleteUser(
        created.user.id
      );

      return res.status(500).json({
        error:
          'O usuário foi criado no Auth, mas o perfil falhou; a operação foi revertida.',
      });
    }

    return res.status(201).json({
      profile: newProfile,
    });
  } catch (error) {
    console.error(
      'Erro inesperado na API administrativa:',
      error
    );

    return res.status(500).json({
      error: 'Erro interno ao criar usuário.',
    });
  }
}