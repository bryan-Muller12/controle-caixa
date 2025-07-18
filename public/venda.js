// public/venda.js (Updated)

// Garante que o código só rode na página de venda
if (document.body.id === 'page-venda' || location.pathname.includes('venda.html')) {
    // --- ELEMENTOS DO DOM ---
    const searchProductInput = document.getElementById('search-product-input');
    const searchProductBtn = document.getElementById('search-product-btn');
    const productDetailsDiv = document.getElementById('product-details');
    const addProductToCartBtn = document.getElementById('add-product-to-cart-btn');
    const quantityInput = document.getElementById('quantity-input');
    const cartList = document.getElementById('cart-list');
    const totalSaleDisplay = document.getElementById('total-sale');
    const finalizeSaleBtn = document.getElementById('finalize-sale-btn');
    const resetSaleBtn = document.getElementById('reset-sale-btn');
    const applyDiscountBtn = document.getElementById('apply-discount-btn');
    const removeDiscountBtn = document.getElementById('remove-discount-btn');
    const valorDescontoGlobalInput = document.getElementById('valor-desconto-global');
    const aplicarDescontoCheckbox = document.getElementById('aplicar-desconto-checkbox');
    const descontoGlobalContainer = document.getElementById('desconto-global-container');
    const searchResultContainer = document.getElementById('search-result-container');


    // --- ESTADO DA APLICAÇÃO ---
    let produtos = []; // Array de produtos carregados (ainda do localStorage se não for API)
    let produtoEncontradoParaAdicionar = null;
    let carrinho = [];

    // Função auxiliar para fazer requisições à API
    // É importante que esta função seja consistente com a do common.js ou esteja disponível globalmente
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
        const responseData = await response.json().catch(() => null); 
        
        if (!response.ok) {
            throw new Error(responseData?.error || `Erro na requisição ${method} ${url}: Status ${response.status}`);
        }
        return responseData;
    }

    // Carrega produtos (assumindo que produtos ainda estão no localStorage para este arquivo,
    // se você também moveu produtos para a API, esta função precisará ser atualizada para buscar da API)
    async function carregarDados() {
        try {
            // Buscando produtos da API, assumindo que /api/produtos retorna todos os produtos
            produtos = await fazerRequisicaoApi('/api/produtos', 'GET');
            console.log('Produtos carregados da API:', produtos);
        } catch (error) {
            console.error('Erro ao carregar produtos da API:', error);
            // Fallback para localStorage se a API falhar ou se produtos ainda forem de lá
            produtos = JSON.parse(localStorage.getItem('produtos')) || [];
            console.warn('Produtos carregados do localStorage como fallback.');
            showCustomPopup('Erro', 'Não foi possível carregar os produtos do estoque. Verifique a conexão.', 'error');
        }
        atualizarNotificacoesComuns(produtos); // Passa produtos para as notificações
        resetVendaCompleta();
    }

    // A função salvarDados não é mais necessária para historicoTransacoes, apenas produtos se aplicável.
    // Se produtos são totalmente API-driven, esta função pode ser removida.
    function salvarDados() {
        localStorage.setItem('produtos', JSON.stringify(produtos));
    }

    function pesquisarProduto() {
        const searchTerm = searchProductInput.value.trim().toLowerCase();
        if (searchTerm.length < 2) {
            searchResultContainer.innerHTML = '<p>Digite pelo menos 2 caracteres para pesquisar.</p>';
            searchResultContainer.classList.remove('active');
            produtoEncontradoParaAdicionar = null;
            return;
        }

        const filteredProducts = produtos.filter(p =>
            p.nome.toLowerCase().includes(searchTerm) ||
            (p.cod_produto && p.cod_produto.toLowerCase().includes(searchTerm))
        );

        searchResultContainer.innerHTML = '';
        if (filteredProducts.length === 0) {
            searchResultContainer.innerHTML = '<p>Nenhum produto encontrado.</p>';
            searchResultContainer.classList.add('active');
            produtoEncontradoParaAdicionar = null;
            return;
        }

        searchResultContainer.classList.add('active');
        filteredProducts.forEach(product => {
            const resultItem = document.createElement('div');
            resultItem.classList.add('search-result-item');
            resultItem.innerHTML = `
                <span class="product-name">${product.nome}</span>
                <span class="product-code">(${product.cod_produto})</span>
                <span class="product-price">R$ ${product.preco_unitario.toFixed(2)}</span>
                <span class="product-stock">Estoque: ${product.quantidade}</span>
            `;
            resultItem.addEventListener('click', () => {
                exibirDetalhesProdutoEncontrado(product);
                searchResultContainer.classList.remove('active');
                searchProductInput.value = ''; // Limpa o campo de busca
            });
            searchResultContainer.appendChild(resultItem);
        });
    }

    function exibirDetalhesProdutoEncontrado(product) {
        produtoEncontradoParaAdicionar = product;
        productDetailsDiv.innerHTML = `
            <h3>${product.nome} (${product.cod_produto})</h3>
            <p>Preço Unitário: R$ ${product.preco_unitario.toFixed(2)}</p>
            <p>Estoque Disponível: ${product.quantidade}</p>
        `;
        productDetailsDiv.classList.add('active');
        addProductToCartBtn.style.display = 'block';
        quantityInput.value = 1;
        quantityInput.style.display = 'block';
    }

    function adicionarAoCarrinho() {
        if (!produtoEncontradoParaAdicionar) {
            showCustomPopup('Erro', 'Nenhum produto selecionado para adicionar ao carrinho.', 'error');
            return;
        }

        const quantidadeDesejada = parseInt(quantityInput.value);

        if (isNaN(quantidadeDesejada) || quantidadeDesejada <= 0) {
            showCustomPopup('Erro', 'Quantidade inválida.', 'error');
            return;
        }

        if (quantidadeDesejada > produtoEncontradoParaAdicionar.quantidade) {
            showCustomPopup('Erro', `Quantidade insuficiente em estoque. Disponível: ${produtoEncontradoParaAdicionar.quantidade}`, 'error');
            return;
        }

        const itemExistenteNoCarrinho = carrinho.find(item => item.id === produtoEncontradoParaAdicionar.id);

        if (itemExistenteNoCarrinho) {
            const novaQuantidadeTotal = itemExistenteNoCarrinho.quantidadeVendidaNoCarrinho + quantidadeDesejada;
            if (novaQuantidadeTotal > produtoEncontradoParaAdicionar.quantidade) {
                showCustomPopup('Erro', `Adicionar ${quantidadeDesejada} excederia o estoque. Máximo adicional: ${produtoEncontradoParaAdicionar.quantidade - itemExistenteNoCarrinho.quantidadeVendidaNoCarrinho}`, 'error');
                return;
            }
            itemExistenteNoCarrinho.quantidadeVendidaNoCarrinho = novaQuantidadeTotal;
            itemExistenteNoCarrinho.totalItem = novaQuantidadeTotal * itemExistenteNoCarrinho.precoUnitario;
        } else {
            carrinho.push({
                id: produtoEncontradoParaAdicionar.id,
                codProduto: produtoEncontradoParaAdicionar.cod_produto,
                nomeProduto: produtoEncontradoParaAdicionar.nome,
                quantidadeVendidaNoCarrinho: quantidadeDesejada,
                precoUnitario: produtoEncontradoParaAdicionar.preco_unitario,
                precoUnitarioOriginal: produtoEncontradoParaAdicionar.preco_unitario, // Adiciona preço original para detalhes da venda
                totalItem: quantidadeDesejada * produtoEncontradoParaAdicionar.preco_unitario
            });
        }
        
        showCustomPopup('Sucesso', `${quantidadeDesejada}x ${produtoEncontradoParaAdicionar.nome} adicionado ao carrinho!`, 'success');
        atualizarCarrinhoDisplay();
        resetProdutoSelecao();
    }

    function removerDoCarrinho(produtoId) {
        carrinho = carrinho.filter(item => item.id !== produtoId);
        atualizarCarrinhoDisplay();
    }

    function atualizarCarrinhoDisplay() {
        cartList.innerHTML = '';
        if (carrinho.length === 0) {
            cartList.innerHTML = '<li class="empty-cart-message">Carrinho vazio. Adicione itens!</li>';
        } else {
            carrinho.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${item.nomeProduto} (${item.quantidadeVendidaNoCarrinho}x R$ ${item.precoUnitario.toFixed(2)})</span>
                    <span>R$ ${(item.quantidadeVendidaNoCarrinho * item.precoUnitario).toFixed(2)}</span>
                    <button class="remove-item-btn" data-id="${item.id}" title="Remover item"><i class="fas fa-times-circle"></i></button>
                `;
                cartList.appendChild(li);
            });
        }
        calcularTotaisVenda();
    }

    function calcularTotaisVenda() {
        let subtotal = carrinho.reduce((total, item) => total + item.totalItem, 0);
        let valorDescontoAplicado = 0;

        if (aplicarDescontoCheckbox.checked) {
            valorDescontoAplicado = parseFloat(valorDescontoGlobalInput.value) || 0;
            if (valorDescontoAplicado > subtotal) {
                valorDescontoAplicado = subtotal; // Não permite desconto maior que o subtotal
                valorDescontoGlobalInput.value = subtotal.toFixed(2);
            }
        } else {
            valorDescontoGlobalInput.value = '0.00';
            valorDescontoGlobalInput.disabled = true;
        }

        const totalFinal = subtotal - valorDescontoAplicado;
        totalSaleDisplay.textContent = `R$ ${totalFinal.toFixed(2)}`;
        // Armazenar o total final no elemento para fácil acesso na finalização da venda
        totalSaleDisplay.dataset.totalFinal = totalFinal.toFixed(2);
        totalSaleDisplay.dataset.subtotal = subtotal.toFixed(2);
        totalSaleDisplay.dataset.valorDesconto = valorDescontoAplicado.toFixed(2);
    }

    function resetProdutoSelecao() {
        productDetailsDiv.innerHTML = '';
        productDetailsDiv.classList.remove('active');
        addProductToCartBtn.style.display = 'none';
        quantityInput.style.display = 'none';
        searchProductInput.value = '';
        produtoEncontradoParaAdicionar = null;
    }

    function resetVendaCompleta() {
        carrinho = [];
        resetProdutoSelecao();
        atualizarCarrinhoDisplay();
        aplicarDescontoCheckbox.checked = false;
        valorDescontoGlobalInput.value = '0.00';
        valorDescontoGlobalInput.disabled = true;
        descontoGlobalContainer.classList.remove('active');
        searchResultContainer.classList.remove('active'); // Garante que resultados de busca sejam ocultos
    }

    // MODIFICADO: finalizarVenda agora envia APENAS a transação para /api/transacoes
    async function finalizarVenda() {
        console.log('--- Início da função finalizarVenda ---');
        if (carrinho.length === 0) {
            showCustomPopup('Erro', 'Não há itens no carrinho para finalizar a venda.', 'error');
            console.log('Carrinho vazio. Finalização abortada.');
            return;
        }

        console.log('Carrinho não está vazio. Exibindo confirmação...');
        const confirmFinalize = await showCustomConfirm('Confirmação', 'Confirmar finalização da venda?');
        console.log('Resultado da confirmação:', confirmFinalize);

        if (confirmFinalize) {
            console.log('Confirmação aceita. Prosseguindo com a finalização.');

            const totalFinal = parseFloat(totalSaleDisplay.dataset.totalFinal);
            const totalBruto = parseFloat(totalSaleDisplay.dataset.subtotal);
            const valorDesconto = parseFloat(totalSaleDisplay.dataset.valorDesconto);
            
            let itensVendidosDetalhes = [];
            carrinho.forEach(itemCarrinho => {
                itensVendidosDetalhes.push({
                    produtoId: itemCarrinho.id,
                    codProduto: itemCarrinho.codProduto,
                    nomeProduto: itemCarrinho.nomeProduto,
                    quantidadeVendida: itemCarrinho.quantidadeVendidaNoCarrinho,
                    precoUnitarioOriginal: itemCarrinho.precoUnitarioOriginal,
                    precoUnitarioVenda: itemCarrinho.precoUnitario,
                    totalItem: itemCarrinho.totalItem
                });
            });

            // Cria o objeto da transação de venda, incluindo os detalhes para o backend
            const novaTransacao = {
                tipo: 'entrada',
                // Descrição genérica, os detalhes estarão em detalhesVenda
                descricao: `Venda de ${itensVendidosDetalhes.length} itens`, 
                valor: totalFinal, // Valor final da transação
                data: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
                detalhesVenda: { // Este objeto será armazenado como JSONB no backend
                    totalBruto: totalBruto,
                    valorDesconto: valorDesconto,
                    totalFinal: totalFinal,
                    itens: itensVendidosDetalhes
                }
            };

            try {
                // Envia APENAS a transação de venda para a API de transações.
                // O backend (api/transacoes.js) já cuidará da atualização do estoque.
                const transactionResult = await fazerRequisicaoApi('/api/transacoes', 'POST', novaTransacao);

                console.log('Transação de venda e estoque atualizados com sucesso pelo backend:', transactionResult);
                
                showCustomPopup('Sucesso', 'Venda finalizada com sucesso e estoque atualizado!', 'success');
                await carregarDados(); // Recarrega os produtos para refletir as novas quantidades em estoque
                resetVendaCompleta(); // Limpa o carrinho e reseta a interface
            } catch (error) {
                console.error('Erro na finalização da venda:', error);
                showCustomPopup('Erro', `Erro ao finalizar venda: ${error.message}`, 'error');
            }
        } else {
            console.log('Confirmação negada. Finalização abortada.');
        }
        console.log('--- Fim da função finalizarVenda ---');
    }


    // --- EVENT LISTENERS ---
    searchProductInput.addEventListener('input', pesquisarProduto);
    searchProductBtn.addEventListener('click', pesquisarProduto); // Permite buscar com o botão também
    addProductToCartBtn.addEventListener('click', adicionarAoCarrinho);
    finalizeSaleBtn.addEventListener('click', finalizarVenda);
    resetSaleBtn.addEventListener('click', resetVendaCompleta);

    cartList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item-btn') || e.target.closest('.remove-item-btn')) {
            const button = e.target.closest('.remove-item-btn');
            const produtoId = parseInt(button.dataset.id);
            removerDoCarrinho(produtoId);
        }
    });

    aplicarDescontoCheckbox.addEventListener('change', () => {
        descontoGlobalContainer.classList.toggle('active', aplicarDescontoCheckbox.checked);
        valorDescontoGlobalInput.disabled = !aplicarDescontoCheckbox.checked;
        calcularTotaisVenda();
    });

    valorDescontoGlobalInput.addEventListener('input', calcularTotaisVenda);

    // Esconde resultados da busca se clicar fora
    document.addEventListener('click', (e) => {
        if (!searchResultContainer.contains(e.target) && e.target !== searchProductInput) {
            searchResultContainer.classList.remove('active');
        }
    });


    // --- INICIALIZAÇÃO ---
    document.addEventListener('DOMContentLoaded', carregarDados);
}