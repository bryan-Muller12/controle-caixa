// Exemplo de api/produtos.js (Você deve integrar isso ao seu arquivo existente)
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = async (req, res) => {
  const client = await pool.connect();
  try {
    // --- Lógica de Autenticação/Autorização (se houver, manter aqui) ---

    // MÉTODO POST: Adicionar um novo produto
    if (req.method === 'POST') {
      let { nome, codProduto, quantidade, minQuantidade, precoUnitario } = req.body;

      // CONVERTER DADOS PARA MAIÚSCULAS ANTES DE SALVAR
      nome = nome ? nome.toUpperCase() : null;
      codProduto = codProduto ? codProduto.toUpperCase() : null;

      if (!nome || !codProduto || quantidade === undefined || minQuantidade === undefined || precoUnitario === undefined) {
        return res.status(400).json({ error: 'Todos os campos obrigatórios do produto são necessários.' });
      }
      if (quantidade < 0 || minQuantidade < 0 || precoUnitario <= 0) {
        return res.status(400).json({ error: 'Quantidade, quantidade mínima e preço devem ser valores positivos.' });
      }

      try {
        const { rows } = await client.query(
          'INSERT INTO produtos (nome, cod_produto, quantidade, min_quantidade, preco_unitario) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, cod_produto, quantidade, min_quantidade, preco_unitario;',
          [nome, codProduto, quantidade, minQuantidade, precoUnitario]
        );
        const novoProduto = rows[0];
        return res.status(201).json({ message: 'Produto adicionado com sucesso!', produto: novoProduto });
      } catch (dbError) {
        if (dbError.code === '23505') { // Código de erro para violação de unique constraint
          return res.status(409).json({ error: 'Produto com este código ou nome já existe.' });
        }
        console.error('Erro ao adicionar produto no banco de dados:', dbError);
        return res.status(500).json({ error: 'Erro interno do servidor ao adicionar produto.' });
      }
    }

    // MÉTODO GET: Listar produtos ou buscar por ID/código/nome
    else if (req.method === 'GET') {
      const { search, id } = req.query;

      let query = 'SELECT id, nome, cod_produto, quantidade, min_quantidade, preco_unitario FROM produtos';
      const queryParams = [];
      const conditions = [];

      if (id) {
        conditions.push(`id = $${queryParams.push(id)}`);
      } else if (search) {
        // A busca no banco de dados já usa ILIKE, o que é case-insensitive.
        // O termo de busca do frontend virá em UPPERCASE para consistência.
        conditions.push(`nome ILIKE $${queryParams.push(`%${search}%`)} OR cod_produto ILIKE $${queryParams.push(`%${search}%`)}`);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      query += ` ORDER BY nome ASC;`;

      const { rows } = await client.query(query, queryParams);
      return res.status(200).json(rows);
    }

    // MÉTODO PUT: Atualizar um produto existente
    else if (req.method === 'PUT') {
      const { id } = req.query;
      let { nome, quantidade, min_quantidade, preco_unitario } = req.body; // cod_produto geralmente não é atualizado via PUT

      // CONVERTER DADOS PARA MAIÚSCULAS ANTES DE ATUALIZAR
      nome = nome ? nome.toUpperCase() : null;

      if (!id) {
        return res.status(400).json({ error: 'ID do produto é obrigatório para atualização.' });
      }
      if (!nome || quantidade === undefined || min_quantidade === undefined || preco_unitario === undefined) {
          return res.status(400).json({ error: 'Nome, quantidade, quantidade mínima e preço unitário são obrigatórios para atualização.' });
      }
      if (quantidade < 0 || min_quantidade < 0 || preco_unitario <= 0) {
        return res.status(400).json({ error: 'Quantidade, quantidade mínima e preço devem ser valores positivos.' });
      }

      try {
        const { rowCount } = await client.query(
          'UPDATE produtos SET nome = $1, quantidade = $2, min_quantidade = $3, preco_unitario = $4 WHERE id = $5;',
          [nome, quantidade, min_quantidade, preco_unitario, id]
        );

        if (rowCount === 0) {
          return res.status(404).json({ error: 'Produto não encontrado.' });
        }
        return res.status(200).json({ message: 'Produto atualizado com sucesso!' });
      } catch (dbError) {
        if (dbError.code === '23505') { // Código de erro para violação de unique constraint (se nome for único)
          return res.status(409).json({ error: 'Outro produto com este nome já existe.' });
        }
        console.error('Erro ao atualizar produto no banco de dados:', dbError);
        return res.status(500).json({ error: 'Erro interno do servidor ao atualizar produto.' });
      }
    }

    // MÉTODO DELETE: Excluir um produto
    else if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID do produto é obrigatório para exclusão.' });
      }

      try {
        const { rowCount } = await client.query('DELETE FROM produtos WHERE id = $1;', [id]);

        if (rowCount === 0) {
          return res.status(404).json({ error: 'Produto não encontrado para exclusão.' });
        }
        return res.status(200).json({ message: 'Produto excluído com sucesso!' });
      } catch (dbError) {
        console.error('Erro ao excluir produto do banco de dados:', dbError);
        return res.status(500).json({ error: 'Erro interno do servidor ao excluir produto.' });
      }
    }

    else {
      res.setHeader('Allow', ['POST', 'GET', 'PUT', 'DELETE']);
      return res.status(405).end(`Método ${req.method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro na API de produtos:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
};