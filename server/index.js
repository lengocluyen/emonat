import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

// Ensure DATE types round-trip as date-only strings (YYYY-MM-DD).
// Otherwise, timezone conversions can shift the day when serialized.
pg.types.setTypeParser(1082, (val) => val);

const PORT = Number(process.env.PORT || 5173);
const APP_ORIGIN = process.env.APP_ORIGIN || `http://localhost:${PORT}`;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || '0') === '1';

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('Missing JWT_SECRET');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

async function ensureDefaultBoard(userId) {
  // Returns the user's default board id, creating it (and default columns) if needed.
  const existing = await pool.query('select id from public.boards where owner_user_id=$1 and is_default=true', [userId]);
  if (existing.rows[0]) return existing.rows[0].id;

  try {
    const inserted = await pool.query(
      "insert into public.boards(owner_user_id, name, is_default) values ($1,'My Board',true) returning id",
      [userId]
    );
    const boardId = inserted.rows[0].id;
    await pool.query(
      `insert into public.board_columns(board_id, name, order_index)
       values ($1,'planning',0), ($1,'doing',1), ($1,'done',2)
       on conflict (board_id, name) do nothing`,
      [boardId]
    );
    return boardId;
  } catch (e) {
    // If a concurrent request created it, fall back to selecting.
    const again = await pool.query('select id from public.boards where owner_user_id=$1 and is_default=true', [userId]);
    if (again.rows[0]) return again.rows[0].id;
    throw e;
  }
}

async function assertBoardOwner(boardId, userId) {
  const { rows } = await pool.query('select id from public.boards where id=$1 and owner_user_id=$2', [boardId, userId]);
  if (!rows[0]) return null;
  return rows[0].id;
}

async function assertColumnOwner(columnId, userId) {
  const { rows } = await pool.query(
    `select c.id, c.board_id
     from public.board_columns c
     join public.boards b on b.id = c.board_id
     where c.id=$1 and b.owner_user_id=$2`,
    [columnId, userId]
  );
  return rows[0] ?? null;
}

async function getColumnIdForStatus(boardId, status) {
  const name = String(status || '').trim();
  if (name) {
    const byName = await pool.query('select id from public.board_columns where board_id=$1 and name=$2', [boardId, name]);
    if (byName.rows[0]) return byName.rows[0].id;
  }
  const fallback = await pool.query('select id from public.board_columns where board_id=$1 and name=$2', [boardId, 'planning']);
  return fallback.rows[0]?.id ?? null;
}

function setAuthCookie(res, token) {
  res.cookie('emonat_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

function clearAuthCookie(res) {
  res.cookie('emonat_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    path: '/',
    maxAge: 0,
  });
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.emonat_token;
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validPassword(pw) {
  return typeof pw === 'string' && pw.length >= 8;
}

function toUser(row) {
  if (!row) return null;
  const birthdayRaw = row.birthday;
  const birthday = birthdayRaw
    ? birthdayRaw instanceof Date
      ? birthdayRaw.toISOString().slice(0, 10)
      : String(birthdayRaw).trim().slice(0, 10)
    : null;
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name ?? null,
    phone: row.phone ?? null,
    birthday,
  };
}

// --- Auth ---
app.post('/api/auth/register', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || !email.includes('@')) return res.status(400).json({ error: 'invalid_email' });
  if (!validPassword(password)) return res.status(400).json({ error: 'password_min_8' });

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await pool.query(
      'insert into public.users(email, password_hash) values ($1,$2) returning id, email, full_name, phone, birthday',
      [email, passwordHash]
    );

    const user = toUser(rows[0]);
    const token = jwt.sign({ email: user.email }, JWT_SECRET, { subject: user.id, expiresIn: '30d' });
    setAuthCookie(res, token);
    return res.json({ user });
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('duplicate key') || msg.includes('users_email_key')) {
      return res.status(409).json({ error: 'email_in_use' });
    }
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || !password) return res.status(400).json({ error: 'invalid_credentials' });

  const { rows } = await pool.query('select id, email, full_name, phone, birthday, password_hash from public.users where email=$1', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = jwt.sign({ email: user.email }, JWT_SECRET, { subject: user.id, expiresIn: '30d' });
  setAuthCookie(res, token);
  return res.json({ user: toUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies?.emonat_token;
  if (!token) return res.json({ user: null });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return pool
      .query('select id, email, full_name, phone, birthday from public.users where id=$1', [payload.sub])
      .then((r) => res.json({ user: toUser(r.rows[0]) }))
      .catch(() => res.json({ user: null }));
  } catch {
    return res.json({ user: null });
  }
});

