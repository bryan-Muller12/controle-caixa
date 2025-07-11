// venda.js
// Lógica específica da tela de Vendas

// Garante que o código só rode na página de venda
if (document.body.id === 'page-venda' || location.pathname.includes('venda.html')) {
    // --- ELEMENTOS DO DOM ---
    const productNameDisplay = document.getElementById('product-name-display'); // Removido productImageDisplay

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
    const cancelItemBtn = document.getElementById('cancel-item-btn');
    const cancelAllItemsBtn = document.getElementById('cancel-all-items-btn');

    // --- ESTADO DA APLICAÇÃO ---
    let produtos = []; // Produtos do estoque
    let historicoTransacoes = []; // Histórico de todas as transações
    let produtoEncontradoParaAdicionar = null; // Produto retornado pela pesquisa
    let carrinho = []; // Itens adicionados à venda atual

    // --- FUNÇÕES DE CARREGAMENTO/SALVAMENTO ---
    function carregarDados() {
        produtos = JSON.parse(localStorage.getItem('produtos')) || [];
        historicoTransacoes = JSON.parse(localStorage.getItem('historicoTransacoes')) || [];
        atualizarNotificacoesComuns(); // Atualiza as notificações comuns
        resetVendaCompleta(); // Reseta a interface ao carregar a página
    }

    function salvarDados() {
        localStorage.setItem('produtos', JSON.stringify(produtos));
        localStorage.setItem('historicoTransacoes', JSON.stringify(historicoTransacoes));
    }

    // --- FUNÇÕES DA INTERFACE DE ADIÇÃO DE ITEM ---
    function exibirDetalhesProdutoEncontrado(produto) {
        if (produto) {
            // Removido productImageDisplay.src
            productNameDisplay.textContent = produto.nome;

            foundProductName.textContent = produto.nome;
            foundProductCod.textContent = produto.cod_produto;
            foundProductQuantityStock.textContent = produto.quantidade;
            foundProductDetails.classList.remove('hidden');

            quantidadeItemInput.value = 1;
            quantidadeItemInput.max = produto.quantidade;
            quantidadeItemInput.min = 1; // Garante que a quantidade mínima seja 1
            valorUnitarioItemInput.value = parseFloat(produto.preco_unitario).toFixed(2);
            
            atualizarValorTotalItem();
            addItemToCartBtn.disabled = false;
        } else {
            // Removido productImageDisplay.src
            productNameDisplay.textContent = 'Produto Selecionado';
            foundProductDetails.classList.add('hidden');
            quantidadeItemInput.value = 1;
            valorUnitarioItemInput.value = (0).toFixed(2);
            valorTotalItemInput.value = (0).toFixed(2);
            addItemToCartBtn.disabled = true;
        }
        produtoEncontradoParaAdicionar = produto; // Armazena o produto para adicionar ao carrinho
    }

    function pesquisarProduto() {
        const termoBusca = searchProdutoInput.value.toLowerCase().trim();
        let produto = null;

        if (termoBusca) {
            produto = produtos.find(p =>
                (p.cod_produto && p.cod_produto.toLowerCase() === termoBusca) ||
                (p.nome.toLowerCase() === termoBusca)
            );
            // Se não encontrou por exata, tenta por inclusão, mas prioriza exata
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
            alert('Produto não encontrado ou sem estoque.');
            exibirDetalhesProdutoEncontrado(null);
            searchProdutoInput.value = ''; // Limpa a pesquisa
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
            alert('Nenhum produto selecionado para adicionar.');
            return;
        }

        const quantidadeAdicionar = parseInt(quantidadeItemInput.value, 10);
        const valorUnitario = parseFloat(valorUnitarioItemInput.value);

        if (isNaN(quantidadeAdicionar) || quantidadeAdicionar <= 0 || quantidadeAdicionar > produtoEncontradoParaAdicionar.quantidade) {
            alert(`Quantidade inválida ou maior que o estoque disponível (${produtoEncontradoParaAdicionar.quantidade} unidades).`);
            return;
        }
        if (isNaN(valorUnitario) || valorUnitario <= 0) {
            alert('Valor unitário inválido.');
            return;
        }

        // Verifica se o item já está no carrinho
        const itemExistenteIndex = carrinho.findIndex(item => item.id === produtoEncontradoParaAdicionar.id);

        if (itemExistenteIndex !== -1) {
            // Se já existe, atualiza a quantidade
            const novaQuantidadeTotal = carrinho[itemExistenteIndex].quantidadeVendidaNoCarrinho + quantidadeAdicionar;
            if (novaQuantidadeTotal > produtoEncontradoParaAdicionar.quantidade) {
                alert(`Não é possível adicionar essa quantidade. Excederia o estoque disponível para "${produtoEncontradoParaAdicionar.nome}".`);
                return;
            }
            carrinho[itemExistenteIndex].quantidadeVendidaNoCarrinho = novaQuantidadeTotal;
            carrinho[itemExistenteIndex].totalItem = novaQuantidadeTotal * valorUnitario;
        } else {
            // Se não existe, adiciona novo item
            carrinho.push({
                id: produtoEncontradoParaAdicionar.id,
                codProduto: produtoEncontradoParaAdicionar.cod_produto,
                nomeProduto: produtoEncontradoParaAdicionar.nome,
                quantidadeVendidaNoCarrinho: quantidadeAdicionar,
                precoUnitarioOriginal: parseFloat(produtoEncontradoParaAdicionar.preco_unitario),
                precoUnitario: valorUnitario, // Valor de venda negociado
                totalItem: quantidadeAdicionar * valorUnitario
            });
        }
        
        atualizarCarrinhoDisplay();
        resetItemInputArea(); // Limpa a área de input do item
    }

    function resetItemInputArea() {
        searchProdutoInput.value = '';
        exibirDetalhesProdutoEncontrado(null); // Limpa as infos do produto
        quantidadeItemInput.value = 1;
        valorUnitarioItemInput.value = (0).toFixed(2);
        valorTotalItemInput.value = (0).toFixed(2);
        produtoEncontradoParaAdicionar = null;
    }

    // --- FUNÇÕES DO CARRINHO ---
    function atualizarCarrinhoDisplay() {
        cartItemsList.innerHTML = '';
        if (carrinho.length === 0) {
            emptyCartMessage.classList.remove('hidden');
            finalizeSaleBtn.disabled = true;
            cancelItemBtn.disabled = true;
            cancelAllItemsBtn.disabled = true;
            valorDescontoGlobalInput.value = '';
            aplicarDescontoCheckbox.checked = false;
        } else {
            emptyCartMessage.classList.add('hidden');
            carrinho.forEach((item, index) => {
                const li = document.createElement('li');
                li.classList.add('cart-item');
                li.dataset.index = index; // Para facilitar a remoção
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
            cancelItemBtn.disabled = false;
            cancelAllItemsBtn.disabled = false;
        }
        calcularTotaisVenda();
    }

    function removerItemDoCarrinho(index) {
        carrinho.splice(index, 1);
        atualizarCarrinhoDisplay();
    }

    function cancelarTodosItens() {
        if (confirm('Tem certeza que deseja cancelar todos os itens da venda atual?')) {
            carrinho = [];
            atualizarCarrinhoDisplay();
            resetItemInputArea();
        }
    }

    // --- FUNÇÕES DE TOTAL E DESCONTO ---
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
            valorDescontoGlobalInput.value = ''; // Limpa o valor do desconto ao desmarcar
        }

        totalSaleDisplay.textContent = `R$ ${totalFinalVenda.toFixed(2)}`;
    }

    // --- FINALIZAR VENDA ---
    function finalizarVenda() {
        if (carrinho.length === 0) {
            alert('Não há itens no carrinho para finalizar a venda.');
            return;
        }

        if (confirm('Confirmar finalização da venda?')) {
            let totalDaVenda = parseFloat(totalSaleDisplay.textContent.replace('R$ ', '').replace(',', '.'));
            let valorDescontoAplicado = aplicarDescontoCheckbox.checked ? (parseFloat(valorDescontoGlobalInput.value) || 0) : 0;

            // 1. Deduzir do estoque e preparar detalhes dos itens da venda
            let itensVendidosDetalhes = [];
            carrinho.forEach(itemCarrinho => {
                const produtoEstoqueIndex = produtos.findIndex(p => p.id === itemCarrinho.id);
                if (produtoEstoqueIndex !== -1) {
                    produtos[produtoEstoqueIndex].quantidade -= itemCarrinho.quantidadeVendidaNoCarrinho;
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

            // 2. Registrar no histórico de transações
            const novaTransacao = {
                id: Date.now(),
                tipo: 'entrada',
                descricao: `Venda de múltiplos itens`,
                valor: totalDaVenda,
                data: new Date().toISOString().split('T')[0], // Data atual
                detalhesVenda: {
                    totalBruto: itensVendidosDetalhes.reduce((sum, item) => sum + item.totalItem, 0).toFixed(2),
                    valorDesconto: valorDescontoAplicado.toFixed(2),
                    totalFinal: totalDaVenda.toFixed(2),
                    itens: itensVendidosDetalhes
                }
            };
            historicoTransacoes.push(novaTransacao);

            // 3. Salvar dados
            salvarDados();
            alert('Venda finalizada com sucesso!');
            
            // 4. Resetar a interface de venda
            resetVendaCompleta();
        }
    }

    function resetVendaCompleta() {
        carrinho = [];
        atualizarCarrinhoDisplay(); // Isso também reseta os totais
        resetItemInputArea();
        aplicarDescontoCheckbox.checked = false;
        valorDescontoGlobalInput.classList.add('hidden');
        valorDescontoGlobalInput.value = '';
        searchProdutoInput.value = '';
        productNameDisplay.textContent = 'Produto Selecionado'; // Removido productImageDisplay.src
    }

    // --- EVENT LISTENERS ---
    searchProdutoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Impede o envio do formulário padrão
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
    
    // O botão 'Cancelar Item' será utilizado para remover um item específico do carrinho
    // Se não houver itens selecionados visualmente, ele pode ser o mesmo que 'cancelarTudo'
    // Por simplicidade inicial, vamos usar o botão de remover item individualmente
    // ou o "cancelar tudo". Se quiser uma seleção visual para "cancelar item",
    // precisaríamos de mais lógica de interface (selecionar item na lista).
    // Por enquanto, o botão "CANCELAR ITEM" no HTML não tem função direta,
    // usamos o X ao lado de cada item.

    // --- INICIALIZAÇÃO ---
    document.addEventListener('DOMContentLoaded', carregarDados);
}