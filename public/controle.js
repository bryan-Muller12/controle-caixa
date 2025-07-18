// controle.js
// Lógica específica da tela de Controle de Caixa

// Garante que o código só rode na página de controle
if (document.body.id === 'page-controle' || location.pathname.includes('controle.html')) {
    // --- ELEMENTOS DO DOM ---
    const saldoAtualDisplay = document.getElementById('saldo-atual');
    // CORREÇÃO: Usando o ID correto do HTML 'lista-transacoes'
    const listaTransacoes = document.getElementById('lista-transacoes'); 
    const filterButtons = document.querySelectorAll('.transaction-type-filter button');
    const outraTransacaoForm = document.getElementById('outra-transacao-form');
    const tipoTransacaoSelect = document.getElementById('tipo-transacao');
    const descricaoTransacaoInput = document.getElementById('descricao-transacao');
    const valorTransacaoInput = document.getElementById('valor-transacao');
    const dataTransacaoInput = document.getElementById('data-transacao');

    // Elementos do DOM para Relatórios de Vendas
    const dataInicioVendasInput = document.getElementById('data-inicio-vendas');
    const dataFimVendasInput = document.getElementById('data-fim-vendas');
    const gerarRelatorioVendasBtn = document.getElementById('gerar-relatorio-vendas-btn');
    const relatorioVendasOutput = document.getElementById('relatorio-vendas-output');

    // Elementos do DOM para Ordenação e Collapsible
    const toggleSortBtn = document.getElementById('toggle-sort-btn');
    const registrarTransacaoCard = document.getElementById('registrar-transacao-card');


    // --- ESTADO DA APLICAÇÃO ---
    let historicoTransacoes = []; // Será preenchido pela API
    let saldoAtual = 0;
    let filtroAtual = 'all'; // 'all', 'entrada', 'saida'
    let sortOrder = 'desc'; // 'desc' (mais recente) ou 'asc' (mais antigo)


    // --- FUNÇÕES ---

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
        // Tenta parsear a resposta como JSON, mas não falha se não for JSON (ex: 204 No Content)
        const responseData = await response.json().catch(() => null); 
        
        if (!response.ok) {
            // Se a resposta não for OK, lança um erro com a mensagem do backend ou um genérico
            throw new Error(responseData?.error || `Erro na requisição ${method} ${url}: Status ${response.status}`);
        }
        return responseData;
    }

    // REMOVIDA: function carregarDados() - Agora usamos carregarHistoricoTransacoes da API
    // REMOVIDA: function salvarDados() - Não há mais necessidade de salvar no localStorage

    // NOVA FUNÇÃO: Carrega o histórico de transações do backend
    async function carregarHistoricoTransacoes(filtros = {}) {
        try {
            const params = new URLSearchParams();
            if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
            if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
            if (filtros.tipo && filtros.tipo !== 'todos') params.append('tipo', filtros.tipo); // 'todos' não é um filtro de API

            const url = `/api/transacoes?${params.toString()}`;
            const data = await fazerRequisicaoApi(url, 'GET');
            historicoTransacoes = data; // Atualiza a variável global

            calcularESetarSaldo();
            renderizarHistorico();
            // atualizarNotificacoesComuns(); // Esta chamada agora está em loadProdutosForNotifications
        } catch (error) {
            console.error('Erro ao carregar histórico de transações:', error);
            showCustomPopup('Erro', 'Não foi possível carregar o histórico de transações. ' + error.message, 'error');
        }
    }

    function calcularESetarSaldo() {
        saldoAtual = historicoTransacoes.reduce((acc, transacao) => {
            if (transacao.tipo === 'entrada') {
                return acc + transacao.valor;
            } else if (transacao.tipo === 'saida') {
                return acc - transacao.valor;
            }
            return acc;
        }, 0);
        saldoAtualDisplay.textContent = `R$ ${saldoAtual.toFixed(2)}`;
        // Adiciona classes para estilo visual (positivo/negativo)
        saldoAtualDisplay.classList.remove('positive', 'negative');
        if (saldoAtual >= 0) {
            saldoAtualDisplay.classList.add('positive');
        } else {
            saldoAtualDisplay.classList.add('negative');
        }
    }

    function renderizarHistorico() {
        listaTransacoes.innerHTML = ''; // Limpa a lista antes de renderizar
        
        // Transações já vêm filtradas pela API se filtros foram aplicados em carregarHistoricoTransacoes.
        // Aqui apenas aplicamos a ordenação e o filtro local que a API pode não ter (como 'all')
        const transacoesFiltradas = historicoTransacoes.filter(transacao => {
            if (filtroAtual === 'all') return true;
            return transacao.tipo === filtroAtual;
        }).sort((a, b) => {
            // Converte a string de data para objeto Date para comparação
            const dateA = new Date(a.data).getTime();
            const dateB = new Date(b.data).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        }); 

        if (transacoesFiltradas.length === 0) {
            listaTransacoes.innerHTML = `<li style="justify-content: center; color: var(--text-muted);">${filtroAtual === 'all' ? 'Nenhuma transação encontrada.' : 'Nenhuma transação deste tipo encontrada.'}</li>`;
            return;
        }

        transacoesFiltradas.forEach(transacao => {
            const li = document.createElement('li');
            const valorFormatado = `R$ ${transacao.valor.toFixed(2)}`;
            const valorClasse = transacao.tipo === 'entrada' ? 'positive' : 'negative';
            const sinal = transacao.tipo === 'entrada' ? '+' : '-';

            let detalhesHTML = '';
            // Verifica se detalhesVenda existe e não é nulo/vazio
            if (transacao.detalhes_venda && Object.keys(transacao.detalhes_venda).length > 0) {
                const detalhes = transacao.detalhes_venda;
                detalhesHTML = `
                    <details style="margin-top: 10px; padding-top: 5px; border-top: 1px dashed var(--border-color-dark);">
                        <summary style="font-weight: 500; cursor: pointer; color: var(--primary-color);">Ver Detalhes da Venda</summary>
                        <div style="font-size: 0.9em; margin-top: 10px;">
                            <p><strong>Total Bruto:</strong> R$ ${parseFloat(detalhes.totalBruto).toFixed(2)}</p>
                            <p><strong>Desconto Aplicado:</strong> R$ ${parseFloat(detalhes.valorDesconto).toFixed(2)}</p>
                            <p><strong>Total Final da Venda:</strong> R$ ${parseFloat(detalhes.totalFinal).toFixed(2)}</p>
                            <ul style="list-style: none; padding-left: 15px; margin-top: 10px; border-top: 1px solid var(--border-color-dark); padding-top: 10px;">
                                <li style="font-weight: bold; margin-bottom: 5px;">Itens Vendidos:</li>
                                ${detalhes.itens && detalhes.itens.length > 0 ? detalhes.itens.map(item => `
                                    <li style="margin-bottom: 3px;">- ${item.nomeProduto} (${item.codProduto}): ${item.quantidadeVendida} x R$ ${item.precoUnitarioVenda.toFixed(2)} = R$ ${item.totalItem.toFixed(2)}</li>
                                `).join('') : '<li>Nenhum item detalhado.</li>'}
                            </ul>
                        </div>
                    </details>
                `;
                // Se for uma transação de venda, ajuste a descrição
                transacao.descricao = `Venda (${detalhes.itens ? detalhes.itens.length : 0} itens)`;
            }

            li.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-description">${transacao.descricao}</span>
                </div>
                <div class="transaction-details">
                    <span class="transaction-value ${valorClasse}">${sinal} ${valorFormatado}</span>
                    <span class="transaction-date">${new Date(transacao.data).toLocaleDateString('pt-BR')}</span>
                </div>
                ${detalhesHTML}
            `;
            listaTransacoes.appendChild(li);
        });
    }

    // MODIFICADO: registrarOutraTransacao agora usa a API
    async function registrarOutraTransacao(e) {
        e.preventDefault();

        const tipo = tipoTransacaoSelect.value;
        const descricao = descricaoTransacaoInput.value.trim();
        const valor = parseFloat(valorTransacaoInput.value);
        const data = dataTransacaoInput.value;

        if (!descricao || isNaN(valor) || valor <= 0 || !data) {
            showCustomPopup('Erro', 'Por favor, preencha todos os campos corretamente e garanta que o valor seja positivo.', 'error');
            return;
        }

        try {
            const novaTransacao = {
                tipo: tipo,
                descricao: descricao,
                valor: valor,
                data: data, // Formato YYYY-MM-DD
                detalhesVenda: null // Transações manuais não têm detalhes de venda
            };

            await fazerRequisicaoApi('/api/transacoes', 'POST', novaTransacao);
            
            // Reabilita o botão após a conclusão
            // submitButton.disabled = false;
            // submitButton.textContent = 'Registrar Transação';

            outraTransacaoForm.reset(); // Limpa o formulário
            registrarTransacaoCard.classList.remove('expanded'); // Fecha o collapsible após o registro

            await carregarHistoricoTransacoes(); // Recarrega o histórico após adicionar via API
            showCustomPopup('Sucesso', 'Transação registrada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao registrar transação:', error);
            showCustomPopup('Erro', error.message || 'Não foi possível registrar a transação.', 'error');
        }
    }

    // REMOVIDAS as funções de relatório diário e mensal (gerarRelatorioDiario, gerarRelatorioMensal)

    // MODIFICADO: Função para gerar Relatório de Vendas (Resumo e Top Vendas) usando a API
    async function gerarRelatorioVendas() {
        const dataInicio = dataInicioVendasInput.value;
        const dataFim = dataFimVendasInput.value;

        if (!dataInicio || !dataFim) {
            showCustomPopup('Erro', 'Por favor, selecione as datas de início e fim para o relatório de vendas.', 'error');
            return;
        }

        // Validação de datas
        if (new Date(dataInicio) > new Date(dataFim)) {
            showCustomPopup('Erro', 'A data de início não pode ser posterior à data de fim.', 'error');
            return;
        }

        try {
            const params = new URLSearchParams();
            params.append('tipo', 'entrada'); // Relatório de VENDAS (entradas)
            params.append('dataInicio', dataInicio);
            params.append('dataFim', dataFim);

            const url = `/api/transacoes?${params.toString()}`;
            const vendasNoPeriodo = await fazerRequisicaoApi(url, 'GET');

            let totalVendasPeriodo = 0; // Total líquido
            let totalDescontos = 0;
            let totalBrutoVendas = 0;
            let totalItensVendidosPeriodo = 0;
            const produtosVendidosDetalhes = {};

            relatorioVendasOutput.innerHTML = ''; // Limpa antes de preencher

            if (vendasNoPeriodo.length === 0) {
                relatorioVendasOutput.innerHTML = '<p>Nenhuma venda encontrada para o período selecionado.</p>';
                return;
            }

            vendasNoPeriodo.forEach(venda => {
                // Garante que detalhes_venda seja um objeto, mesmo que venha como string JSON
                const detalhes = typeof venda.detalhes_venda === 'string' 
                                ? JSON.parse(venda.detalhes_venda) 
                                : venda.detalhes_venda;

                if (detalhes) {
                    totalVendasPeriodo += parseFloat(detalhes.totalFinal || 0);
                    totalBrutoVendas += parseFloat(detalhes.totalBruto || 0);
                    totalDescontos += parseFloat(detalhes.valorDesconto || 0);
                    
                    if (detalhes.itens) {
                        detalhes.itens.forEach(item => {
                            totalItensVendidosPeriodo += item.quantidadeVendida;
                            if (produtosVendidosDetalhes[item.nomeProduto]) {
                                produtosVendidosDetalhes[item.nomeProduto].quantidade += item.quantidadeVendida;
                                produtosVendidosDetalhes[item.nomeProduto].valorTotal += item.totalItem;
                            } else {
                                produtosVendidosDetalhes[item.nomeProduto] = {
                                    quantidade: item.quantidadeVendida,
                                    valorTotal: item.totalItem
                                };
                            }
                        });
                    }
                }
            });

            const topProdutosVendidos = Object.keys(produtosVendidosDetalhes)
                .map(nome => ({
                    nome: nome,
                    quantidade: produtosVendidosDetalhes[nome].quantidade,
                    valorTotal: produtosVendidosDetalhes[nome].valorTotal
                }))
                .sort((a, b) => b.quantidade - a.quantidade)
                .slice(0, 5); // Pega os 5 primeiros

            let topProdutosHtml = '';
            if (topProdutosVendidos.length > 0) {
                topProdutosHtml = `
                    <h4>Top 5 Produtos Mais Vendidos:</h4>
                    <ul style="list-style: decimal; padding-left: 20px;">
                        ${topProdutosVendidos.map(p => `
                            <li>${p.nome}: ${p.quantidade} unidades (R$ ${p.valorTotal.toFixed(2)})</li>
                        `).join('')}
                    </ul>
                `;
            } else {
                topProdutosHtml = `<p>Nenhum produto vendido no período selecionado.</p>`;
            }

            relatorioVendasOutput.innerHTML = `
                <h3>Relatório de Vendas de ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}</h3>
                <p><strong>Número de Vendas:</strong> ${vendasNoPeriodo.length}</p>
                <p><strong>Valor Total Bruto das Vendas:</strong> R$ ${totalBrutoVendas.toFixed(2)}</p>
                <p><strong>Total de Descontos Concedidos:</strong> R$ ${totalDescontos.toFixed(2)}</p>
                <p><strong>Valor Total Líquido das Vendas:</strong> R$ ${totalVendasPeriodo.toFixed(2)}</p>
                <p><strong>Total de Itens Vendidos:</strong> ${totalItensVendidosPeriodo} unidades</p>
                ${topProdutosHtml}
            `;

        } catch (error) {
            console.error('Erro ao gerar relatório de vendas:', error);
            showCustomPopup('Erro', error.message || 'Não foi possível gerar o relatório de vendas.', 'error');
        }
    }

    // Carrega produtos para notificações (usando a API de produtos)
    async function loadProdutosForNotifications() {
        try {
            const produtosDoEstoque = await fazerRequisicaoApi('/api/produtos', 'GET');
            // A função atualizarNotificacoesComuns (do common.js) precisa receber os produtos para operar
            if (typeof atualizarNotificacoesComuns === 'function') {
                atualizarNotificacoesComuns(produtosDoEstoque); 
            } else {
                console.warn("atualizarNotificacoesComuns não é uma função. Verifique o common.js.");
            }
        } catch (error) {
            console.error('Erro ao carregar produtos para notificações:', error);
            // showCustomPopup('Atenção', 'Não foi possível carregar as notificações de estoque.', 'info');
        }
    }

    // --- EVENT LISTENERS ---
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filtroAtual = button.dataset.filter;
            // Carrega o histórico novamente com o filtro, o backend já pode filtrar
            carregarHistoricoTransacoes({
                dataInicio: dataInicioVendasInput.value, // Mantém filtros de data se houver
                dataFim: dataFimVendasInput.value,
                tipo: filtroAtual === 'all' ? 'todos' : filtroAtual // Passa 'todos' para a API se não houver filtro específico
            });
        });
    });

    outraTransacaoForm.addEventListener('submit', registrarOutraTransacao);

    // Event listener para o botão de relatório de vendas (já estava correto para disparar a função)
    gerarRelatorioVendasBtn.addEventListener('click', gerarRelatorioVendas);

    // Event listener para o botão de alternar ordenação
    toggleSortBtn.addEventListener('click', () => {
        sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        renderizarHistorico(); // Apenas renderiza, já que os dados estão carregados
        // Atualiza o ícone de ordenação
        toggleSortBtn.querySelector('i').classList.toggle('fa-sort-up', sortOrder === 'asc');
        toggleSortBtn.querySelector('i').classList.toggle('fa-sort-down', sortOrder === 'desc');
        toggleSortBtn.querySelector('i').classList.toggle('fa-sort', false); // Remove o ícone padrão
    });

    // Event listener para o cabeçalho do collapsible
    registrarTransacaoCard.querySelector('.collapsible-header').addEventListener('click', () => {
        registrarTransacaoCard.classList.toggle('expanded');
    });


    // --- INICIALIZAÇÃO ---
    document.addEventListener('DOMContentLoaded', async () => {
        await carregarHistoricoTransacoes(); // Carrega o histórico de transações do backend
        await loadProdutosForNotifications(); // Carrega produtos para as notificações
    });
}