// --- Profile ---
app.get('/api/profile', authMiddleware, async (req, res) => {
  const { rows } = await pool.query('select id, email, full_name, phone, birthday from public.users where id=$1', [req.user.id]);
  const user = toUser(rows[0]);
  if (!user) return res.status(404).json({ error: 'not_found' });
  return res.json({ user });
});

app.put('/api/profile', authMiddleware, async (req, res) => {
  const patch = req.body || {};

  const fields = [];
  const values = [req.user.id];
  let idx = 2;

  if (patch.full_name !== undefined) {
    fields.push(`full_name=$${idx++}`);
    const v = String(patch.full_name ?? '').trim();
    values.push(v ? v : null);
  }
  if (patch.phone !== undefined) {
    fields.push(`phone=$${idx++}`);
    const v = String(patch.phone ?? '').trim();
    values.push(v ? v : null);
  }
  if (patch.birthday !== undefined) {
    fields.push(`birthday=$${idx++}`);
    const v = String(patch.birthday ?? '').trim();
    values.push(v ? v : null);
  }

  if (fields.length === 0) return res.status(400).json({ error: 'no_fields' });

  const { rows } = await pool.query(
    `update public.users set ${fields.join(', ')} where id=$1 returning id, email, full_name, phone, birthday`,
    values
  );

  const user = toUser(rows[0]);
  if (!user) return res.status(404).json({ error: 'not_found' });
  return res.json({ user });
});

// --- Tasks ---
app.get('/api/tasks', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'select id,title,description,status,due_date,board_id,column_id,order_index,created_at,updated_at from public.tasks where user_id=$1 order by updated_at desc',
    [req.user.id]
  );
  return res.json({ tasks: rows });
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  const title = String(req.body?.title || '').trim() || 'Untitled';
  const description = String(req.body?.description || '').trim() || null;
  const status = req.body?.status || 'planning';
  const dueDate = req.body?.due_date || null;

  // Backward compatible: if board/column aren't provided, attach to default board and
  // derive column from status.
  let boardId = req.body?.board_id || null;
  if (boardId) {
    const ok = await assertBoardOwner(boardId, req.user.id);
    if (!ok) return res.status(404).json({ error: 'board_not_found' });
  } else {
    boardId = await ensureDefaultBoard(req.user.id);
  }

  let columnId = req.body?.column_id || null;
  if (!columnId) {
    columnId = await getColumnIdForStatus(boardId, status);
  }

  const { rows } = await pool.query(
    'insert into public.tasks(user_id,board_id,column_id,title,description,status,due_date) values ($1,$2,$3,$4,$5,$6,$7) returning id,title,description,status,due_date,board_id,column_id,order_index,created_at,updated_at',
    [req.user.id, boardId, columnId, title, description, status, dueDate]
  );
  return res.json({ task: rows[0] });
});

