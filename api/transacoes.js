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
    // MÉTODO POST: Registrar uma nova transação (venda ou outra)
    if (req.method === 'POST') {
      // Adicionado clientId ao destructuring do req.body
      const { tipo, descricao, valor, data, detalhesVenda, clientId } = req.body;

      if (!tipo || valor === undefined || !data) {
        return res.status(400).json({ error: 'Campos obrigatórios: tipo, valor, data.' });
      }

      // Iniciar uma transação no banco de dados para garantir atomicidade
      await client.query('BEGIN');

      // 1. Inserir a transação principal
      // Adicionado client_id na query e nos valores
      const insertTransacaoQuery = `
        INSERT INTO transacoes (tipo, descricao, valor, data_transacao, total_bruto, valor_desconto, client_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
      `;
      const transacaoValues = [
        tipo,
        descricao,
        parseFloat(valor),
        data, // data já está em formato 'YYYY-MM-DD'
        detalhesVenda ? parseFloat(detalhesVenda.totalBruto) : parseFloat(valor), // totalBruto da venda ou valor direto
        detalhesVenda ? parseFloat(detalhesVenda.valorDesconto) : 0, // valorDesconto da venda ou 0
        clientId // Adiciona o clientId aqui
      ];
      const { rows: transacaoRows } = await client.query(insertTransacaoQuery, transacaoValues);
      const transacaoId = transacaoRows[0].id;

      // 2. Inserir os itens da transação (se houver detalhesVenda e itens)
      if (detalhesVenda && detalhesVenda.itens && detalhesVenda.itens.length > 0) {
        for (const item of detalhesVenda.itens) {
          const insertItemQuery = `
            INSERT INTO itens_transacao (
              transacao_id, produto_id, cod_produto, nome_produto, quantidade_vendida, 
              preco_unitario_original, preco_unitario_venda, total_item
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
          `;
          const itemValues = [
            transacaoId,
            item.produtoId,
            item.codProduto,
            item.nomeProduto,
            parseInt(item.quantidadeVendida),
            parseFloat(item.precoUnitarioOriginal),
            parseFloat(item.precoUnitarioVenda),
            parseFloat(item.totalItem)
          ];
          await client.query(insertItemQuery, itemValues);

          // Opcional: Atualizar o estoque do produto (diminuir a quantidade vendida)
          // Isso é crucial para manter a consistência do estoque no banco de dados.
          // Certifique-se de que o produto_id corresponde ao ID na tabela 'produtos'.
          const updateEstoqueQuery = `
            UPDATE produtos SET quantidade = quantidade - $1 WHERE id = $2;
          `;
          await client.query(updateEstoqueQuery, [parseInt(item.quantidadeVendida), item.produtoId]);
        }
      }

      await client.query('COMMIT'); // Confirmar a transação
      return res.status(201).json({ id: transacaoId, message: 'Transação registrada com sucesso.' });
    }

    // MÉTODO GET: Listar transações (com filtros opcionais)
    else if (req.method === 'GET') {
      const { dataInicio, dataFim, tipo, transactionId } = req.query; // Adicionado transactionId para busca específica

      let query = `
        SELECT
            t.id,
            t.tipo,
            t.descricao,
            t.valor,
            t.data_transacao,
            t.total_bruto,
            t.valor_desconto,
            t.client_id, -- Seleciona o ID do cliente
            c.name AS client_name, -- Nome do cliente
            c.phone AS client_phone, -- Telefone do cliente
            c.address AS client_address, -- Endereço do cliente
            ARRAY_AGG(
                jsonb_build_object(
                    'produtoId', it.produto_id,
                    'codProduto', it.cod_produto,
                    'nomeProduto', it.nome_produto,
                    'quantidadeVendida', it.quantidade_vendida,
                    'precoUnitarioOriginal', it.preco_unitario_original,
                    'precoUnitarioVenda', it.preco_unitario_venda,
                    'totalItem', it.total_item
                ) ORDER BY it.id
            ) FILTER (WHERE it.id IS NOT NULL) AS itens
        FROM transacoes t
        LEFT JOIN itens_transacao it ON t.id = it.transacao_id
        LEFT JOIN clients c ON t.client_id = c.id -- Faz o JOIN com a tabela clients
      `;
      const queryParams = [];
      const conditions = [];

      // Se um transactionId for fornecido, filtra por ele (para a página de nota)
      if (transactionId) {
        conditions.push(`t.id = $${queryParams.push(transactionId)}`);
      }
      
      if (dataInicio) {
        conditions.push(`t.data_transacao >= $${queryParams.push(dataInicio)}`);
      }
      if (dataFim) {
        conditions.push(`t.data_transacao <= $${queryParams.push(dataFim)}`);
      }
      if (tipo) {
        conditions.push(`t.tipo = $${queryParams.push(tipo)}`);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` GROUP BY t.id, c.id ORDER BY t.data_transacao DESC, t.id DESC;`; // Ordena por data e ID

      const { rows } = await client.query(query, queryParams);

      // Mapear os resultados para o formato esperado pelo frontend
      const formattedRows = rows.map(row => ({
        id: row.id,
        tipo: row.tipo,
        descricao: row.descricao,
        valor: parseFloat(row.valor),
        data: row.data_transacao, // Já vem como string no formato 'YYYY-MM-DD'
        // Inclui as informações do cliente, se existirem
        client: row.client_id ? {
          id: row.client_id,
          name: row.client_name,
          phone: row.client_phone,
          address: row.client_address
        } : undefined,
        detalhesVenda: row.itens && row.itens.length > 0 ? {
          totalBruto: parseFloat(row.total_bruto),
          valorDesconto: parseFloat(row.valor_desconto),
          totalFinal: parseFloat(row.valor), // O valor total da transação é o totalFinal
          itens: row.itens.map(item => ({
              produtoId: item.produtoId,
              codProduto: item.codProduto,
              nomeProduto: item.nomeProduto,
              quantidadeVendida: item.quantidadeVendida,
              precoUnitarioOriginal: parseFloat(item.precoUnitarioOriginal),
              precoUnitarioVenda: parseFloat(item.precoUnitarioVenda),
              totalItem: parseFloat(item.totalItem)
          }))
        } : undefined // Se não houver itens, detalhesVenda pode ser undefined
      }));

      return res.status(200).json(formattedRows);
    }
    
    // Outros métodos (PUT, DELETE para transações se necessário no futuro)
    else {
      res.setHeader('Allow', ['POST', 'GET']);
      return res.status(405).end(`Método ${req.method} não permitido.`);
    }
  } catch (error) {
    await client.query('ROLLBACK'); // Em caso de erro, reverter a transação
    console.error('Erro na API de transações:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
};