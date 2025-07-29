// public/venda.js

// Lógica específica da tela de Venda
if (document.body.id === 'page-venda' || location.pathname.includes('venda.html')) {
    // ==== Seleção de Elementos do DOM ====
    const productNameDisplay = document.getElementById('product-name-display');

    const searchProdutoInput = document.getElementById('search-produto-input');
    const findProductBtn = document.getElementById('find-product-btn');
    const foundProductDetails = document.getElementById('found-product-details');
    const foundProductName = document.getElementById('found-product-name');
    const foundProductCod = document.getElementById('found-product-cod');
    const foundProductQuantityStock = document.getElementById('found-product-quantity-stock');

    const quantidadeItemInput = document.getElementById('quantidade-item');
    const valorUnitarioItemInput = document.getElementById('valor-unitario-item');
    const valorTotalItemInput = document.getElementById('valor-total-item');
    const addItemToCartBtn = document.getElementById('add-item-to-cart-btn');

    const cartItemsList = document.getElementById('cart-items-list');
    const emptyCartMessage = document.querySelector('.empty-cart-message');

    const totalVolumesDisplay = document.getElementById('total-volumes');
    const totalSaleDisplay = document.getElementById('total-sale-display');

    const aplicarDescontoCheckbox = document.getElementById('aplicar-desconto');
    const valorDescontoGlobalInput = document.getElementById('valor-desconto-global');

    const finalizeSaleBtn = document.getElementById('finalize-sale-btn');
    const cancelAllItemsBtn = document.getElementById('cancel-all-items-btn');

    const searchClientInput = document.getElementById('search-client-input');
    const findClientBtn = document.getElementById('find-client-btn');
    const selectedClientDisplay = document.getElementById('selected-client-display');
    const selectedClientName = document.getElementById('selected-client-name');
    const selectedClientCpf = document.getElementById('selected-client-cpf');
    const removeClientBtn = document.getElementById('remove-client-btn');
    const clientSearchResultsDiv = document.getElementById('client-search-results');
    const clientResultsList = document.getElementById('client-results-list');

    // ==== Estado da Aplicação ====
    let produtos = [];
    let carrinho = [];
    let allClients = [];
    let selectedClient = null;

    // ==== Funções de Utilidade ====
    async function fazerRequisicaoApi(url, method, data = {}) {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (method !== 'GET' && method !== 'HEAD') {
            options.body = JSON.stringify(data);
        }
        const response = await fetch(url, options);
        const responseData = await response.json().catch(() => null); 
        if (!response.ok) {
            throw new Error(responseData?.error || `Erro na requisição ${method} ${url}: Status ${response.status}`);
        }
        return responseData;
    }

    async function carregarProdutos() {
        try {
            produtos = await fazerRequisicaoApi('/api/produtos', 'GET');
            atualizarNotificacoesComuns();
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            showCustomPopup('Erro', 'Não foi possível carregar os produtos do servidor.', 'error');
        }
    }

    async function carregarClientes() {
        try {
            allClients = await fazerRequisicaoApi('/api/clients', 'GET');
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            showCustomPopup('Erro', 'Não foi possível carregar os clientes do servidor.', 'error');
        }
    }

    function exibirDetalhesProdutoEncontrado(produto) {
        if (produto) {
            productNameDisplay.textContent = produto.nome;
            foundProductName.textContent = produto.nome;
            foundProductCod.textContent = produto.cod_produto;
            foundProductQuantityStock.textContent = produto.quantidade;
            foundProductDetails.classList.remove('hidden');

            quantidadeItemInput.value = 1;
            quantidadeItemInput.max = produto.quantidade;
            quantidadeItemInput.min = 1;
            valorUnitarioItemInput.value = parseFloat(produto.preco_unitario).toFixed(2);

            atualizarValorTotalItem();
            addItemToCartBtn.disabled = false;
        } else {
            productNameDisplay.textContent = 'Produto Selecionado';
            foundProductDetails.classList.add('hidden');
            quantidadeItemInput.value = 1;
            valorUnitarioItemInput.value = (0).toFixed(2);
            valorTotalItemInput.value = (0).toFixed(2);
            addItemToCartBtn.disabled = true;
        }
        produtoEncontradoParaAdicionar = produto;
    }

    function pesquisarProduto() {
        const termoBusca = searchProdutoInput.value.toLowerCase().trim();
        let produto = null;
        if (termoBusca) {
            produto = produtos.find(p =>
                (p.cod_produto && p.cod_produto.toLowerCase() === termoBusca) ||
                (p.nome.toLowerCase() === termoBusca)
            );
            if (!produto) {
                produto = produtos.find(p =>
                    (p.cod_produto && p.cod_produto.toLowerCase().includes(termoBusca)) ||
                    (p.nome.toLowerCase().includes(termoBusca))
                );
            }
        }
        if (produto && produto.quantidade > 0) {
            exibirDetalhesProdutoEncontrado(produto);
        } else {
            showCustomPopup('Alerta', 'Produto não encontrado ou sem estoque.', 'warning');
            exibirDetalhesProdutoEncontrado(null);
            searchProdutoInput.value = '';
        }
    }

    function exibirClienteSelecionado(client) {
        selectedClient = client;
        if (client) {
            selectedClientName.textContent = client.name;
            selectedClientCpf.textContent = `ID: ${client.id}`; 
            selectedClientDisplay.classList.remove('hidden');
            removeClientBtn.classList.remove('hidden');
            clientSearchResultsDiv.classList.add('hidden');
        } else {
            selectedClientName.textContent = 'Nenhum Cliente Selecionado';
            selectedClientCpf.textContent = '';
            selectedClientDisplay.classList.add('hidden');
            removeClientBtn.classList.add('hidden');
        }
    }

    function renderClientSearchResults(results) {
        clientResultsList.innerHTML = '';
        if (results.length > 0) {
            results.forEach(client => {
                const li = document.createElement('li');
                li.classList.add('client-search-item');
                li.dataset.clientId = client.id;
                li.innerHTML = `
                    <span>${client.name}</span>
                    <span class="client-search-phone">${formatPhone(client.phone) || 'N/A'}</span>
                `;
                li.addEventListener('click', () => {
                    exibirClienteSelecionado(client);
                    searchClientInput.value = client.name;
                    clientSearchResultsDiv.classList.add('hidden');
                });
                clientResultsList.appendChild(li);
            });
            clientSearchResultsDiv.classList.remove('hidden');
        } else {
            clientSearchResultsDiv.classList.add('hidden');
        }
    }

    function pesquisarClienteAoDigitar() {
        const termoBusca = searchClientInput.value.toLowerCase().trim();
        if (termoBusca.length >= 2) {
            let directNameStartsWithMatches = allClients.filter(client =>
                client.name.toLowerCase().startsWith(termoBusca)
            );
            let finalResults = [...directNameStartsWithMatches];

            if (directNameStartsWithMatches.length === 0 && termoBusca.length >= 5) {
                const broaderMatches = allClients.filter(client =>
                    (client.name.toLowerCase().includes(termoBusca) ||
                    (client.phone && client.phone.replace(/\D/g, '').includes(termoBusca.replace(/\D/g, ''))) ||
                    (client.address && client.address.toLowerCase().includes(termoBusca)))
                );
                finalResults = [...broaderMatches];
            }
            const MAX_SUGGESTIONS = 10; 
            renderClientSearchResults(finalResults.slice(0, MAX_SUGGESTIONS));
        } else {
            clientSearchResultsDiv.classList.add('hidden');
            exibirClienteSelecionado(null);
        }
    }

    function removerClienteSelecionado() {
        exibirClienteSelecionado(null);
        searchClientInput.value = '';
        showCustomPopup('Informação', 'Cliente removido da venda.', 'info');
    }

    function atualizarValorTotalItem() {
        const quantidade = parseFloat(quantidadeItemInput.value);
        const valorUnitario = parseFloat(valorUnitarioItemInput.value);
        let total = 0;
        if (!isNaN(quantidade) && quantidade > 0 && !isNaN(valorUnitario) && valorUnitario > 0) {
            total = quantidade * valorUnitario;
        }
        valorTotalItemInput.value = total.toFixed(2);
    }

    function adicionarItemAoCarrinho() {
        if (!produtoEncontradoParaAdicionar) {
            showCustomPopup('Erro', 'Nenhum produto selecionado para adicionar.', 'error');
            return;
        }
        const quantidadeAdicionar = parseInt(quantidadeItemInput.value, 10);
        const valorUnitario = parseFloat(valorUnitarioItemInput.value);

        if (isNaN(quantidadeAdicionar) || quantidadeAdicionar <= 0 || quantidadeAdicionar > produtoEncontradoParaAdicionar.quantidade) {
            showCustomPopup('Erro', `Quantidade inválida ou maior que o estoque disponível (${produtoEncontradoParaAdicionar.quantidade} unidades).`, 'error');
            return;
        }
        if (isNaN(valorUnitario) || valorUnitario <= 0) {
            showCustomPopup('Erro', 'Valor unitário inválido.', 'error');
            return;
        }
        const itemExistenteIndex = carrinho.findIndex(item => item.id === produtoEncontradoParaAdicionar.id);
        if (itemExistenteIndex !== -1) {
            const novaQuantidadeTotal = carrinho[itemExistenteIndex].quantidadeVendidaNoCarrinho + quantidadeAdicionar;
            if (novaQuantidadeTotal > produtoEncontradoParaAdicionar.quantidade) {
                showCustomPopup('Erro', `Não é possível adicionar essa quantidade. Excederia o estoque disponível para "${produtoEncontradoParaAdicionar.nome}".`, 'error');
                return;
            }
            carrinho[itemExistenteIndex].quantidadeVendidaNoCarrinho = novaQuantidadeTotal;
            carrinho[itemExistenteIndex].totalItem = novaQuantidadeTotal * valorUnitario;
        } else {
            carrinho.push({
                id: produtoEncontradoParaAdicionar.id,
                codProduto: produtoEncontradoParaAdicionar.cod_produto,
                nomeProduto: produtoEncontradoParaAdicionar.nome,
                quantidadeVendidaNoCarrinho: quantidadeAdicionar,
                precoUnitarioOriginal: parseFloat(produtoEncontradoParaAdicionar.preco_unitario),
                precoUnitario: valorUnitario,
                totalItem: quantidadeAdicionar * valorUnitario
            });
        }
        atualizarCarrinhoDisplay();
        resetItemInputArea();
        calcularTotaisVenda();
    }

    function resetItemInputArea() {
        searchProdutoInput.value = '';
        exibirDetalhesProdutoEncontrado(null);
        quantidadeItemInput.value = 1;
        valorUnitarioItemInput.value = (0).toFixed(2);
        valorTotalItemInput.value = (0).toFixed(2);
        produtoEncontradoParaAdicionar = null;
    }

    function atualizarCarrinhoDisplay() {
        cartItemsList.innerHTML = '';
        if (carrinho.length === 0) {
            emptyCartMessage.classList.remove('hidden');
            finalizeSaleBtn.disabled = true;
            cancelAllItemsBtn.disabled = true;
            valorDescontoGlobalInput.value = '';
            aplicarDescontoCheckbox.checked = false;
        } else {
            emptyCartMessage.classList.add('hidden');
            carrinho.forEach((item, index) => {
                const li = document.createElement('li');
                li.classList.add('cart-item');
                li.dataset.index = index;
                li.innerHTML = `
                    <span class="cart-item-number">${index + 1}</span>
                    <span class="cart-item-cod">${item.codProduto}</span>
                    <span class="cart-item-desc">${item.nomeProduto}</span>
                    <span class="cart-item-qty">${item.quantidadeVendidaNoCarrinho}</span>
                    <span class="cart-item-unit-val">R$ ${item.precoUnitario.toFixed(2)}</span>
                    <span class="cart-item-total-val">R$ ${item.totalItem.toFixed(2)}</span>
                    <span class="cart-item-actions">
                        <button class="btn-action btn-remove-item" data-index="${index}" title="Remover Item"><i class="fas fa-times"></i></button>
                    </span>
                `;
                cartItemsList.appendChild(li);
            });
            finalizeSaleBtn.disabled = false;
            cancelAllItemsBtn.disabled = false;
        }
        calcularTotaisVenda();
    }

    function removerItemDoCarrinho(index) {
        showCustomConfirm('Confirmar Remoção', 'Tem certeza que deseja remover este item do carrinho?')
            .then(confirmRemoval => {
                if (confirmRemoval) {
                    carrinho.splice(index, 1);
                    atualizarCarrinhoDisplay();
                    showCustomPopup('Sucesso', 'Item removido do carrinho!', 'success');
                }
            });
    }

    async function cancelarTodosItens() {
        const confirmCancel = await showCustomConfirm('Confirmação', 'Tem certeza que deseja cancelar todos os itens da venda atual?');
        if (confirmCancel) {
            carrinho = [];
            atualizarCarrinhoDisplay();
            resetItemInputArea();
            showCustomPopup('Sucesso', 'Todos os itens da venda foram cancelados.', 'success');
        }
    }

    function calcularTotaisVenda() {
        let totalVolumes = 0;
        let subtotalVenda = 0;
        carrinho.forEach(item => {
            totalVolumes += item.quantidadeVendidaNoCarrinho;
            subtotalVenda += item.totalItem;
        });
        totalVolumesDisplay.textContent = totalVolumes;
        let totalFinalVenda = subtotalVenda;
        if (aplicarDescontoCheckbox.checked) {
            valorDescontoGlobalInput.classList.remove('hidden');
            const valorDesconto = parseFloat(valorDescontoGlobalInput.value) || 0;
            if (!isNaN(valorDesconto) && valorDesconto >= 0) {
                totalFinalVenda = Math.max(0, subtotalVenda - valorDesconto);
            }
        } else {
            valorDescontoGlobalInput.classList.add('hidden');
            valorDescontoGlobalInput.value = '';
        }
        const novoValor = `R$ ${totalFinalVenda.toFixed(2)}`;
        if (totalSaleDisplay.textContent !== novoValor) {
            totalSaleDisplay.textContent = novoValor;
        } else {
            totalSaleDisplay.textContent = '';
            requestAnimationFrame(() => {
                totalSaleDisplay.textContent = novoValor;
            });
        }
    }

async function openSaleReceiptHtml(saleData) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orçamento ${saleData.orderNumber}</title>
  <style>
    :root {
      --text-color: #333;
      --border-color: #000;
    }

    body {
      font-family: "Courier New", Courier, monospace;
      margin: 0;
      padding: 0;
      background: #f8f8f8;
      color: var(--text-color);
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      margin: 20px auto;
      background: white;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
      box-sizing: border-box;
    }

    /* Tipografia */
    h1, h2, h3, h4, h5, h6 {
      text-align: center;
      margin-top: 0;
      margin-bottom: 10px;
    }

    h2 {
      color: var(--text-color);
      margin-bottom: 5px;
    }

    h3 {
      font-size: 1.2em;
      margin-top: 20px;
      margin-bottom: 15px;
    }

    h4 {
      font-size: 1.1em;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    p {
      margin: 3px 0;
    }

    /* Tabelas */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 15px;
    }

    table th,
    table td {
      padding: 6px;
      text-align: left;
    }

    .bordered th,
    .bordered td {
      border: 1px solid var(--border-color);
    }

    /* Layout */
    .center {
      text-align: center;
    }

    .right {
      text-align: right;
    }

    .spaced-section {
      margin-top: 25px;
      margin-bottom: 25px;
    }

    hr.dashed {
      border: none;
      border-top: 1px dashed var(--border-color);
      margin: 40px 0;
    }

    /* Nota Promissória */
    .promissory {
      font-size: 13px;
      line-height: 1.6;
    }

    .promissory p {
      margin-bottom: 8px;
    }

    /* Utility Classes */
    .bold {
      font-weight: bold;
    }

    @media print {
      body {
        background: none;
      }
      .page {
        margin: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <h2>AGROPECUARIA OURO BRANCO FILIAL</h2> [cite: 2]
      <p>RUA PRIMEIRO DE MAIO, 120 - PINHALZINHO DOS GOES</p> [cite: 3, 4]
      <p>Ouro Fino - MG - CEP: 37570-000</p> [cite: 8, 10, 11]
      <p>Telefone: (35-) 344-2-1101 - Fax: (35-) 344-2-1101</p> [cite: 4, 12]
      <p>CNPJ: 02.533.142/0002-20 - IE: 0917415980151</p> [cite: 4, 9]
    </header>

    <h3 class="center spaced-section">Orçamento a Clientes</h3> [cite: 5]

    <section class="spaced-section">
      <table>
        <tr>
          <td><span class="bold">Pedido nº:</span> 585539</td> [cite: 28]
          <td class="right"><span class="bold">Data:</span> 10/06/2025</td> [cite: 18, 29]
        </tr>
      </table>

      <table>
        <tr>
          <td><span class="bold">Código:</span> 4918/4978</td> [cite: 19]
          <td><span class="bold">Cliente:</span> GABRIEL MAIA TELES</td> [cite: 6]
        </tr>
        <tr>
          <td colspan="2"><span class="bold">Endereço:</span> SITIO SÃO MARCOS CORGO DA ONÇA</td> [cite: 7]
        </tr>
        <tr>
          <td><span class="bold">Cidade:</span> Inconfidentes</td> [cite: 17]
          <td><span class="bold">Estado:</span> MG</td> [cite: 19]
        </tr>
        <tr>
          <td><span class="bold">CEP:</span> 37576000</td> [cite: 23]
          <td><span class="bold">Telefone:</span> (359) 984-28731</td> [cite: 14]
        </tr>
        <tr>
          <td colspan="2"><span class="bold">CPF/CNPJ:</span> 132.066.126-24</td> [cite: 15]
        </tr>
      </table>
    </section>

    <section class="spaced-section">
      <h4>Itens</h4>
      <table class="bordered">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantidade</th>
            <th>UN</th>
            <th>Código</th>
            <th>Descrição</th>
            <th class="right">Preço Unit.</th>
            <th class="right">Total (R$)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td> 
            <td>150,00</td> 
            <td>UN</td> 
            <td>12.671</td> 
            <td>TIJOLO COMUM</td> 
            <td class="right">0,80000</td> 
            <td class="right">120,00</td> 
          </tr>
          <tr>
            <td colspan="6" class="right bold">Total</td> 
            <td class="right bold">120,00</td> 
          </tr>
        </tbody>
      </table>

      <table>
        <tr>
          <td><span class="bold">Desc. Parciais:</span> R$ 0,00</td> 
          <td><span class="bold">Desc. Gerais:</span> R$ 0,00</td> 
          <td><span class="bold">Frete:</span> R$ 0,00</td> 
          <td class="right"><span class="bold">Total do Pedido:</span> R$ 120,00</td> 
        </tr>
      </table>
    </section>

    <section class="spaced-section">
      <h4>Condições de Pagamento</h4>
      <table class="bordered">
        <thead>
          <tr>
            <th>Percentual</th>
            <th>Vencimento</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td></td> [cite: 25]
            <td>10/07/2025</td> [cite: 25]
            <td>120,00</td> [cite: 25]
          </tr>
        </tbody>
      </table>
    </section>

    <p class="spaced-section"><span class="bold">Vendedor:</span> 6.460 THAISSA DE LIMA BENTO</p> [cite: 26, 27]

    <hr class="dashed">

    <footer class="promissory">
      <h3 class="center">NOTA PROMISSÓRIA</h3>
      <p><span class="bold">Pagarei</span> por esta única via de <span class="bold">NOTA PROMISSÓRIA</span>, em moeda corrente deste país, à ordem de <span class="bold">AGROPECUARIA OURO BRANCO FILIAL</span> [cite: 39], CNPJ <span class="bold">02533142000220</span> [cite: 42], a quantia de <span class="bold">R$ 120,00</span> [cite: 37, 38] (<em>cento e vinte reais</em>) [cite: 40], pagável em <span class="bold">Ouro Fino-MG</span> [cite: 43], no dia <span class="bold">10/07/2025</span> [cite: 34, 36].</p> [cite: 13, 41]

      <p><span class="bold">Emitente:</span> GABRIEL MAIA TELES</p> [cite: 35, 43]
      <p><span class="bold">CPF/CNPJ:</span> 13206612624</p> [cite: 35, 44, 45]
      <p><span class="bold">Endereço:</span> SITIO SÃO MARCOS, SITIO CORGO DA ONÇA, Inconfidentes-MG, CEP: 37576000</p> [cite: 21, 22, 23, 46]

      <p class="right" style="margin-top: 20px;">Inconfidentes-MG, 10 de junho de 2025</p> [cite: 51]

      <p class="center" style="margin-top: 60px;">_____________________________________________<br>Assinatura do Emitente</p>
    </footer>
  </div>
  <script>
    window.print();
  </script>
</body>
</html>
`;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
    } else {
        // Assume showCustomPopup is defined elsewhere in your code
        showCustomPopup('Erro', 'Não foi possível abrir a nova aba para o comprovante. Verifique se pop-ups estão bloqueados.', 'error');
    }
}

// Exemplo de como você chamaria a função com os dados
// Note: Você precisaria criar um objeto saleData com todas as propriedades necessárias.
/*
const saleDataExample = {
    orderNumber: "585539",
    companyName: "AGROPECUARIA OURO BRANCO FILIAL",
    companyPhone: "(35-) 344-2-1101",
    companyFax: "(35-) 344-2-1101",
    companyCnpj: "02.533.142/0002-20",
    ieNumber: "0917415980151",
    saleDate: "10/06/2025",
    clientCode: "4918/4978",
    clientName: "GABRIEL MAIA TELES",
    clientAddress: "SITIO SÃO MARCOS CORGO DA ONÇA",
    clientCity: "Inconfidentes",
    clientUf: "MG",
    clientCep: "37576000",
    clientPhone: "(359) 984-28731",
    clientId: "132.066.126-24",
    itemsHtml: `
        <tr>
            <td>1</td>
            <td>150,00</td>
            <td>UN</td>
            <td>12.671</td>
            <td>TIJOLO COMUM</td>
            <td class="right">0,80000</td>
            <td class="right">120,00</td>
        </tr>
    `,
    discountValue: "0,00",
    freightValue: "0,00",
    totalFinal: "120,00",
    paymentHtml: `
        <tr>
            <td></td>
            <td>10/07/2025</td>
            <td>120,00</td>
        </tr>
    `,
    sellerCode: "6.460",
    sellerName: "THAISSA DE LIMA BENTO",
    totalExtenso: "cento e vinte reais",
    paymentCity: "Ouro Fino",
    paymentState: "MG",
    paymentDueDate: "10/07/2025"
};

openSaleReceiptHtml(saleDataExample);
*/
    async function finalizarVenda() {
        if (carrinho.length === 0) {
            showCustomPopup('Erro', 'Não há itens no carrinho para finalizar a venda.', 'error');
            return;
        }
        const confirmFinalize = await showCustomConfirm('Confirmação', 'Confirmar finalização da venda?');
        if (confirmFinalize) {
            try {
                let totalDaVendaText = totalSaleDisplay.textContent;
                let totalDaVenda = parseFloat(totalDaVendaText.replace('R$ ', '').replace(',', '.'));

                let valorDescontoAplicado = aplicarDescontoCheckbox.checked ? (parseFloat(valorDescontoGlobalInput.value) || 0) : 0;

                let itensVendidosParaTransacao = [];
                let subtotalBruto = 0;

                for (const itemCarrinho of carrinho) {
                    const produtoEstoque = produtos.find(p => p.id === itemCarrinho.id);
                    
                    if (!produtoEstoque || produtoEstoque.quantidade < itemCarrinho.quantidadeVendidaNoCarrinho) {
                        throw new Error(`Estoque insuficiente para ${itemCarrinho.nomeProduto}. Disponível: ${produtoEstoque ? produtoEstoque.quantidade : 0}`);
                    }

                    itensVendidosParaTransacao.push({
                        produtoId: itemCarrinho.id,
                        codProduto: itemCarrinho.codProduto,
                        nomeProduto: itemCarrinho.nomeProduto,
                        quantidadeVendida: itemCarrinho.quantidadeVendidaNoCarrinho,
                        precoUnitarioOriginal: itemCarrinho.precoUnitarioOriginal,
                        precoUnitarioVenda: itemCarrinho.precoUnitario,
                        totalItem: itemCarrinho.totalItem
                    });
                    subtotalBruto += itemCarrinho.totalItem;
                }

                const novaTransacaoData = {
                    tipo: 'entrada',
                    descricao: `Venda de múltiplos itens`,
                    valor: totalDaVenda,
                    data: new Date().toISOString().split('T')[0],
                    clientId: selectedClient ? selectedClient.id : null,
                    detalhesVenda: {
                        totalBruto: subtotalBruto.toFixed(2),
                        valorDesconto: valorDescontoAplicado.toFixed(2),
                        totalFinal: totalDaVenda.toFixed(2),
                        itens: itensVendidosParaTransacao
                    }
                };

                const transactionResult = await fazerRequisicaoApi('/api/transacoes', 'POST', novaTransacaoData);
                
                await carregarProdutos(); 

                const saleDataForHtml = { // Renomeado para clareza
                    orderNumber: transactionResult.id || ('VENDA-' + new Date().getTime()),
                    saleDate: new Date().toLocaleDateString('pt-BR'),
                    clientName: selectedClient ? selectedClient.name : 'Cliente Não Identificado',
                    clientAddress: selectedClient ? selectedClient.address : 'N/A',
                    clientCep: 'N/A', // Preencha com dados reais se tiver
                    clientCity: 'N/A', // Preencha com dados reais se tiver
                    clientUf: 'N/A',   // Preencha com dados reais se tiver
                    clientPhone: selectedClient ? formatPhone(selectedClient.phone) : 'N/A',
                    clientId: selectedClient ? selectedClient.id : 'N/A',
                    totalVolumes: totalVolumesDisplay.textContent,
                    totalBruto: subtotalBruto.toFixed(2),
                    discountValue: valorDescontoAplicado.toFixed(2),
                    totalFinal: totalDaVenda.toFixed(2),
                    paymentConditions: 'A vista', // Adapte conforme seu sistema
                    sellerName: 'Vendedor Padrão', // Adapte para o usuário logado
                    companyCnpj: '00.000.000/0001-00', // Preencher com seus dados
                    companyPhone: '(00)0000-0000',
                    companyFax: '(00)0000-0000',
                    currentYear: new Date().getFullYear(),
                    itemsHtml: itensVendidosParaTransacao.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.codProduto}</td>
                            <td>${item.nomeProduto}</td>
                            <td>${item.quantidadeVendida}</td>
                            <td>R$ ${parseFloat(item.precoUnitarioVenda).toFixed(2)}</td>
                            <td>R$ ${parseFloat(item.totalItem).toFixed(2)}</td>
                        </tr>
                    `).join('')
                };

                // Agora chamamos a função para abrir a nova aba HTML
                openSaleReceiptHtml(saleDataForHtml);

                showCustomPopup('Sucesso', 'Venda finalizada com sucesso e comprovante aberto em nova aba!', 'success');
                
                resetVendaCompleta();
            } catch (error) {
                console.error('Erro ao finalizar venda:', error);
                showCustomPopup('Erro', error.message || 'Não foi possível finalizar a venda.', 'error');
            }
        }
    }

    function resetVendaCompleta() {
        carrinho = [];
        atualizarCarrinhoDisplay();
        resetItemInputArea();
        aplicarDescontoCheckbox.checked = false;
        valorDescontoGlobalInput.classList.add('hidden');
        valorDescontoGlobalInput.value = '';
        searchProdutoInput.value = '';
        productNameDisplay.textContent = 'Produto Selecionado';
        
        exibirClienteSelecionado(null);
        searchClientInput.value = '';
        clientSearchResultsDiv.classList.add('hidden');

        carregarProdutos();
        carregarClientes();
    }

    // ==== Listeners de Eventos ====
    searchProdutoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            pesquisarProduto();
        }
    });
    findProductBtn.addEventListener('click', pesquisarProduto);

    quantidadeItemInput.addEventListener('input', atualizarValorTotalItem);
    valorUnitarioItemInput.addEventListener('input', atualizarValorTotalItem);
    addItemToCartBtn.addEventListener('click', adicionarItemAoCarrinho);

    cartItemsList.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.btn-remove-item');
        if (removeBtn) {
            const indexToRemove = parseInt(removeBtn.dataset.index);
            removerItemDoCarrinho(indexToRemove);
        }
    });

    aplicarDescontoCheckbox.addEventListener('change', calcularTotaisVenda);
    valorDescontoGlobalInput.addEventListener('input', calcularTotaisVenda);

    finalizeSaleBtn.addEventListener('click', finalizarVenda);
    cancelAllItemsBtn.addEventListener('click', cancelarTodosItens);
    
    searchClientInput.addEventListener('input', pesquisarClienteAoDigitar);
    findClientBtn.addEventListener('click', () => {
        pesquisarClienteAoDigitar(); 
        if (searchClientInput.value.trim().length === 0) {
            showCustomPopup('Alerta', 'Digite algo para buscar um cliente.', 'warning');
        }
    });
    removeClientBtn.addEventListener('click', removerClienteSelecionado);

    document.addEventListener('click', (e) => {
        if (!clientSearchResultsDiv.contains(e.target) && e.target !== searchClientInput && e.target !== findClientBtn) {
            clientSearchResultsDiv.classList.add('hidden');
        }
    });

    // ==== Inicialização ====
    document.addEventListener('DOMContentLoaded', () => {
        carregarProdutos();
        carregarClientes();
    });

    // ==== Funções de Formatação (helpers) ====
    function formatCpf(cpf) { /* ... */ return cpf; }
    function formatPhone(phone) {
        if (!phone) return '';
        const cleaned = ('' + phone).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);
        if (match) {
            return `(${match[1]})${match[2]}-${match[3]}`;
        }
        return phone;
    }
}