// api/users.js
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = async (req, res) => {
  const client = await pool.connect();
  try {
    // --- Lógica de Verificação de Admin (simples para este exemplo) ---
    // Em um sistema real, você validaria um token JWT que contém o papel do usuário
    // ou faria uma consulta ao banco de dados para verificar o papel com base na sessão.
    // Para simplificar, vamos assumir que o username é passado no header para verificação,
    // mas **ATENÇÃO**: isso não é seguro para produção sem um token JWT assinado.
    const loggedInUsername = req.headers['x-logged-in-username']; // Ou um token JWT real
    if (!loggedInUsername) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const adminCheck = await client.query('SELECT role FROM usuarios WHERE username = $1;', [loggedInUsername]);
    if (!adminCheck.rows[0] || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar usuários.' });
    }
    // --- Fim da Lógica de Verificação de Admin ---

    if (req.method === 'POST') {
      const { username, password, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
      }
      // O papel padrão será 'common' se não for especificado ou se não for 'admin'
      const userRole = (role === 'admin' && adminCheck.rows[0].role === 'admin') ? 'admin' : 'common';


      // Verificar se o usuário já existe
      const userExists = await client.query('SELECT 1 FROM usuarios WHERE username = $1;', [username]);
      if (userExists.rows.length > 0) {
        return res.status(409).json({ error: 'Usuário já existe.' });
      }

      // Gerar hash da senha
      const passwordHash = await bcrypt.hash(password, 10); // Custo de hash 10

      // Inserir o novo usuário no banco de dados
      const { rows } = await client.query(
        'INSERT INTO usuarios (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role;',
        [username, passwordHash, userRole]
      );
      const newUser = rows[0];

      return res.status(201).json({ message: 'Usuário criado com sucesso!', user: newUser });

    } else {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Método ${req.method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro na API de usuários:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
};