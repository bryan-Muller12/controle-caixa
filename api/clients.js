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
      let { name, phone, address, cpf } = req.body;

      // CONVERTER DADOS PARA MAIÚSCULAS ANTES DE SALVAR
      name = name ? name.toUpperCase() : null;
      phone = phone ? phone.toUpperCase() : null;
      address = address ? address.toUpperCase() : null;
      // CPF não é convertido para uppercase, pois é para hash

      if (!name || !cpf) {
        return res.status(400).json({ error: 'Nome e CPF do cliente são obrigatórios.' });
      }

      // Validar formato do telefone (opcional, pode ser feito no frontend também)
      const phoneRegex = /^\(\d{2}\)\d{4,5}-\d{4}$/;
      if (phone && !phoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Formato de telefone inválido. Use (DD)NNNNN-NNNN ou (DD)NNNN-NNNN.' });
      }

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
        // A busca é case-insensitive devido ao ILIKE, mas os dados no DB estarão em UPPERCASE
        // O termo de busca do frontend virá em UPPERCASE para consistência.
        conditions.push(`name ILIKE $${queryParams.push(`%${search}%`)}`);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      query += ` ORDER BY name ASC;`;

      const { rows } = await client.query(query, queryParams);
      return res.status(200).json(rows);
    }

    // MÉTODO PUT: Atualizar um cliente existente
    else if (req.method === 'PUT') {
      const { id } = req.query;
      let { name, phone, address } = req.body;

      // CONVERTER DADOS PARA MAIÚSCULAS ANTES DE ATUALIZAR
      name = name ? name.toUpperCase() : null;
      phone = phone ? phone.toUpperCase() : null;
      address = address ? address.toUpperCase() : null;

      if (!id) {
        return res.status(400).json({ error: 'ID do cliente é obrigatório para atualização.' });
      }
      if (!name) {
        return res.status(400).json({ error: 'Nome do cliente é obrigatório para atualização.' });
      }

      const phoneRegex = /^\(\d{2}\)\d{4,5}-\d{4}$/;
      if (phone && !phoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Formato de telefone inválido. Use (DD)NNNNN-NNNN ou (DD)NNNN-NNNN.' });
      }

      try {
        const { rowCount } = await client.query(
          'UPDATE clients SET name = $1, phone = $2, address = $3 WHERE id = $4;',
          [name, phone, address, id]
        );

        if (rowCount === 0) {
          return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        return res.status(200).json({ message: 'Cliente atualizado com sucesso!' });
      } catch (dbError) {
        console.error('Erro ao atualizar cliente no banco de dados:', dbError);
        return res.status(500).json({ error: 'Erro interno do servidor ao atualizar cliente.' });
      }
    }

    // MÉTODO DELETE: Excluir um cliente
    else if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID do cliente é obrigatório para exclusão.' });
      }

      try {
        const { rowCount } = await client.query('DELETE FROM clients WHERE id = $1;', [id]);

        if (rowCount === 0) {
          return res.status(404).json({ error: 'Cliente não encontrado para exclusão.' });
        }
        return res.status(200).json({ message: 'Cliente excluído com sucesso!' });
      } catch (dbError) {
        console.error('Erro ao excluir cliente do banco de dados:', dbError);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
    }

    // Outros métodos
    else {
      res.setHeader('Allow', ['POST', 'GET', 'PUT', 'DELETE']);
      return res.status(405).end(`Método ${req.method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro na API de clientes:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
};