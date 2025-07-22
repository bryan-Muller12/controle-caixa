const { Pool } = require('pg');
const puppeteer = require('puppeteer');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = async (req, res) => {
  const clientDb = await pool.connect();
  let browser; // Declaração fora do try para garantir que esteja acessível no finally
  try {
    const { venda_id } = req.query; // Recebe o ID da venda como parâmetro de query

    if (!venda_id) {
      return res.status(400).json({ error: 'O ID da venda é obrigatório para gerar o orçamento.' });
    }

    // 1. Buscar detalhes da transação/venda
    const transacaoQuery = `
      SELECT
        t.id,
        t.data_transacao,
        t.valor,
        t.total_bruto,
        t.valor_desconto,
        t.detalhesVenda, -- Este campo JSONB contém os itens
        c.nome as cliente_nome,
        c.endereco as cliente_endereco,
        c.numero as cliente_numero,
        -- Não inclua cpf_hash diretamente aqui para evitar exposição em logs ou no template HTML final se não for estritamente necessário
        -- Poderíamos buscar os últimos 4 dígitos do CPF_HASH para exibição parcial se estritamente necessário no PDF, mas não o CPF completo.
        c.id as cliente_id
      FROM transacoes t
      LEFT JOIN clientes c ON t.cliente_id = c.id
      WHERE t.id = $1;
    `;
    const { rows: transacaoRows } = await clientDb.query(transacaoQuery, [venda_id]);

    if (transacaoRows.length === 0) {
      return res.status(404).json({ error: 'Venda não encontrada.' });
    }

    const venda = transacaoRows[0];
    const itensVenda = venda.detalhesvenda ? venda.detalhesvenda.itens : [];
    const clienteData = {
      nome: venda.cliente_nome || 'Cliente Não Vinculado',
      endereco: venda.cliente_endereco || 'N/A',
      numero: venda.cliente_numero || 'N/A',
      cpf: 'Não Informado' // Por segurança, não estamos buscando o CPF real do cliente aqui.
    };

    // 2. Montar o conteúdo HTML para o PDF
    let itensHtml = '';
    itensVenda.forEach((item, index) => {
      itensHtml += `
        <tr>
          <td>${index + 1}</td>
          <td>${item.quantidadeVendida}</td>
          <td>UN</td>
          <td>${item.codProduto}</td>
          <td>${item.nomeProduto}</td>
          <td>R$ ${parseFloat(item.precoUnitarioVenda).toFixed(2)}</td>
          <td>R$ ${parseFloat(item.totalItem).toFixed(2)}</td>
        </tr>
      `;
    });

    // Dados da empresa (assumidos fixos para este exemplo)
    const empresaNome = "MULLERSYS SISTEMAS";
    const empresaEndereco = "Rua Teste, 123 - Centro";
    const empresaCidade = "Minha Cidade";
    const empresaEstado = "MG";
    const empresaCnpj = "XX.XXX.XXX/XXXX-XX";
    const empresaTelefone = "(XX) XXXX-XXXX";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Orçamento de Venda #${venda.id}</title>
          <style>
              body { font-family: 'Arial', sans-serif; margin: 20mm; font-size: 10pt; }
              .header, .footer { text-align: center; margin-bottom: 20px; }
              .header h1 { font-size: 14pt; margin-bottom: 5px; }
              .header p { font-size: 8pt; margin: 0; }
              .section-title { font-size: 11pt; font-weight: bold; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #ccc; padding-bottom: 3px;}
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px; }
              .info-grid div { padding: 2px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              table th, table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
              table th { background-color: #f2f2f2; font-size: 9pt; }
              table td { font-size: 9pt; }
              .total-line { text-align: right; margin-top: 15px; font-size: 11pt; }
              .total-line strong { font-size: 12pt; }
              .item-total { text-align: right; }
              .notes { margin-top: 30px; font-size: 9pt; }
              .signature-area { margin-top: 50px; text-align: center; }
              .signature-area div { border-top: 1px solid #000; display: inline-block; padding: 5px 20px; margin-top: 20px; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>${empresaNome}</h1>
              <p>${empresaEndereco}</p>
              <p>${empresaCidade} - ${empresaEstado} | CNPJ: ${empresaCnpj} | Telefone: ${empresaTelefone}</p>
          </div>

          <div class="section-title">Orçamento a Clientes</div>
          <div class="info-grid">
              <div><strong>Cliente:</strong> ${clienteData.nome}</div>
              <div><strong>Pedido nº:</strong> ${venda.id}</div>
              <div><strong>Endereço:</strong> ${clienteData.endereco}, ${clienteData.numero}</div>
              <div><strong>Data:</strong> ${new Date(venda.data_transacao).toLocaleDateString('pt-BR')}</div>
              <div><strong>CPF/CGC:</strong> ${clienteData.cpf}</div>
              <div><strong>Vendedor(es):</strong> [Nome do Vendedor - não está no seu modelo de dados atual]</div>
          </div>

          <div class="section-title">Itens do Pedido</div>
          <table>
              <thead>
                  <tr>
                      <th>Item</th>
                      <th>Quantidade</th>
                      <th>UN</th>
                      <th>Código</th>
                      <th>Descrição</th>
                      <th>Preço Unit.</th>
                      <th>Total</th>
                  </tr>
              </thead>
              <tbody>
                  ${itensHtml}
              </tbody>
          </table>

          <div class="total-line">
              <span>Subtotal: R$ ${parseFloat(venda.total_bruto).toFixed(2)}</span><br>
              <span>Desconto: R$ ${parseFloat(venda.valor_desconto).toFixed(2)}</span><br>
              <strong>Total Geral: R$ ${parseFloat(venda.valor).toFixed(2)}</strong>
          </div>

          <div class="notes">
              <p>Condições de Pagamento: [Ex: À vista, 30 dias, etc. - não está no seu modelo de dados atual]</p>
              <p>Observações: [Quaisquer notas adicionais - não está no seu modelo de dados atual]</p>
          </div>

          <div class="signature-area">
              <div>Assinatura do Cliente</div>
              <div>Assinatura da Empresa</div>
          </div>

          <div class="footer">
              <p>Gerado por MullerSys em ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
      </body>
      </html>
    `;

    // 3. Gerar o PDF usando Puppeteer
    browser = await puppeteer.launch({
      headless: true, // Use 'new' para Puppeteer v16+
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Necessário para ambientes de servidor
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' }); // Espera a rede ficar inativa

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // Inclui cores e imagens de fundo
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    // 4. Enviar o PDF como resposta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=orcamento-${venda.id}.pdf`);
    return res.send(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar PDF de orçamento:', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao gerar PDF.' });
  } finally {
    if (browser) {
      await browser.close(); // Garante que o navegador seja fechado
    }
    clientDb.release();
  }
};