app.patch('/api/tasks/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const patch = req.body || {};

  const currentRes = await pool.query('select id, board_id from public.tasks where user_id=$1 and id=$2', [req.user.id, id]);
  const current = currentRes.rows[0];
  if (!current) return res.status(404).json({ error: 'not_found' });

  const fields = [];
  const values = [req.user.id, id];
  let idx = 3;

  if (patch.title != null) {
    fields.push(`title=$${idx++}`);
    values.push(String(patch.title).trim() || 'Untitled');
  }
  if (patch.description != null) {
    fields.push(`description=$${idx++}`);
    const v = String(patch.description).trim();
    values.push(v ? v : null);
  }
  if (patch.status != null) {
    fields.push(`status=$${idx++}`);
    values.push(patch.status);
  }
  if (patch.board_id !== undefined) {
    const nextBoardId = patch.board_id;
    if (nextBoardId) {
      const ok = await assertBoardOwner(nextBoardId, req.user.id);
      if (!ok) return res.status(404).json({ error: 'board_not_found' });
      fields.push(`board_id=$${idx++}`);
      values.push(nextBoardId);
    } else {
      // Setting to null => default board
      const def = await ensureDefaultBoard(req.user.id);
      fields.push(`board_id=$${idx++}`);
      values.push(def);
    }
  }
  if (patch.column_id !== undefined) {
    fields.push(`column_id=$${idx++}`);
    values.push(patch.column_id || null);
  }
  if (patch.due_date !== undefined) {
    fields.push(`due_date=$${idx++}`);
    values.push(patch.due_date || null);
  }

  if (fields.length === 0) return res.status(400).json({ error: 'no_fields' });

  const { rows } = await pool.query(
    `update public.tasks set ${fields.join(', ')} where user_id=$1 and id=$2 returning id,title,description,status,due_date,board_id,column_id,order_index,created_at,updated_at`,
    values
  );
  const task = rows[0];

  // If status changed but column wasn't explicitly set, keep them aligned.
  if (patch.status != null && patch.column_id === undefined) {
    const boardId = task.board_id || (await ensureDefaultBoard(req.user.id));
    const columnId = await getColumnIdForStatus(boardId, patch.status);
    if (columnId && columnId !== task.column_id) {
      const r2 = await pool.query(
        'update public.tasks set board_id=$1, column_id=$2 where user_id=$3 and id=$4 returning id,title,description,status,due_date,board_id,column_id,order_index,created_at,updated_at',
        [boardId, columnId, req.user.id, id]
      );
      return res.json({ task: r2.rows[0] });
    }
  }

  return res.json({ task });
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const { rowCount } = await pool.query('delete from public.tasks where user_id=$1 and id=$2', [req.user.id, id]);
  if (rowCount === 0) return res.status(404).json({ error: 'not_found' });
  return res.json({ ok: true });
});

// --- Boards / Columns / Links ---
app.get('/api/boards', authMiddleware, async (req, res) => {
  await ensureDefaultBoard(req.user.id);
  const { rows } = await pool.query(
    'select id,name,is_default,created_at,updated_at from public.boards where owner_user_id=$1 order by is_default desc, updated_at desc',
    [req.user.id]
  );
  return res.json({ boards: rows });
});

app.post('/api/boards', authMiddleware, async (req, res) => {
  const name = String(req.body?.name || '').trim() || 'Untitled board';
  const { rows } = await pool.query(
    'insert into public.boards(owner_user_id, name, is_default) values ($1,$2,false) returning id,name,is_default,created_at,updated_at',
    [req.user.id, name]
  );
  const board = rows[0];
  // Default columns
  await pool.query(
    `insert into public.board_columns(board_id, name, order_index)
     values ($1,'planning',0), ($1,'doing',1), ($1,'done',2)
     on conflict (board_id, name) do nothing`,
    [board.id]
  );
  return res.json({ board });
});

app.get('/api/boards/:boardId/columns', authMiddleware, async (req, res) => {
  const boardId = req.params.boardId;
  const ok = await assertBoardOwner(boardId, req.user.id);
  if (!ok) return res.status(404).json({ error: 'board_not_found' });
  const { rows } = await pool.query(
    'select id,board_id,name,description,order_index,created_at,updated_at from public.board_columns where board_id=$1 order by order_index asc, created_at asc',
    [boardId]
  );
  return res.json({ columns: rows });
});

