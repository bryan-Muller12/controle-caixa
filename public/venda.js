// venda.js
// Lógica específica da tela de Vendas

// Garante que o código só rode na página de venda
if (document.body.id === 'page-venda' || location.pathname.includes('venda.html')) {
    // --- ELEMENTOS DO DOM ---
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

    // NOVOS ELEMENTOS DO DOM PARA CLIENTES
    const vincularClienteCheckbox = document.getElementById('vincular-cliente');
    const clientSearchSection = document.getElementById('client-search-section');
    const searchClienteInput = document.getElementById('search-cliente-input');
    const clienteSearchResults = document.getElementById('cliente-search-results');
    const selectedClientDisplay = document.getElementById('selected-client-display');
    const selectedClientName = document.getElementById('selected-client-name');
    const selectedClientId = document.getElementById('selected-client-id');
    const clearSelectedClientBtn = document.getElementById('clear-selected-client');

    // --- ESTADO DA APLICAÇÃO ---
    let produtos = []; // Produtos carregados do banco de dados
    let carrinho = [];
    let clientesCadastrados = []; // Para armazenar uma lista de todos os clientes registrados
    let clienteSelecionado = null; // Armazena o objeto cliente selecionado

    // Função auxiliar para fazer requisições à API
    async function fazerRequisicaoApi(url, method, data = {}) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        if (method !== 'GET' && method !== 'HEAD') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        // Tenta ler JSON, mas permite que a resposta seja vazia (ex: 204 No Content)
        const responseData = await response.json().catch(() => null); 
        
        if (!response.ok) {
            throw new Error(responseData?.error || `Erro na requisição ${method} ${url}: Status ${response.status}`);
        }
        return responseData;
    }

    // Carregar produtos do backend
    async function carregarProdutos() {
        try {
            produtos = await fazerRequisicaoApi('/api/produtos', 'GET');
            atualizarNotificacoesComuns(); // Atualiza as notificações com base nos produtos carregados
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            showCustomPopup('Erro', 'Não foi possível carregar os produtos do servidor.', 'error');
        }
    }

    // NOVO: Carregar clientes do backend
    async function carregarClientesCadastrados() {
        try {
            clientesCadastrados = await fazerRequisicaoApi('/api/clientes', 'GET');
        } catch (error) {
            console.error('Erro ao carregar clientes cadastrados:', error);
            showCustomPopup('Atenção', 'Não foi possível carregar a lista de clientes para vinculação. Tente novamente mais tarde.', 'info');
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
                id: produtoEncontradoParaAdicionar.id, // ID do produto no banco
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
        carrinho.splice(index, 1);
        atualizarCarrinhoDisplay();
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

                // Prepara os itens para a transação e verifica estoque
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

                // Obtém o ID do cliente selecionado se vinculado
                const clienteIdParaVenda = clienteSelecionado ? clienteSelecionado.id : null;


                // Cria o objeto da transação para enviar ao backend
                const novaTransacaoData = {
                    tipo: 'entrada', // Tipo de transação para vendas
                    descricao: `Venda de múltiplos itens`,
                    valor: totalDaVenda, // Valor final da venda
                    data: new Date().toISOString().split('T')[0], // Data atual no formato YYYY-MM-DD
                    detalhesVenda: {
                        totalBruto: subtotalBruto.toFixed(2),
                        valorDesconto: valorDescontoAplicado.toFixed(2),
                        totalFinal: totalDaVenda.toFixed(2),
                        itens: itensVendidosParaTransacao
                    },
                    cliente_id: clienteIdParaVenda // Inclui o ID do cliente
                };

                // Envia a transação para a API de transações
                await fazerRequisicaoApi('/api/transacoes', 'POST', novaTransacaoData);
                
                // Recarrega os produtos para refletir as atualizações de estoque feitas na API de transações
                await carregarProdutos(); 
                await carregarClientesCadastrados(); // Também recarrega clientes

                showCustomPopup('Sucesso', 'Venda finalizada com sucesso!', 'success');
                
                resetVendaCompleta(); // Reseta a venda após sucesso
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
        
        // NOVO: Limpa seleção de cliente
        clienteSelecionado = null;
        selectedClientId.value = '';
        selectedClientName.textContent = '';
        selectedClientDisplay.classList.add('hidden');
        searchClienteInput.value = '';
        clienteSearchResults.classList.add('hidden');
        clientSearchSection.classList.add('hidden');
        vincularClienteCheckbox.checked = false;

        carregarProdutos(); // Recarrega os produtos após o reset da venda para garantir estoque atualizado
    }

    // --- EVENT LISTENERS ---
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

    // NOVOS EVENT LISTENERS PARA CLIENTES
    searchClienteInput.addEventListener('input', () => {
        const searchTerm = searchClienteInput.value.toLowerCase();
        clienteSearchResults.innerHTML = ''; // Limpa resultados anteriores

        if (searchTerm.length > 1) { // Começa a pesquisar após 2 caracteres
            const filteredClients = clientesCadastrados.filter(c => 
                c.nome.toLowerCase().includes(searchTerm)
            );

            if (filteredClients.length > 0) {
                filteredClients.forEach(client => {
                    const li = document.createElement('li');
                    li.textContent = `${client.nome} (${client.endereco})`;
                    li.dataset.clientId = client.id;
                    li.dataset.clientName = client.nome;
                    li.classList.add('search-result-item');
                    clienteSearchResults.appendChild(li);
                });
                clienteSearchResults.classList.remove('hidden');
            } else {
                clienteSearchResults.classList.add('hidden');
            }
        } else {
            clienteSearchResults.classList.add('hidden');
        }
    });

    clienteSearchResults.addEventListener('click', (e) => {
        const selectedItem = e.target.closest('.search-result-item');
        if (selectedItem) {
            const clientId = parseInt(selectedItem.dataset.clientId);
            const clientName = selectedItem.dataset.clientName;
            
            clienteSelecionado = clientesCadastrados.find(c => c.id === clientId);

            selectedClientId.value = clientId;
            selectedClientName.textContent = clientName;
            selectedClientDisplay.classList.remove('hidden');
            
            searchClienteInput.value = ''; // Limpa o campo de pesquisa
            clienteSearchResults.classList.add('hidden'); // Oculta os resultados da pesquisa
        }
    });

    clearSelectedClientBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clienteSelecionado = null;
        selectedClientId.value = '';
        selectedClientName.textContent = '';
        selectedClientDisplay.classList.add('hidden');
        searchClienteInput.value = ''; // Garante que o campo de pesquisa seja limpo
        clientSearchSection.classList.add('hidden'); // Oculta novamente a seção de pesquisa
        vincularClienteCheckbox.checked = false; // Desmarca a caixa de seleção principal
    });

    vincularClienteCheckbox.addEventListener('change', () => {
        if (vincularClienteCheckbox.checked) {
            clientSearchSection.classList.remove('hidden');
        } else {
            clientSearchSection.classList.add('hidden');
            // Limpa o cliente selecionado se a caixa de seleção for desmarcada
            clienteSelecionado = null;
            selectedClientId.value = '';
            selectedClientName.textContent = '';
            selectedClientDisplay.classList.add('hidden');
            searchClienteInput.value = '';
            clienteSearchResults.classList.add('hidden');
        }
    });

    // Oculta os resultados da pesquisa ao clicar fora
    document.addEventListener('click', (e) => {
        if (!clientSearchSection.contains(e.target) && e.target !== searchClienteInput && e.target !== vincularClienteCheckbox) {
            clienteSearchResults.classList.add('hidden');
        }
    });


    document.addEventListener('DOMContentLoaded', async () => {
        await carregarProdutos();
        await carregarClientesCadastrados(); // Carrega clientes quando a página carrega
    });
}