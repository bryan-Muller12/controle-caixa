const { Pool } = require('pg');
const crypto = require('crypto'); // For CPF hashing

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper function to hash CPF for privacy (LGPD)
function hashCpf(cpf) {
  // A real-world application would use a more robust hashing algorithm
  // and salt management. For demonstration, a simple SHA256 is used.
  return crypto.createHash('sha256').update(cpf).digest('hex');
}

// Basic CPF validation (simple format check)
function isValidCpf(cpf) {
  // This is a very basic check. For production, consider a more robust library
  // that validates the CPF algorithmically (e.g., cpf-cnpj-validator).
  cpf = cpf.replace(/[^\d]/g, ''); // Remove non-numeric characters
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  let sum = 0;
  let remainder;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) {
    remainder = 0;
  }
  if (remainder !== parseInt(cpf.substring(9, 10))) {
    return false;
  }
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) {
    remainder = 0;
  }
  if (remainder !== parseInt(cpf.substring(10, 11))) {
    return false;
  }
  return true;
}


module.exports = async (req, res) => {
  const client = await pool.connect();
  try {
    // METHOD POST: Register a new customer
    if (req.method === 'POST') {
      const { nome, endereco, numero, cpf } = req.body;

      if (!nome || !endereco || !numero || !cpf) {
        return res.status(400).json({ error: 'Todos os campos (nome, endereço, número, CPF) são obrigatórios.' });
      }

      if (!isValidCpf(cpf)) {
        return res.status(400).json({ error: 'CPF inválido. Por favor, insira um CPF válido.' });
      }

      const hashedCpf = hashCpf(cpf); // Hash the CPF for storage

      const query = 'INSERT INTO clientes (nome, endereco, numero, cpf_hash) VALUES ($1, $2, $3, $4) RETURNING id, nome, endereco, numero;'; // Do not return raw CPF
      const values = [nome, endereco, numero, hashedCpf];
      const { rows } = await client.query(query, values);
      return res.status(201).json(rows[0]);
    }

    // METHOD GET: List all customers or search by name/CPF
    else if (req.method === 'GET') {
      const { search } = req.query;
      let query = 'SELECT id, nome, endereco, numero FROM clientes'; // Do not retrieve cpf_hash directly
      const queryParams = [];

      if (search) {
        // For searching by CPF, you would ideally hash the search term and compare to cpf_hash.
        // However, this means exact match on the hashed CPF which is not user-friendly for partial searches.
        // For privacy, full CPF search should be restricted to authorized personnel.
        // For demonstration, I'll allow searching by name.
        conditions.push(`nome ILIKE $${queryParams.push('%' + search + '%')}`);
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY nome ASC;';
      const { rows } = await client.query(query, queryParams);
      return res.status(200).json(rows);
    }

    // METHOD PUT: Update a customer
    else if (req.method === 'PUT') {
      const { id } = req.query;
      const { nome, endereco, numero, cpf } = req.body; // CPF might also be updated

      if (!id) {
        return res.status(400).json({ error: 'O ID do cliente é obrigatório.' });
      }

      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (nome !== undefined) {
        updates.push(`nome = $${paramIndex++}`);
        values.push(nome);
      }
      if (endereco !== undefined) {
        updates.push(`endereco = $${paramIndex++}`);
        values.push(endereco);
      }
      if (numero !== undefined) {
        updates.push(`numero = $${paramIndex++}`);
        values.push(numero);
      }
      if (cpf !== undefined) {
        if (!isValidCpf(cpf)) {
          return res.status(400).json({ error: 'CPF inválido. Por favor, insira um CPF válido.' });
        }
        updates.push(`cpf_hash = $${paramIndex++}`);
        values.push(hashCpf(cpf));
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo fornecido para atualização.' });
      }

      values.push(id); // Add ID for WHERE clause
      const query = `UPDATE clientes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, nome, endereco, numero;`;
      const { rows } = await client.query(query, values);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }
      return res.status(200).json(rows[0]);
    }

    // METHOD DELETE: Delete a customer
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'O ID do cliente é obrigatório.' });
      }
      const { rowCount } = await client.query('DELETE FROM clientes WHERE id = $1;', [id]);
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado para exclusão.' });
      }
      return res.status(204).send(); // 204 No Content - success, no response body
    }

    else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Método ${req.method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro na API de clientes:', error);
    if (error.code === '23505') { // Unique violation, e.g., if CPF was unique
      return res.status(409).json({ error: 'Já existe um cliente com este CPF.' });
    }
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
};