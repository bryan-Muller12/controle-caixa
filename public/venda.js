// public/venda.js
document.addEventListener('DOMContentLoaded', async () => {
    // ==== Seleção de Elementos do DOM ====
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
    const totalVolumesSpan = document.getElementById('total-volumes');
    const totalSaleDisplay = document.getElementById('total-sale-display');
    const finalizeSaleBtn = document.getElementById('finalize-sale-btn');
    const cancelAllItemsBtn = document.getElementById('cancel-all-items-btn');
    const aplicarDescontoCheckbox = document.getElementById('aplicar-desconto');
    const valorDescontoGlobalInput = document.getElementById('valor-desconto-global');
    const productDisplayCard = document.querySelector('.product-display-card');
    const productNameDisplay = document.getElementById('product-name-display');


    // Variáveis de estado
    let cart = [];
    let selectedProduct = null;
    let currentProductId = null;
    let currentProductStock = 0;

    // ==== Funções de Utilidade ====
    function showPopup(title, message, isError = false, callback = null) {
        const popupOverlay = document.getElementById('custom-popup-overlay');
        const popupTitle = document.getElementById('custom-popup-title');
        const popupMessage = document.getElementById('custom-popup-message');
        const popupCloseBtn = document.getElementById('custom-popup-close-btn');

        popupTitle.textContent = title;
        popupMessage.textContent = message;
        popupOverlay.classList.remove('hidden');

        // Estilo de erro
        if (isError) {
            popupTitle.style.color = 'var(--color-danger)';
        } else {
            popupTitle.style.color = ''; // Reseta para a cor padrão
        }

        // Garante que o event listener só é adicionado uma vez
        popupCloseBtn.onclick = () => {
            popupOverlay.classList.add('hidden');
            if (callback) callback();
        };
    }

    function showConfirm(title, message, onConfirm, onCancel = null) {
        const confirmOverlay = document.getElementById('custom-confirm-overlay');
        const confirmTitle = document.getElementById('custom-confirm-title');
        const confirmMessage = document.getElementById('custom-confirm-message');
        const confirmYesBtn = document.getElementById('custom-confirm-yes-btn');
        const confirmNoBtn = document.getElementById('custom-confirm-no-btn');

        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmOverlay.classList.remove('hidden');

        confirmYesBtn.onclick = () => {
            confirmOverlay.classList.add('hidden');
            onConfirm();
        };
        confirmNoBtn.onclick = () => {
            confirmOverlay.classList.add('hidden');
            if (onCancel) onCancel();
        };
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    // ==== Lógica do Produto ====
    async function fetchProduct(query) {
        try {
            const response = await fetch(`/api/produtos?search=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error('Erro ao buscar produto.');
            }
            const products = await response.json();
            if (products.length > 0) {
                selectedProduct = products[0]; // Assume o primeiro resultado
                currentProductId = selectedProduct.id;
                currentProductStock = selectedProduct.quantidade;

                foundProductName.textContent = selectedProduct.nome;
                foundProductCod.textContent = selectedProduct.codigo;
                foundProductQuantityStock.textContent = selectedProduct.quantidade;
                foundProductDetails.classList.remove('hidden');
                addItemToCartBtn.disabled = false;
                productNameDisplay.textContent = selectedProduct.nome; // Atualiza o nome no card
                valorUnitarioItemInput.value = selectedProduct.preco_venda.toFixed(2);
                updateValorTotalItem();
            } else {
                showPopup('Produto Não Encontrado', 'Nenhum produto encontrado com o código ou nome fornecido.', true);
                clearProductSelection();
            }
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            showPopup('Erro', 'Não foi possível buscar o produto. Tente novamente.', true);
            clearProductSelection();
        }
    }

    function clearProductSelection() {
        selectedProduct = null;
        currentProductId = null;
        currentProductStock = 0;
        foundProductDetails.classList.add('hidden');
        foundProductName.textContent = '';
        foundProductCod.textContent = '';
        foundProductQuantityStock.textContent = '';
        addItemToCartBtn.disabled = true;
        productNameDisplay.textContent = 'Produto Selecionado';
        searchProdutoInput.value = '';
        quantidadeItemInput.value = 1;
        valorUnitarioItemInput.value = '0.00';
        valorTotalItemInput.value = '0.00';
    }

    function updateValorTotalItem() {
        const quantidade = parseFloat(quantidadeItemInput.value);
        const valorUnitario = parseFloat(valorUnitarioItemInput.value);
        if (!isNaN(quantidade) && !isNaN(valorUnitario)) {
            valorTotalItemInput.value = (quantidade * valorUnitario).toFixed(2);
        } else {
            valorTotalItemInput.value = '0.00';
        }
    }

    function updateCartSummary() {
        let totalVolumes = 0;
        let totalSale = 0;

        cart.forEach(item => {
            totalVolumes += item.quantidadeVendida;
            totalSale += item.totalItem;
        });

        totalVolumesSpan.textContent = totalVolumes;
        totalSaleDisplay.textContent = formatCurrency(totalSale);

        finalizeSaleBtn.disabled = cart.length === 0;
        cancelAllItemsBtn.disabled = cart.length === 0;

        // Aplica o desconto global se a checkbox estiver marcada
        if (aplicarDescontoCheckbox.checked && parseFloat(valorDescontoGlobalInput.value) > 0) {
            const desconto = parseFloat(valorDescontoGlobalInput.value);
            if (!isNaN(desconto) && desconto < totalSale) {
                totalSaleDisplay.textContent = formatCurrency(totalSale - desconto);
            } else if (desconto >= totalSale) {
                // Evita valor negativo, opcionalmente pode mostrar um erro
                totalSaleDisplay.textContent = formatCurrency(0);
            }
        }
    }

    function renderCart() {
        cartItemsList.innerHTML = '';
        if (cart.length === 0) {
            cartItemsList.innerHTML = '<li class="empty-cart-message">Nenhum item no carrinho.</li>';
            return;
        }

        cart.forEach((item, index) => {
            const li = document.createElement('li');
            li.classList.add('cart-item-row');
            li.dataset.index = index;
            li.innerHTML = `
                <span>${index + 1}</span>
                <span>${item.codProduto}</span>
                <span>${item.nomeProduto}</span>
                <span>${item.quantidadeVendida}</span>
                <span>${formatCurrency(item.precoUnitarioVenda)}</span>
                <span>${formatCurrency(item.totalItem)}</span>
                <span class="cart-item-actions">
                    <button type="button" class="btn-icon btn-remove-item" data-index="${index}" title="Remover Item"><i class="fas fa-times"></i></button>
                </span>
            `;
            cartItemsList.appendChild(li);
        });
        updateCartSummary();
    }

    function addItemToCart() {
        if (!selectedProduct) {
            showPopup('Erro', 'Selecione um produto primeiro.', true);
            return;
        }

        const quantidade = parseInt(quantidadeItemInput.value);
        const valorUnitario = parseFloat(valorUnitarioItemInput.value);
        const totalItem = parseFloat(valorTotalItemInput.value);

        if (isNaN(quantidade) || quantidade <= 0) {
            showPopup('Erro', 'Quantidade inválida.', true);
            return;
        }
        if (isNaN(valorUnitario) || valorUnitario <= 0) {
            showPopup('Erro', 'Valor unitário inválido.', true);
            return;
        }
        if (quantidade > currentProductStock) {
            showPopup('Estoque Insuficiente', `Quantidade em estoque: ${currentProductStock}. Você está tentando adicionar ${quantidade}.`, true);
            return;
        }

        // Verificar se o item já está no carrinho e atualizar
        const existingItemIndex = cart.findIndex(item => item.produtoId === selectedProduct.id);

        if (existingItemIndex > -1) {
            const existingItem = cart[existingItemIndex];
            const newTotalQuantity = existingItem.quantidadeVendida + quantidade;

            if (newTotalQuantity > currentProductStock) {
                showPopup('Estoque Insuficiente', `Adicionar este item excederia o estoque. Limite: ${currentProductStock - existingItem.quantidadeVendida} unidades adicionais.`, true);
                return;
            }
            existingItem.quantidadeVendida = newTotalQuantity;
            existingItem.totalItem = newTotalQuantity * existingItem.precoUnitarioVenda; // Recalcula o total do item
        } else {
            const item = {
                produtoId: selectedProduct.id,
                codProduto: selectedProduct.codigo,
                nomeProduto: selectedProduct.nome,
                quantidadeVendida: quantidade,
                precoUnitarioOriginal: selectedProduct.preco_venda,
                precoUnitarioVenda: valorUnitario, // Permite alterar o preço de venda
                totalItem: totalItem
            };
            cart.push(item);
        }
        
        renderCart();
        clearProductSelection(); // Limpa a seleção após adicionar ao carrinho
        searchProdutoInput.focus();
    }

    function removeItemFromCart(index) {
        showConfirm('Confirmar Remoção', 'Tem certeza que deseja remover este item do carrinho?', () => {
            cart.splice(index, 1);
            renderCart();
        });
    }

    async function finalizeSale() {
        if (cart.length === 0) {
            showPopup('Carrinho Vazio', 'Adicione itens ao carrinho antes de finalizar a venda.', true);
            return;
        }

        let totalBruto = 0;
        cart.forEach(item => {
            totalBruto += (item.quantidadeVendida * item.precoUnitarioVenda);
        });

        let valorDesconto = 0;
        if (aplicarDescontoCheckbox.checked) {
            valorDesconto = parseFloat(valorDescontoGlobalInput.value) || 0;
            if (valorDesconto > totalBruto) {
                showPopup('Erro de Desconto', 'O valor do desconto não pode ser maior que o total bruto da venda.', true);
                return;
            }
        }

        const totalFinal = totalBruto - valorDesconto;

        const transactionData = {
            tipo: 'venda',
            descricao: `Venda de ${cart.length} itens.`,
            valor: totalFinal, // Valor final da transação após o desconto
            data: new Date().toISOString().slice(0, 10), // Data atual no formato YYYY-MM-DD
            detalhesVenda: {
                totalBruto: totalBruto,
                valorDesconto: valorDesconto,
                itens: cart.map(item => ({
                    produtoId: item.produtoId,
                    codProduto: item.codProduto,
                    nomeProduto: item.nomeProduto,
                    quantidadeVendida: item.quantidadeVendida,
                    precoUnitarioOriginal: item.precoUnitarioOriginal,
                    precoUnitarioVenda: item.precoUnitarioVenda,
                    totalItem: item.totalItem
                }))
            }
        };

        try {
            const response = await fetch('/api/transacoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao finalizar a venda.');
            }

            const result = await response.json();
            showPopup('Venda Finalizada', 'Venda registrada com sucesso! ID da Transação: ' + result.id, false, () => {
                // Limpa o carrinho e a seleção de produto após a venda
                cart = [];
                renderCart();
                clearProductSelection();
                aplicarDescontoCheckbox.checked = false;
                valorDescontoGlobalInput.classList.add('hidden');
                valorDescontoGlobalInput.value = 0;
            });

        } catch (error) {
            console.error('Erro ao finalizar a venda:', error);
            showPopup('Erro ao Finalizar Venda', error.message, true);
        }
    }

    function cancelAllItems() {
        showConfirm('Cancelar Venda', 'Tem certeza que deseja cancelar todos os itens do carrinho? Esta ação não pode ser desfeita.', () => {
            cart = [];
            renderCart();
            clearProductSelection();
            aplicarDescontoCheckbox.checked = false;
            valorDescontoGlobalInput.classList.add('hidden');
            valorDescontoGlobalInput.value = 0;
        });
    }

    // ==== Listeners de Eventos ====
    findProductBtn.addEventListener('click', () => {
        const query = searchProdutoInput.value.trim();
        if (query) {
            fetchProduct(query);
        } else {
            showPopup('Atenção', 'Digite um código ou nome de produto para pesquisar.');
        }
    });

    searchProdutoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            findProductBtn.click();
        }
    });

    quantidadeItemInput.addEventListener('input', updateValorTotalItem);
    valorUnitarioItemInput.addEventListener('input', updateValorTotalItem);

    addItemToCartBtn.addEventListener('click', addItemToCart);

    cartItemsList.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-item')) {
            const index = parseInt(e.target.closest('.btn-remove-item').dataset.index);
            removeItemFromCart(index);
        }
    });

    finalizeSaleBtn.addEventListener('click', finalizeSale);
    cancelAllItemsBtn.addEventListener('click', cancelAllItems);

    aplicarDescontoCheckbox.addEventListener('change', () => {
        if (aplicarDescontoCheckbox.checked) {
            valorDescontoGlobalInput.classList.remove('hidden');
        } else {
            valorDescontoGlobalInput.value = 0;
            valorDescontoGlobalInput.classList.add('hidden');
        }
        updateCartSummary(); // Atualiza o total da venda ao aplicar/remover desconto
    });

    valorDescontoGlobalInput.addEventListener('input', updateCartSummary); // Recalcula o total ao digitar o desconto


    // Inicialização
    renderCart();
});