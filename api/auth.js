// api/auth.js
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
    if (req.method === 'POST') {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
      }

      // MODIFICAÇÃO AQUI: Incluir 'role' na seleção
      const { rows } = await client.query('SELECT id, username, password_hash, role FROM usuarios WHERE username = $1;', [username]);
      const user = rows[0];

      if (!user) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
      }

      return res.status(200).json({ message: 'Login bem-sucedido!', user: { id: user.id, username: user.username, role: user.role } });

    } else {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Método ${req.method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro na API de autenticação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
};