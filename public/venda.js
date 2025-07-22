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
    let clientesCadastrados = []; // Para armazenar a lista de todos os clientes registrados
    let clienteSelecionado = null; // Armazena o objeto cliente selecionado
    let ultimaVendaId = null; // Para armazenar o ID da última venda finalizada para o PDF


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

        try {
            const response = await fetch(url, options);
            const responseData = await response.json().catch(() => null); 
            
            if (!response.ok) {
                const errorMsg = responseData?.error || `Erro na requisição ${method} ${url}: Status ${response.status}`;
                console.error(`Erro na fazerRequisicaoApi para ${url}:`, errorMsg, responseData); // LOG de erro na requisição
                throw new Error(errorMsg);
            }
            console.log(`Sucesso na fazerRequisicaoApi para ${url}:`, responseData); // LOG de sucesso
            return responseData;
        } catch (apiError) {
            console.error(`Erro inesperado ao fazer requisição API para ${url}:`, apiError); // LOG de erro de conexão/inesperado
            throw apiError; // Propaga o erro para quem chamou
        }
    }

    // Carregar produtos do backend
    async function carregarProdutos() {
        try {
            produtos = await fazerRequisicaoApi('/api/produtos', 'GET');
            if (typeof atualizarNotificacoesComuns === 'function') {
                atualizarNotificacoesComuns(produtos); 
            }
        } catch (error) {
            console.error('Erro ao carregar produtos na tela de venda:', error);
            showCustomPopup('Erro', 'Não foi possível carregar os produtos do servidor.', 'error');
        }
    }

    // Carregar clientes do backend
    async function carregarClientesCadastrados() {
        try {
            clientesCadastrados = await fazerRequisicaoApi('/api/clientes', 'GET');
        } catch (error) {
            console.error('Erro ao carregar clientes cadastrados na tela de venda:', error);
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
        console.log('--- Início da função finalizarVenda ---'); // LOG
        if (carrinho.length === 0) {
            showCustomPopup('Erro', 'Não há itens no carrinho para finalizar a venda.', 'error');
            console.log('Carrinho vazio. Finalizar venda abortada.'); // LOG
            return;
        }
        console.log('Carrinho tem itens:', carrinho.length); // LOG

        const confirmFinalize = await showCustomConfirm('Confirmação', 'Confirmar finalização da venda?');
        console.log('Confirmação do usuário:', confirmFinalize); // LOG
        
        if (confirmFinalize) {
            try {
                let totalDaVendaText = totalSaleDisplay.textContent;
                let totalDaVenda = parseFloat(totalDaVendaText.replace('R$ ', '').replace(',', '.'));
                console.log('Total da Venda calculado:', totalDaVenda); // LOG

                let valorDescontoAplicado = aplicarDescontoCheckbox.checked ? (parseFloat(valorDescontoGlobalInput.value) || 0) : 0;
                console.log('Valor do Desconto aplicado:', valorDescontoAplicado); // LOG

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
                console.log('Itens do carrinho preparados:', itensVendidosParaTransacao); // LOG

                let clienteIdParaVenda = null;
                if (vincularClienteCheckbox.checked && clienteSelecionado) {
                    clienteIdParaVenda = clienteSelecionado.id;
                }
                console.log('ID do cliente para a venda:', clienteIdParaVenda); // LOG

                const novaTransacaoData = {
                    tipo: 'entrada',
                    descricao: `Venda de múltiplos itens`,
                    valor: totalDaVenda,
                    data: new Date().toISOString().split('T')[0],
                    detalhesVenda: {
                        totalBruto: subtotalBruto.toFixed(2),
                        valorDesconto: valorDescontoAplicado.toFixed(2),
                        totalFinal: totalDaVenda.toFixed(2),
                        itens: itensVendidosParaTransacao
                    },
                    cliente_id: clienteIdParaVenda
                };
                console.log('Dados da transação a serem enviados:', novaTransacaoData); // LOG

                const responseTransacao = await fazerRequisicaoApi('/api/transacoes', 'POST', novaTransacaoData);
                console.log('Resposta da API de transações:', responseTransacao); // LOG
                
                let idDaVendaParaGerarPdf = null; // Declare aqui fora para o escopo
                if (responseTransacao && responseTransacao.id) {
                    ultimaVendaId = responseTransacao.id; // Ainda atualiza a variável global
                    idDaVendaParaGerarPdf = responseTransacao.id; // CAPTURA O ID AQUI PARA O BOTÃO DO POPUP
                    console.log('idDaVendaParaGerarPdf capturado como:', idDaVendaParaGerarPdf); // LOG
                } else {
                    console.log('ID da transação não recebido na resposta.', responseTransacao); // LOG
                }
                
                await carregarProdutos(); 
                await carregarClientesCadastrados();

                showCustomPopup(
                    'Sucesso',
                    'Venda finalizada com sucesso!',
                    'success',
                    [
                        {
                            id: 'generate-promissory-note-btn',
                            text: 'Gerar Orçamento PDF',
                            className: 'btn-secondary',
                            onClick: async () => {
                                console.log('Botão Gerar Orçamento PDF clicado.'); // LOG
                                console.log('ID da venda no clique do botão (capturado):', idDaVendaParaGerarPdf); // USE A VARIÁVEL CAPTURADA
                                if (!idDaVendaParaGerarPdf) { // VERIFICA A VARIÁVEL CAPTURADA
                                    showCustomPopup('Erro', 'ID da venda não disponível para gerar o orçamento.', 'error');
                                    console.error('Erro: idDaVendaParaGerarPdf é nula no clique do botão.'); // LOG
                                    return;
                                }

                                try {
                                    showCustomPopup('Informação', 'Gerando PDF, aguarde...', 'info');
                                    hideCustomPopup(); 

                                    const response = await fetch(`/api/gerar_orcamento?venda_id=${idDaVendaParaGerarPdf}`, { // USE A VARIÁVEL CAPTURADA
                                        method: 'GET',
                                        headers: {
                                            'Content-Type': 'application/pdf',
                                        },
                                    });

                                    if (!response.ok) {
                                        const errorData = await response.json().catch(() => null);
                                        throw new Error(errorData?.error || `Erro ao baixar PDF: Status ${response.status}`);
                                    }

                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.style.display = 'none';
                                    a.href = url;
                                    a.download = `orcamento-${idDaVendaParaGerarPdf}.pdf`; // USE A VARIÁVEL CAPTURADA
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    showCustomPopup('Sucesso', 'PDF gerado e download iniciado!', 'success'); 
                                } catch (error) {
                                    console.error('Erro ao gerar ou baixar PDF:', error);
                                    showCustomPopup('Erro', error.message || 'Não foi possível gerar o PDF do orçamento.', 'error');
                                }
                            }
                        }
                    ]
                );
                
                resetVendaCompleta();
                console.log('--- Fim da função finalizarVenda (sucesso) ---'); // LOG
            } catch (error) {
                console.error('Erro na finalização da venda:', error); // LOG de erro
                showCustomPopup('Erro', error.message || 'Não foi possível finalizar a venda.', 'error');
                console.log('--- Fim da função finalizarVenda (erro) ---'); // LOG
            }
        } else {
            console.log('Finalização de venda cancelada pelo usuário.'); // LOG
        }
    }

    function resetVendaCompleta() {
        console.log('Iniciando resetVendaCompleta...'); // LOG
        carrinho = [];
        atualizarCarrinhoDisplay();
        resetItemInputArea();
        aplicarDescontoCheckbox.checked = false;
        valorDescontoGlobalInput.classList.add('hidden');
        valorDescontoGlobalInput.value = '';
        searchProdutoInput.value = '';
        productNameDisplay.textContent = 'Produto Selecionado';
        
        // Limpa seleção de cliente e oculta a seção de busca
        clienteSelecionado = null;
        selectedClientId.value = '';
        selectedClientName.textContent = '';
        selectedClientDisplay.classList.add('hidden');
        searchClienteInput.value = '';
        clienteSearchResults.classList.add('hidden');
        vincularClienteCheckbox.checked = false;
        clientSearchSection.classList.add('hidden'); // Garante que comece escondido
        ultimaVendaId = null; // Limpa o ID da última venda (o que é ok, pois o ID para o PDF está capturado)
        console.log('ultimaVendaId resetada para:', ultimaVendaId); // LOG


        carregarProdutos(); // Recarrega os produtos após o reset da venda para garantir estoque atualizado
        console.log('resetVendaCompleta concluído.'); // LOG
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
    vincularClienteCheckbox.addEventListener('change', () => {
        clientSearchSection.classList.toggle('hidden', !vincularClienteCheckbox.checked);
        if (!vincularClienteCheckbox.checked) {
            // Limpa a seleção ao desmarcar o checkbox
            clienteSelecionado = null;
            selectedClientId.value = '';
            selectedClientName.textContent = '';
            selectedClientDisplay.classList.add('hidden');
            searchClienteInput.value = '';
            clienteSearchResults.classList.add('hidden');
            searchClienteInput.style.display = 'block'; // Garante que o input de busca apareça se desmarcar
        }
    });

    searchClienteInput.addEventListener('input', () => {
        const searchTerm = searchClienteInput.value.toLowerCase();
        clienteSearchResults.innerHTML = ''; // Limpa resultados anteriores

        if (searchTerm.length > 1) { // Começa a pesquisar após 2 caracteres
            const filteredClients = clientesCadastrados.filter(c => 
                c.nome.toLowerCase().includes(searchTerm) || 
                (c.cpf && c.cpf.toLowerCase().includes(searchTerm)) 
            );

            if (filteredClients.length > 0) {
                // Posiciona a lista de resultados abaixo do input
                const inputRect = searchClienteInput.getBoundingClientRect();
                const clientSearchSectionRect = clientSearchSection.getBoundingClientRect();

                clienteSearchResults.style.top = `${inputRect.height + 5}px`; // 5px de margem
                clienteSearchResults.style.left = `0`; // Alinha à esquerda da seção pai
                clienteSearchResults.style.width = `${inputRect.width}px`;


                filteredClients.forEach(client => {
                    const li = document.createElement('li');
                    li.textContent = `${client.nome} - ${client.endereco}`;
                    li.dataset.clientId = client.id;
                    li.dataset.clientName = client.nome;
                    li.classList.add('search-result-item');
                    // Estilo básico para os itens da lista de pesquisa
                    li.style.padding = '8px';
                    li.style.cursor = 'pointer';
                    li.style.borderBottom = '1px solid var(--border-color-dark)';
                    li.onmouseover = () => li.style.backgroundColor = 'var(--primary-alternative)';
                    li.onmouseout = () => li.style.backgroundColor = 'var(--input-bg)';

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
            searchClienteInput.style.display = 'none'; // Esconde o input de busca ao selecionar
        }
    });

    clearSelectedClientBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clienteSelecionado = null;
        selectedClientId.value = '';
        selectedClientName.textContent = '';
        selectedClientDisplay.classList.add('hidden');
        searchClienteInput.value = ''; // Garante que o campo de pesquisa seja limpo
        clienteSearchResults.classList.add('hidden');
        searchClienteInput.style.display = 'block'; // Mostra o input de busca novamente
    });

    document.addEventListener('click', (e) => {
        if (!clientSearchSection.contains(e.target) && e.target !== vincularClienteCheckbox) {
            clienteSearchResults.classList.add('hidden');
        }
    });

    document.addEventListener('DOMContentLoaded', async () => {
        console.log('DOMContentLoaded disparado. Carregando produtos e clientes...'); // LOG
        await carregarProdutos();
        await carregarClientesCadastrados();
        console.log('Produtos e clientes carregados.'); // LOG
    });
}