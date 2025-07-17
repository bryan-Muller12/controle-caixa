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

    // --- ESTADO DA APLICAÇÃO ---
    let produtos = [];
    let historicoTransacoes = [];
    let produtoEncontradoParaAdicionar = null;
    let carrinho = [];

    function carregarDados() {
        produtos = JSON.parse(localStorage.getItem('produtos')) || [];
        historicoTransacoes = JSON.parse(localStorage.getItem('historicoTransacoes')) || [];
        atualizarNotificacoesComuns();
        resetVendaCompleta();
    }

    function salvarDados() {
        localStorage.setItem('produtos', JSON.stringify(produtos));
        localStorage.setItem('historicoTransacoes', JSON.stringify(historicoTransacoes));
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
        console.log('--- Início da função finalizarVenda ---'); // Log 1
        if (carrinho.length === 0) {
            showCustomPopup('Erro', 'Não há itens no carrinho para finalizar a venda.', 'error');
            console.log('Carrinho vazio. Finalização abortada.'); // Log 2
            return;
        }

        console.log('Carrinho não está vazio. Exibindo confirmação...'); // Log 3
        const confirmFinalize = await showCustomConfirm('Confirmação', 'Confirmar finalização da venda?');
        console.log('Resultado da confirmação:', confirmFinalize); // Log 4

        if (confirmFinalize) {
            console.log('Confirmação aceita. Prosseguindo com a finalização.'); // Log 5

            let totalDaVendaText = totalSaleDisplay.textContent;
            console.log('Texto do total da venda na tela:', totalDaVendaText); // Log 6
            let totalDaVenda = parseFloat(totalDaVendaText.replace('R$ ', '').replace(',', '.'));
            console.log('Valor total da venda (parseFloat):', totalDaVenda); // Log 7

            let valorDescontoAplicado = aplicarDescontoCheckbox.checked ? (parseFloat(valorDescontoGlobalInput.value) || 0) : 0;
            console.log('Valor do desconto aplicado:', valorDescontoAplicado); // Log 8

            let itensVendidosDetalhes = [];
            console.log('Processando itens do carrinho e atualizando estoque...'); // Log 9
            carrinho.forEach(itemCarrinho => {
                const produtoEstoqueIndex = produtos.findIndex(p => p.id === itemCarrinho.id);
                if (produtoEstoqueIndex !== -1) {
                    console.log(`Produto ${itemCarrinho.nomeProduto} (ID: ${itemCarrinho.id}) antes da atualização: ${produtos[produtoEstoqueIndex].quantidade}`); // Log 10
                    produtos[produtoEstoqueIndex].quantidade -= itemCarrinho.quantidadeVendidaNoCarrinho;
                    console.log(`Produto ${itemCarrinho.nomeProduto} (ID: ${itemCarrinho.id}) depois da atualização: ${produtos[produtoEstoqueIndex].quantidade}`); // Log 11
                } else {
                    console.warn(`Produto com ID ${itemCarrinho.id} não encontrado no estoque ao finalizar venda.`); // Log 12
                }
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
            console.log('Itens vendidos detalhes:', itensVendidosDetalhes); // Log 13

            const novaTransacao = {
                id: Date.now(),
                tipo: 'entrada',
                descricao: `Venda de múltiplos itens`,
                valor: totalDaVenda,
                data: new Date().toISOString().split('T')[0],
                detalhesVenda: {
                    totalBruto: itensVendidosDetalhes.reduce((sum, item) => sum + item.totalItem, 0).toFixed(2),
                    valorDesconto: valorDescontoAplicado.toFixed(2),
                    totalFinal: totalDaVenda.toFixed(2),
                    itens: itensVendidosDetalhes
                }
            };
            console.log('Nova transação a ser adicionada:', novaTransacao); // Log 14
            historicoTransacoes.push(novaTransacao);
            console.log('Histórico de transações atualizado em memória.'); // Log 15

            salvarDados();
            console.log('Dados salvos no LocalStorage.'); // Log 16
            showCustomPopup('Sucesso', 'Venda finalizada com sucesso!', 'success');

            resetVendaCompleta();
            console.log('Venda completa resetada.'); // Log 17
        } else {
            console.log('Confirmação negada. Finalização abortada.'); // Log 18
        }
        console.log('--- Fim da função finalizarVenda ---'); // Log 19
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
    }

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

    document.addEventListener('DOMContentLoaded', carregarDados);
}