app.post('/api/boards/:boardId/columns', authMiddleware, async (req, res) => {
  const boardId = req.params.boardId;
  const ok = await assertBoardOwner(boardId, req.user.id);
  if (!ok) return res.status(404).json({ error: 'board_not_found' });
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'invalid_name' });
  const descriptionRaw = req.body?.description;
  const description = descriptionRaw === undefined || descriptionRaw === null ? null : String(descriptionRaw).trim() || null;
  const orderIndex = Number.isFinite(Number(req.body?.order_index)) ? Number(req.body.order_index) : 0;
  const { rows } = await pool.query(
    'insert into public.board_columns(board_id, name, description, order_index) values ($1,$2,$3,$4) returning id,board_id,name,description,order_index,created_at,updated_at',
    [boardId, name, description, orderIndex]
  );
  return res.json({ column: rows[0] });
});

app.patch('/api/columns/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const patch = req.body || {};

  const owner = await assertColumnOwner(id, req.user.id);
  if (!owner) return res.status(404).json({ error: 'not_found' });

  const fields = [];
  const values = [id];
  let idx = 2;

  if (patch.name !== undefined) {
    const name = String(patch.name || '').trim();
    if (!name) return res.status(400).json({ error: 'invalid_name' });
    fields.push(`name=$${idx++}`);
    values.push(name);
  }
  if (patch.order_index !== undefined) {
    const oi = Number(patch.order_index);
    if (!Number.isFinite(oi)) return res.status(400).json({ error: 'invalid_order' });
    fields.push(`order_index=$${idx++}`);
    values.push(oi);
  }

  if (patch.description !== undefined) {
    const descriptionRaw = patch.description;
    const description = descriptionRaw === null ? null : String(descriptionRaw || '').trim() || null;
    fields.push(`description=$${idx++}`);
    values.push(description);
  }

  if (fields.length === 0) return res.status(400).json({ error: 'no_fields' });

  const { rows } = await pool.query(
    `update public.board_columns set ${fields.join(', ')} where id=$1 returning id,board_id,name,description,order_index,created_at,updated_at`,
    values
  );
  return res.json({ column: rows[0] });
});

app.get('/api/boards/:boardId/tasks', authMiddleware, async (req, res) => {
  const boardId = req.params.boardId;
  const ok = await assertBoardOwner(boardId, req.user.id);
  if (!ok) return res.status(404).json({ error: 'board_not_found' });
  const columnId = req.query?.columnId ? String(req.query.columnId) : null;

  const { rows } = columnId
    ? await pool.query(
        'select id,title,description,status,due_date,board_id,column_id,order_index,created_at,updated_at from public.tasks where user_id=$1 and board_id=$2 and column_id=$3 order by order_index asc, updated_at desc',
        [req.user.id, boardId, columnId]
      )
    : await pool.query(
        'select id,title,description,status,due_date,board_id,column_id,order_index,created_at,updated_at from public.tasks where user_id=$1 and board_id=$2 order by updated_at desc',
        [req.user.id, boardId]
      );

  return res.json({ tasks: rows });
});

app.get('/api/boards/:boardId/links', authMiddleware, async (req, res) => {
  const boardId = req.params.boardId;
  const ok = await assertBoardOwner(boardId, req.user.id);
  if (!ok) return res.status(404).json({ error: 'board_not_found' });
  const { rows } = await pool.query(
    'select id,board_id,from_task_id,to_task_id,kind,created_at from public.task_links where board_id=$1 order by created_at asc',
    [boardId]
  );
  return res.json({ links: rows });
});

