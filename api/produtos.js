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
    // MÉTODO GET: Listar todos os produtos
    if (req.method === 'GET') {
      const { rows } = await client.query('SELECT * FROM produtos ORDER BY id ASC;');
      return res.status(200).json(rows);
    } 
    
    // MÉTODO POST: Adicionar um novo produto
    else if (req.method === 'POST') {
      // Adicionamos codProduto e precoUnitario
      const { nome, quantidade, minQuantidade, codProduto, precoUnitario } = req.body; 
      if (!nome || quantidade === undefined || minQuantidade === undefined || !codProduto || precoUnitario === undefined) {
        return res.status(400).json({ error: 'Todos os campos (nome, quantidade, minQuantidade, codProduto, precoUnitario) são obrigatórios.' });
      }
      const query = 'INSERT INTO produtos (nome, quantidade, min_quantidade, cod_produto, preco_unitario) VALUES ($1, $2, $3, $4, $5) RETURNING *;';
      const values = [nome, parseInt(quantidade), parseInt(minQuantidade), codProduto, parseFloat(precoUnitario)];
      const { rows } = await client.query(query, values);
      return res.status(201).json(rows[0]);
    } 
    
    // MÉTODO PUT: Atualizar um produto existente
    else if (req.method === 'PUT') {
      const { id } = req.query; // Pegamos o ID da URL, ex: /api/produtos?id=1
      // Incluímos preco_unitario para atualização
      const { nome, quantidade, min_quantidade, preco_unitario } = req.body; 
      if (!id) {
        return res.status(400).json({ error: 'O ID do produto é obrigatório.' });
      }
      if (!nome || quantidade === undefined || min_quantidade === undefined || preco_unitario === undefined) {
        return res.status(400).json({ error: 'Todos os campos (nome, quantidade, min_quantidade, preco_unitario) são obrigatórios para atualização.' });
      }
      const query = 'UPDATE produtos SET nome = $1, quantidade = $2, min_quantidade = $3, preco_unitario = $4 WHERE id = $5 RETURNING *;';
      const values = [nome, parseInt(quantidade), parseInt(min_quantidade), parseFloat(preco_unitario), id];
      const { rows } = await client.query(query, values);
      // Retorna o produto atualizado, ou erro 404 se não encontrado
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado.' });
      }
      return res.status(200).json(rows[0]);
    } 
    
    // MÉTODO DELETE: Excluir um produto
    else if (req.method === 'DELETE') {
      const { id } = req.query; // Pegamos o ID da URL
      if (!id) {
        return res.status(400).json({ error: 'O ID do produto é obrigatório.' });
      }
      const { rowCount } = await client.query('DELETE FROM produtos WHERE id = $1;', [id]);
      // Retorna 204 se sucesso, ou 404 se não encontrado
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Produto não encontrado para exclusão.' });
      }
      return res.status(204).send(); // 204 No Content - sucesso, sem corpo de resposta
    } 
    
    // Se for outro método
    else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Método ${req.method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro na API de produtos:', error);
    // Erros de violação de UNIQUE constraint (código 23505)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Código de produto já existe. Por favor, insira um código único.' });
    }
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
};