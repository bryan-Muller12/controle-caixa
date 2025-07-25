// api/auth.js
const { Pool } = require('pg');
const bcrypt = require('bcryptjs'); // Importa a biblioteca para hashing de senhas
// Se for usar JWT (JSON Web Tokens) para gerenciamento de sessão:
// const jwt = require('jsonwebtoken'); // Instale: npm install jsonwebtoken

// Configuração do Pool de Conexões com o PostgreSQL
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false // Em produção, ajuste para 'true' se usar um certificado SSL válido
  }
});

// Chave secreta para JWT (apenas se estiver usando JWT).
// DEVE ser uma string forte e guardada em uma variável de ambiente em produção.
// const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_jwt_muito_segura_e_longa';

module.exports = async (req, res) => {
  // Garante que a conexão com o banco é liberada após a requisição
  const client = await pool.connect();
  try {
    // A rota de login deve aceitar apenas requisições POST
    if (req.method === 'POST') {
      const { username, password } = req.body;

      // Validação básica dos inputs
      if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
      }

      // 1. Buscar o usuário no banco de dados pelo username
      const { rows } = await client.query('SELECT id, username, password_hash FROM usuarios WHERE username = $1;', [username]);
      const user = rows[0];

      // Se o usuário não for encontrado
      if (!user) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
      }

      // 2. Comparar a senha fornecida com o hash armazenado no banco de dados
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      // Se a senha não for válida
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
      }

      // 3. Autenticação bem-sucedida
      // Se estiver usando JWT, você geraria um token aqui:
      /*
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '1h' } // Define a expiração do token (ex: 1 hora)
      );
      // E retornaria o token para o cliente
      return res.status(200).json({ message: 'Login bem-sucedido!', token: token, user: { id: user.id, username: user.username } });
      */

      // Se não estiver usando JWT, apenas retorne um sinal de sucesso com dados básicos do usuário
      return res.status(200).json({ message: 'Login bem-sucedido!', user: { id: user.id, username: user.username } });

    } else {
      // Retorna erro para métodos HTTP não permitidos
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Método ${req.method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro na API de autenticação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    // Garante que a conexão do cliente é liberada de volta para o pool
    client.release();
  }
};