app.post('/api/boards/:boardId/links', authMiddleware, async (req, res) => {
  const boardId = req.params.boardId;
  const ok = await assertBoardOwner(boardId, req.user.id);
  if (!ok) return res.status(404).json({ error: 'board_not_found' });
  const fromTaskId = String(req.body?.from_task_id || '');
  const toTaskId = String(req.body?.to_task_id || '');
  const kind = String(req.body?.kind || 'dependency');
  if (!fromTaskId || !toTaskId) return res.status(400).json({ error: 'invalid_link' });
  if (kind !== 'dependency' && kind !== 'reference') return res.status(400).json({ error: 'invalid_kind' });

  const taskCheck = await pool.query(
    'select id from public.tasks where user_id=$1 and board_id=$2 and id = any($3::uuid[])',
    [req.user.id, boardId, [fromTaskId, toTaskId]]
  );
  if ((taskCheck.rows?.length ?? 0) !== 2) return res.status(404).json({ error: 'task_not_found' });

  const { rows } = await pool.query(
    `insert into public.task_links(board_id, from_task_id, to_task_id, kind)
     values ($1,$2,$3,$4)
     on conflict (board_id, from_task_id, to_task_id, kind) do update set kind=excluded.kind
     returning id,board_id,from_task_id,to_task_id,kind,created_at`,
    [boardId, fromTaskId, toTaskId, kind]
  );
  return res.json({ link: rows[0] });
});

app.delete('/api/links/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const { rows } = await pool.query('select board_id from public.task_links where id=$1', [id]);
  const boardId = rows[0]?.board_id;
  if (!boardId) return res.status(404).json({ error: 'not_found' });
  const ok = await assertBoardOwner(boardId, req.user.id);
  if (!ok) return res.status(404).json({ error: 'not_found' });
  const { rowCount } = await pool.query('delete from public.task_links where id=$1', [id]);
  if (rowCount === 0) return res.status(404).json({ error: 'not_found' });
  return res.json({ ok: true });
});

// --- Per-task graph ---
app.get('/api/tasks/:id/graph', authMiddleware, async (req, res) => {
  const id = req.params.id;

  const taskRes = await pool.query('select id,title from public.tasks where user_id=$1 and id=$2', [req.user.id, id]);
  const task = taskRes.rows[0];
  if (!task) return res.status(404).json({ error: 'not_found' });

  const { rows } = await pool.query('select graph from public.task_graphs where task_id=$1', [id]);
  if (!rows[0]) {
    // Default graph: one task node representing this card
    const graph = {
      layoutMode: 'brain',
      edgeKind: 'reference',
      nodes: [
        {
          id: 'root_task',
          type: 'task',
          position: { x: 240, y: 180 },
          data: { title: task.title, status: 'pending', content: '' },
        },
      ],
      edges: [],
    };
    return res.json({ graph });
  }
  return res.json({ graph: rows[0].graph });
});

app.put('/api/tasks/:id/graph', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const graph = req.body?.graph;

  if (!graph || typeof graph !== 'object') return res.status(400).json({ error: 'invalid_graph' });

  const taskRes = await pool.query('select id from public.tasks where user_id=$1 and id=$2', [req.user.id, id]);
  if (!taskRes.rows[0]) return res.status(404).json({ error: 'not_found' });

  await pool.query(
    `insert into public.task_graphs(task_id, graph) values ($1, $2)
     on conflict (task_id) do update set graph=excluded.graph, updated_at=now()`,
    [id, graph]
  );

  return res.json({ ok: true });
});

// Serve the static web app
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const appDir = path.resolve(__dirname, '..', 'app');

// Serve brand assets from repo root (only the known logo files)
app.get(['/logo.png', '/logo.jpg', '/logo_mono.svg', '/logo.svg', '/vectorink-vectorizer-result.svg'], (req, res) => {
  res.sendFile(path.join(repoRoot, req.path));
});

// Serve the frontend under /app
app.get('/', (req, res) => res.redirect('/app/'));
app.use('/app', express.static(appDir));

// SPA fallback for client-side routes under /app (but never for real files)
app.get(['/app', '/app/'], (req, res) => {
  res.sendFile(path.join(appDir, 'index.html'));
});
app.get('/app/*', (req, res) => {
  if (/\.[a-zA-Z0-9]+$/.test(req.path)) {
    return res.status(404).end();
  }
  return res.sendFile(path.join(appDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Emonat server running: ${APP_ORIGIN}`);
});
