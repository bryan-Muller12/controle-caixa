// api/clients.js
const { Pool } = require('pg');
const bcrypt = require('bcryptjs'); // Importa bcryptjs para hash de CPF

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = async (req, res) => {
  const client = await pool.connect();
  try {
    // --- Lógica de Verificação de Admin (similar a users.js, se necessário) ---
    // Decida se a criação/visualização de clientes requer privilégios de administrador.
    // Por enquanto, vamos assumir que não precisa para simplificar o exemplo,
    // mas em um ambiente de produção você provavelmente quer alguma autenticação/autorização.
    // Se for necessário, descomente e adapte a lógica abaixo:
    /*
    const loggedInUsername = req.headers['x-logged-in-username'];
    if (!loggedInUsername) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }
    const adminCheck = await client.query('SELECT role FROM usuarios WHERE username = $1;', [loggedInUsername]);
    if (!adminCheck.rows[0] || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerenciar clientes.' });
    }
    */
    // --- Fim da Lógica de Verificação de Admin ---

    // MÉTODO POST: Adicionar um novo cliente
    if (req.method === 'POST') {
      const { name, phone, address, cpf } = req.body;

      if (!name || !cpf) {
        return res.status(400).json({ error: 'Nome e CPF do cliente são obrigatórios.' });
      }

      // Validar formato do telefone (opcional, pode ser feito no frontend também)
      const phoneRegex = /^\(\d{2}\)\d{4,5}-\d{4}$/;
      if (phone && !phoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Formato de telefone inválido. Use (DD)NNNNN-NNNN ou (DD)NNNN-NNNN.' });
      }

      // Verificar se o CPF já existe (mesmo antes do hash, para evitar colisões lógicas)
      // Para verificar o CPF, você precisaria de uma forma de deshash ou comparar o hash
      // com o hash de todos os CPFs existentes, o que é inviável.
      // A abordagem comum é garantir que o CPF original seja único ou que o hash gerado seja "único o suficiente"
      // para fins de lookup, embora comparar hashes diretamente não seja ideal para verificar a existência do valor original.
      // Por segurança, para um campo UNIQUE como cpf_hash, podemos apenas tentar inserir e pegar o erro de duplicidade.

      let cpfHash;
      try {
        cpfHash = await bcrypt.hash(cpf, 10); // Custo de hash 10
      } catch (hashError) {
        console.error('Erro ao gerar hash do CPF:', hashError);
        return res.status(500).json({ error: 'Erro ao processar o CPF.' });
      }

      try {
        const { rows } = await client.query(
          'INSERT INTO clients (name, phone, address, cpf_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, phone, address;',
          [name, phone, address, cpfHash]
        );
        const newClient = rows[0];
        return res.status(201).json({ message: 'Cliente adicionado com sucesso!', client: newClient });
      } catch (dbError) {
        if (dbError.code === '23505') { // Código de erro para violação de unique constraint
          return res.status(409).json({ error: 'Cliente com este CPF já existe.' });
        }
        console.error('Erro ao adicionar cliente no banco de dados:', dbError);
        return res.status(500).json({ error: 'Erro interno do servidor ao adicionar cliente.' });
      }
    }

    // MÉTODO GET: Listar clientes ou buscar por ID/nome
    else if (req.method === 'GET') {
      const { search, id } = req.query; // Pode buscar por termo de pesquisa no nome ou por ID

      let query = 'SELECT id, name, phone, address FROM clients'; // Não retorna o cpf_hash
      const queryParams = [];
      const conditions = [];

      if (id) {
        conditions.push(`id = $${queryParams.push(id)}`);
      } else if (search) {
        conditions.push(`name ILIKE $${queryParams.push(`%${search}%`)}`); // Busca insensível a maiúsculas/minúsculas
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      query += ` ORDER BY name ASC;`;

      const { rows } = await client.query(query, queryParams);
      return res.status(200).json(rows);
    }
    
    // Outros métodos (PUT, DELETE para clientes se necessário no futuro)
    else {
      res.setHeader('Allow', ['POST', 'GET']);
      return res.status(405).end(`Método ${req.method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro na API de clientes:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
};