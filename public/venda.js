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
  <title>Orçamento ${saleData.orderNumber}</title>
  <style>
    body {
      font-family: "Courier New", Courier, monospace;
      margin: 0;
      padding: 0;
      background: white;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      margin: auto;
      background: white;
      box-sizing: border-box;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .center {
      text-align: center;
    }

    .bordered td, .bordered th {
      border: 1px solid #000;
      padding: 4px;
    }

    .spaced {
      margin: 20px 0;
    }

    hr.dashed {
      border: none;
      border-top: 1px dashed #000;
      margin: 30px 0;
    }

    .promissory {
      font-size: 13px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="center">
      <h2>AGROPECUÁRIA OURO BRANCO FILIAL</h2>
      <p>RUA PRIMEIRO DE MAIO, 120 - PINHALZINHO DOS GOES</p>
      <p>Ouro Fino - MG - CEP: 37570-000</p>
      <p>Telefone: ${saleData.companyPhone} - Fax: ${saleData.companyFax}</p>
      <p>CNPJ: ${saleData.companyCnpj} - IE: ${saleData.ieNumber}</p>
    </div>

    <h3 class="center spaced">ORÇAMENTO A CLIENTES</h3>

    <table class="spaced">
      <tr>
        <td><strong>Pedido nº:</strong> ${saleData.orderNumber}</td>
        <td><strong>Data:</strong> ${saleData.saleDate}</td>
      </tr>
    </table>

    <table>
      <tr>
        <td><strong>Código:</strong> ${saleData.clientCode}</td>
        <td><strong>Cliente:</strong> ${saleData.clientName}</td>
      </tr>
      <tr>
        <td colspan="2"><strong>Endereço:</strong> ${saleData.clientAddress}</td>
      </tr>
      <tr>
        <td><strong>Cidade:</strong> ${saleData.clientCity}</td>
        <td><strong>Estado:</strong> ${saleData.clientUf}</td>
      </tr>
      <tr>
        <td><strong>CEP:</strong> ${saleData.clientCep}</td>
        <td><strong>Telefone:</strong> ${saleData.clientPhone}</td>
      </tr>
      <tr>
        <td colspan="2"><strong>CPF/CNPJ:</strong> ${saleData.clientId}</td>
      </tr>
    </table>

    <h4 class="spaced">Itens</h4>
    <table class="bordered">
      <thead>
        <tr>
          <th>Item</th>
          <th>Quantidade</th>
          <th>UN</th>
          <th>Código</th>
          <th>Descrição</th>
          <th>Preço Unit.</th>
          <th>Total (R$)</th>
        </tr>
      </thead>
      <tbody>
        ${saleData.itemsHtml}
      </tbody>
    </table>

    <table class="spaced">
      <tr>
        <td><strong>Desc. Parciais:</strong> R$ 0,00</td>
        <td><strong>Desc. Gerais:</strong> R$ ${saleData.discountValue}</td>
        <td><strong>Frete:</strong> R$ ${saleData.freightValue}</td>
        <td><strong>Total do Pedido:</strong> R$ ${saleData.totalFinal}</td>
      </tr>
    </table>

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
        ${saleData.paymentHtml}
      </tbody>
    </table>

    <p class="spaced"><strong>Vendedor:</strong> ${saleData.sellerCode} - ${saleData.sellerName}</p>

    <hr class="dashed">

    <div class="promissory">
      <h3 class="center">NOTA PROMISSÓRIA</h3>
      <p>Pagarei por esta única via de <strong>NOTA PROMISSÓRIA</strong>, em moeda corrente deste país, à ordem de <strong>${saleData.companyName}</strong>, CNPJ <strong>${saleData.companyCnpj}</strong>, a quantia de <strong>R$ ${saleData.totalFinal}</strong> (<em>${saleData.totalExtenso}</em>), pagável em <strong>${saleData.paymentCity} - ${saleData.paymentState}</strong>, no dia <strong>${saleData.paymentDueDate}</strong>.</p>

      <p><strong>Emitente:</strong> ${saleData.clientName}</p>
      <p><strong>CPF/CNPJ:</strong> ${saleData.clientId}</p>
      <p><strong>Endereço:</strong> ${saleData.clientAddress}, ${saleData.clientCity} - ${saleData.clientUf}, CEP: ${saleData.clientCep}</p>

      <p class="right" style="text-align: right;">${saleData.clientCity}, ${saleData.saleDate}</p>

      <p class="center" style="margin-top: 60px;">_____________________________________________<br>Assinatura do Emitente</p>
    </div>
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
        showCustomPopup('Erro', 'Não foi possível abrir a nova aba para o comprovante. Verifique se pop-ups estão bloqueados.', 'error');
    }
}

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