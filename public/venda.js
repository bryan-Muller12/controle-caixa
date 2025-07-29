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

    // --- NOVOS ELEMENTOS DO DOM PARA CLIENTE ---
    const searchClientInput = document.getElementById('search-client-input');
    const findClientBtn = document.getElementById('find-client-btn');
    const selectedClientDisplay = document.getElementById('selected-client-display');
    const selectedClientName = document.getElementById('selected-client-name');
    const selectedClientCpf = document.getElementById('selected-client-cpf');
    const removeClientBtn = document.getElementById('remove-client-btn'); // Botão para remover cliente selecionado
    // NOVO: Elementos para os resultados da busca de clientes
    const clientSearchResultsDiv = document.getElementById('client-search-results');
    const clientResultsList = document.getElementById('client-results-list');

    // --- ESTADO DA APLICAÇÃO ---
    let produtos = []; // Produtos carregados do banco de dados
    let carrinho = [];
    let allClients = []; // Todos os clientes carregados do banco de dados
    let selectedClient = null; // Cliente selecionado para a venda

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

    // Carregar clientes do backend
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

    // Função para exibir detalhes do cliente selecionado
    function exibirClienteSelecionado(client) {
        selectedClient = client;
        if (client) {
            selectedClientName.textContent = client.name;
            // O CPF_hash não deve ser exibido diretamente por questões de segurança.
            // Se precisar exibir, pode ser o ID ou um identificador não sensível.
            // Para este caso, vamos manter o ID como CPF/ID para fins de exemplo,
            // ou pode ser o telefone formatado se for um dado público.
            selectedClientCpf.textContent = `ID: ${client.id}`; 
            selectedClientDisplay.classList.remove('hidden');
            removeClientBtn.classList.remove('hidden');
            clientSearchResultsDiv.classList.add('hidden'); // Esconde a lista de resultados após a seleção
        } else {
            selectedClientName.textContent = 'Nenhum Cliente Selecionado';
            selectedClientCpf.textContent = '';
            selectedClientDisplay.classList.add('hidden');
            removeClientBtn.classList.add('hidden');
        }
    }

    // NOVO: Função para renderizar a lista de clientes pesquisados
    function renderClientSearchResults(results) {
        clientResultsList.innerHTML = ''; // Limpa resultados anteriores
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
                    searchClientInput.value = client.name; // Preenche o input com o nome do cliente selecionado
                    clientSearchResultsDiv.classList.add('hidden'); // Esconde a lista
                });
                clientResultsList.appendChild(li);
            });
            clientSearchResultsDiv.classList.remove('hidden'); // Mostra a div de resultados
        } else {
            clientSearchResultsDiv.classList.add('hidden'); // Esconde se não houver resultados
        }
    }

    // Modificado: Função para pesquisar e exibir clientes, agora com sugestões
    function pesquisarClienteAoDigitar() {
        const termoBusca = searchClientInput.value.toLowerCase().trim();
        
        if (termoBusca.length >= 2) { // Começa a sugerir a partir de 2 caracteres
            const filteredClients = allClients.filter(c =>
                c.name.toLowerCase().includes(termoBusca) ||
                (c.phone && c.phone.replace(/\D/g, '').includes(termoBusca.replace(/\D/g, ''))) || // Busca por telefone puro
                (c.address && c.address.toLowerCase().includes(termoBusca))
            );
            renderClientSearchResults(filteredClients);
        } else {
            clientSearchResultsDiv.classList.add('hidden'); // Esconde a lista se o termo for muito curto
            exibirClienteSelecionado(null); // Limpa o cliente selecionado se o campo for limpo
        }
    }

    // Função para remover o cliente selecionado
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

                // Cria o objeto da transação para enviar ao backend
                const novaTransacaoData = {
                    tipo: 'entrada', // Tipo de transação para vendas
                    descricao: `Venda de múltiplos itens`,
                    valor: totalDaVenda, // Valor final da venda
                    data: new Date().toISOString().split('T')[0], // Data atual no formato YYYY-MM-DD
                    clientId: selectedClient ? selectedClient.id : null, // ID do cliente ou null
                    detalhesVenda: {
                        totalBruto: subtotalBruto.toFixed(2),
                        valorDesconto: valorDescontoAplicado.toFixed(2),
                        totalFinal: totalDaVenda.toFixed(2),
                        itens: itensVendidosParaTransacao
                    }
                };

                // Envia a transação para a API de transações
                await fazerRequisicaoApi('/api/transacoes', 'POST', novaTransacaoData);
                
                // Recarrega os produtos para refletir as atualizações de estoque feitas na API de transações
                await carregarProdutos(); 

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
        
        exibirClienteSelecionado(null); // Reseta a exibição do cliente
        searchClientInput.value = ''; // Limpa o campo de busca de cliente
        clientSearchResultsDiv.classList.add('hidden'); // Garante que a lista de resultados esteja escondida

        carregarProdutos(); // Recarrega os produtos após o reset da venda para garantir estoque atualizado
        carregarClientes(); // Recarrega os clientes para garantir dados atualizados
    }

    searchProdutoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            pesquisarProduto();
        }
    });
    findProductBtn.addEventListener('click', pesquisarProduto);

    quantidadeItemInput.addEventListener('input', atualizarValorTotalItem);
    valorUnitarioItemInput.addEventListener('input', atualizarValorTotalItem); // <-- CORRIGIDO AQUI
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
    
    // --- NOVOS LISTENERS PARA CLIENTES ---
    // NOVO: Adiciona listener para o evento 'input' para o campo de busca de cliente
    searchClientInput.addEventListener('input', pesquisarClienteAoDigitar);
    // O botão de busca agora apenas forçará a busca se o input não estiver vazio
    findClientBtn.addEventListener('click', () => {
        if (searchClientInput.value.trim().length > 0) {
            pesquisarClienteAoDigitar();
        } else {
            showCustomPopup('Alerta', 'Digite algo para buscar um cliente.', 'warning');
        }
    });
    removeClientBtn.addEventListener('click', removerClienteSelecionado);

    // NOVO: Esconde a lista de resultados de busca de cliente se o usuário clicar fora dela
    document.addEventListener('click', (e) => {
        if (!clientSearchResultsDiv.contains(e.target) && e.target !== searchClientInput && e.target !== findClientBtn) {
            clientSearchResultsDiv.classList.add('hidden');
        }
    });


    document.addEventListener('DOMContentLoaded', () => {
        carregarProdutos();
        carregarClientes(); // Carrega clientes ao iniciar a página
    });

    // Helper para formatar CPF, similar ao clients.js
    function formatCpf(cpf) {
        if (!cpf) return '';
        const cleaned = ('' + cpf).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
        if (match) {
            return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
        }
        return cpf;
    }

    // Helper para formatar telefone, similar ao clients.js
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