// Em app/static/js/app.js

// --- VARIÁVEL GLOBAL DE PERMISSÃO ---
const USER_ROLE = window.APP_CONFIG ? window.APP_CONFIG.USER_ROLE : 'supervisor';

// Função global para fechar o modal.
window.closeModal = () => {
    const modal = document.getElementById('form-modal');
    if (modal) {
        modal.classList.add('hidden');
        const modalForm = document.getElementById('modal-form');
        if (modalForm) {
            modalForm.innerHTML = '';
            modalForm.removeAttribute('data-edit-id');
        }
        if (!modal.classList.contains('hidden')) {
            history.back();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos Globais ---
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    const modal = document.getElementById('form-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalForm = document.getElementById('modal-form');
    const mobileHeaderTitle = document.getElementById('mobile-header-title');


    // --- Cliente de API ---
    const api = {
        get: async (endpoint, id = null) => {
            const url = id ? `/api/${endpoint}/${id}` : `/api/${endpoint}`;
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    alert('Sessão expirada ou sem permissão. Será redirecionado para o login.');
                    window.location.href = '/auth/login';
                }
                throw new Error('Erro ao buscar dados.');
            }
            return response.json();
        },
        post: async (endpoint, data) => {
            const response = await fetch(`/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Ocorreu um erro ao salvar os dados.');
            return result;
        },
        put: async (endpoint, id, data) => {
            const response = await fetch(`/api/${endpoint}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Ocorreu um erro ao atualizar os dados.');
            return result;
        },
        delete: async (endpoint, id) => {
            const response = await fetch(`/api/${endpoint}/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Ocorreu um erro ao apagar os dados.');
            return result;
        }
    };
   // --- Event Listeners para todos os gatilhos de Relatório ---
document.querySelectorAll('[data-trigger]').forEach(trigger => {
    trigger.addEventListener('click', e => {
        e.preventDefault();
        const triggerType = trigger.dataset.trigger;

        if (triggerType === 'relatorio-mov') {
            openRelatorioMovimentacoesModal();
        } else if (triggerType === 'relatorio-man') {
            openRelatorioManutencaoModal();
        } else if (triggerType === 'relatorio-est') {
            openRelatorioEstoqueModal();
        } else if (triggerType === 'relatorio-saida-combustivel') {
            openRelatorioSaidaCombustivelModal();
        }

        // Adicional: Fecha o menu mobile se estiver aberto
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.add('hidden');
        }
    });
});



    // --- FUNÇÃO GENÉRICA PARA CADASTROS (CRUD) ---
     const renderGenericCrud = async (config) => {
        const section = document.getElementById(config.sectionId);
        if (!section) return;

        const addButton = (USER_ROLE === 'gerente' || USER_ROLE === 'supervisor')
            ? `<button id="add-${config.entityName}-btn" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"><i class="fas fa-plus mr-2"></i>${config.addBtnText}</button>`
            : '';

        // --- NOVO HTML com campo de busca ---
        section.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 class="text-3xl font-bold text-gray-800">${config.title}</h2>
                <div class="w-full md:w-auto flex items-center gap-2">
                    <input type="search" id="search-${config.entityName}" class="w-full md:w-64 p-2 border rounded-md" placeholder="Buscar por nome...">
                    ${addButton}
                </div>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-100 text-gray-600 uppercase"><tr>${config.tableHeaders.map(h => `<th class="p-3">${h}</th>`).join('')}</tr></thead>
                    <tbody id="${config.entityName}-table-body"></tbody>
                </table>
            </div>
            <div id="pagination-${config.entityName}" class="flex justify-center items-center mt-4 space-x-2"></div>`;

        if (USER_ROLE === 'gerente' || USER_ROLE === 'supervisor') {
            document.getElementById(`add-${config.entityName}-btn`).addEventListener('click', () => config.openModalFn());
        }

        const tableBody = section.querySelector(`#${config.entityName}-table-body`);
        const paginationContainer = section.querySelector(`#pagination-${config.entityName}`);
        const searchInput = section.querySelector(`#search-${config.entityName}`);

        // --- NOVA FUNÇÃO para buscar e renderizar os dados ---
        const fetchData = async (page = 1, search = '') => {
            // 1. MOSTRAR O "LOADING"
            tableBody.innerHTML = `<tr><td colspan="${config.tableHeaders.length}" class="text-center p-8"><div class="loader mx-auto"></div></td></tr>`;
            paginationContainer.innerHTML = '';

            try {
                const url = `${config.endpoint}?page=${page}&search=${search}`;
                const response = await api.get(url);
                const items = response.data;

                if (items.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="${config.tableHeaders.length}" class="text-center p-8 text-gray-500">Nenhum item encontrado.</td></tr>`;
                } else {
                    tableBody.innerHTML = items.map(item => {
                        const actionButtons = (USER_ROLE === 'gerente')
                            ? `<button class="text-blue-600 hover:text-blue-800 mr-3 edit-btn" data-id="${item.id}" data-entity="${config.entityName}" title="Editar"><i class="fas fa-edit"></i></button>
                               <button class="text-red-600 hover:text-red-800 delete-btn" data-id="${item.id}" data-entity="${config.entityName}" title="Excluir"><i class="fas fa-trash"></i></button>`
                            : '';

                         // Adiciona o botão de detalhes específico para fornecedores
                        const detailsButton = (config.entityName === 'fornecedores')
                            ? `<button class="text-green-600 hover:text-green-800 mr-3 details-btn" data-id="${item.id}" data-name="${item.nome}" data-entity="notas-fiscais" title="Ver Notas Fiscais"><i class="fas fa-file-invoice"></i></button>`
                            : '';

                        return `<tr class="border-b hover:bg-gray-50">${config.renderRow(item)}<td class="p-3 text-center">${detailsButton}${actionButtons}</td></tr>`;
                    }).join('');
                }
                

                // 2. RENDERIZAR A PAGINAÇÃO
                renderPagination(response);

            } catch (error) {
                tableBody.innerHTML = `<tr><td colspan="${config.tableHeaders.length}" class="text-center p-8 text-red-500">Falha ao carregar dados.</td></tr>`;
            }
            
        };

        const renderPagination = (paginationData) => {
            let paginationHtml = '';
            if (paginationData.has_prev) {
                paginationHtml += `<button data-page="${paginationData.current_page - 1}" class="pagination-btn px-3 py-1 border rounded-md hover:bg-gray-100">Anterior</button>`;
            }

            for (let i = 1; i <= paginationData.total_pages; i++) {
                const activeClass = i === paginationData.current_page ? 'bg-green-600 text-white' : '';
                paginationHtml += `<button data-page="${i}" class="pagination-btn px-3 py-1 border rounded-md hover:bg-gray-100 ${activeClass}">${i}</button>`;
            }

            if (paginationData.has_next) {
                paginationHtml += `<button data-page="${paginationData.current_page + 1}" class="pagination-btn px-3 py-1 border rounded-md hover:bg-gray-100">Próximo</button>`;
            }
            paginationContainer.innerHTML = paginationHtml;
        };

        // 3. EVENT LISTENERS PARA BUSCA E PAGINAÇÃO
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                fetchData(1, e.target.value);
            }, 500); // Espera 500ms após o utilizador parar de digitar
        });
        
        paginationContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('pagination-btn')) {
                const page = e.target.dataset.page;
                fetchData(page, searchInput.value);
            }
        });

        // Carga inicial dos dados
        fetchData();
    };

    // --- Funções de Renderização Específicas ---
   const renderDashboard = async () => {
        const section = document.getElementById('dashboard');
        const logoUrl = '/static/icons/FazendaLogo.jpg'; // URL do logo da empresa
        // Adicionamos um novo card com um elemento <canvas> para o gráfico
        section.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"><h3 class="text-lg font-semibold text-gray-600">Total de Produtos</h3><p id="total-produtos" class="text-3xl font-bold text-blue-600 mt-2"></p></div>
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"><h3 class="text-lg font-semibold text-gray-600">Valor Total em Estoque</h3><p id="valor-estoque" class="text-3xl font-bold text-green-600 mt-2"></p></div>
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"><h3 class="text-lg font-semibold text-gray-600">Total de Combustível</h3><p id="total-combustivel" class="text-3xl font-bold text-orange-500 mt-2"></p></div>
            </div>
            
            <div class="mt-8 space-y-6">
                <!-- Seção do Logo Centralizado e Responsivo -->
                <div class="bg-white p-6 rounded-lg shadow-md flex justify-center items-center">
                    <img src="${logoUrl}" alt="Logo da Empresa" class="w-2/3 sm:w-1/2 md:w-1/3 max-w-sm object-contain">
                </div>

            </div>`;
        
        try {
            // Fazemos as chamadas à API em paralelo
            const [stats, gastosSetor] = await Promise.all([
                api.get('dashboard-stats'),
                api.get('relatorios/gastos-por-setor')
            ]);

            // Preenche os cards de estatísticas
            document.getElementById('total-produtos').textContent = stats.total_produtos;
            const valor = Number(stats.valor_total_estoque) || 0;
            document.getElementById('valor-estoque').textContent = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const combustivel = Number(stats.total_combustivel) || 0;
            document.getElementById('total-combustivel').textContent = `${combustivel.toFixed(2)} L`; // Exibe com "L" de litros
            
            // Preenche a tabela de movimentações recentes
          /*  const tableBody = document.getElementById('movimentacoes-recentes-table');
            if (stats.movimentacoes_recentes && stats.movimentacoes_recentes.length > 0) {
                tableBody.innerHTML = stats.movimentacoes_recentes.map(mov => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-2 font-medium">${mov.produto_nome}</td>
                        <td class="p-2"><span class="px-2 py-1 text-xs rounded-full ${mov.tipo === 'entrada' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">${mov.tipo}</span></td>
                        <td class="p-2">${mov.quantidade}</td>
                    </tr>`).join('');
            } else {
                tableBody.innerHTML = `<tr><td colspan="3" class="text-center p-8 text-gray-500">Nenhuma movimentação recente.</td></tr>`;
            }

            // --- LÓGICA PARA RENDERIZAR O GRÁFICO ---
            const ctx = document.getElementById('gastosSetorChart').getContext('2d');
            if (window.myChart instanceof Chart) {
                window.myChart.destroy(); // Destrói gráfico anterior para evitar sobreposição
            }

            window.myChart = new Chart(ctx, {
                type: 'bar', // Tipo de gráfico: barras
                data: {
                    labels: gastosSetor.map(d => d.setor), // Nomes dos setores no eixo X
                    datasets: [{
                        label: 'Valor Total Gasto (R$)',
                        data: gastosSetor.map(d => d.total), // Valores no eixo Y
                        backgroundColor: 'rgba(5, 150, 105, 0.6)',
                        borderColor: 'rgba(5, 150, 105, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) { return 'R$ ' + value; }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false // Esconde a legenda para um visual mais limpo
                        }
                    }
                }
            });*/

        } catch (error) {
            section.innerHTML = `<p class="text-center p-8 text-red-500">Não foi possível carregar os dados do dashboard.</p>`;
            console.error("Erro ao renderizar dashboard:", error);
        } 
    };


    
    const renderMovimentacoes = async () => {
    const section = document.getElementById('movimentacoes');
    
    // 1. Busca todos os dados necessários em paralelo
    const [produtosResponse, setoresResponse, funcionariosResponse, veiculosResponse] = await Promise.all([
        api.get('produtos?per_page=9999'),
        api.get('setores'),
        api.get('funcionarios'),
        api.get('veiculos')
    ]);
    
    const produtos = produtosResponse.data;
    const setores = setoresResponse.data;
    const funcionarios = funcionariosResponse.data;
    const veiculos = veiculosResponse.data;
    
    // Mapeia os produtos por ID para acesso rápido
    const produtosData = {};
    produtos.forEach(p => { produtosData[p.id] = p; });

    // Prepara as <options> para os selects
    const setoresOptions = setores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
    const funcionariosOptions = funcionarios.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
    const veiculosOptions = veiculos.map(v => `<option value="${v.id}">${v.nome}</option>`).join('');

    // 2. Define o novo HTML da seção com o campo de busca e o container de resultados
    section.innerHTML = `
        <h2 class="text-3xl font-bold text-gray-800 mb-6">Registar Movimentação</h2>
        <div class="bg-white p-8 rounded-lg shadow-md mb-8">
            <form id="movimentacao-form">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    <div class="relative">
                        <label class="block font-medium">Produto</label>
                        <input type="text" id="mov-produto-search" class="w-full p-2 border rounded-md" placeholder="Digite para buscar um produto..." required autocomplete="off">
                        <div id="search-results-container" class="absolute z-10 w-full bg-white border rounded-md mt-1 shadow-lg hidden max-h-60 overflow-y-auto"></div>
                        <input type="hidden" name="produto_id" id="mov-produto-id">
                    </div>

                    <div><label class="block font-medium">Tipo</label><select name="tipo" id="mov-tipo-select" class="w-full p-2 border rounded-md" required><option value="entrada">Entrada</option><option value="saida">Saída</option></select></div>
                    <div><label class="block font-medium">Quantidade</label><input type="number" name="quantidade" class="w-full p-2 border rounded-md" required min="1"></div>
                    <div class="lg:col-span-3"><label class="block font-medium">Setor</label><select name="setor_id" class="w-full p-2 border rounded-md" required>${setoresOptions}</select></div>
                </div>
                
                <div id="lote-validade-fields" class="hidden mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label class="block font-medium text-green-600">Número do Lote</label><input type="text" name="lote" class="w-full p-2 border rounded-md" placeholder="Ex: LOTE-A4521"></div>
                    <div><label class="block font-medium text-green-600">Data de Validade (Opcional)</label><input type="date" name="data_validade" class="w-full p-2 border rounded-md"></div>
                </div>

                <div id="funcionario-field" class="hidden mt-6">
                    <label class="block font-medium text-blue-600">Funcionário que Recebe o EPI</label>
                    <select name="funcionario_id" class="w-full p-2 border rounded-md">${funcionariosOptions}</select>
                </div>
                
                <div id="veiculo-field" class="hidden mt-6">
                    <label class="block font-medium text-purple-600">Veículo para Aplicação da Peça</label>
                    <select name="veiculo_id" class="w-full p-2 border rounded-md">${veiculosOptions}</select>
                </div>

                <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Registar</button></div>
            </form>
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-4">Histórico de Movimentações</h3>
        <div class="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
            <table class="w-full text-left text-sm"><thead class="bg-gray-100 text-gray-600 uppercase">
                 <tr><th class="p-3">Data</th><th class="p-3">Produto</th><th class="p-3">Tipo</th><th class="p-3">Qtd.</th><th class="p-3">Lote</th><th class="p-3">Setor</th><th class="p-3">Destino</th><th class="p-3">Utilizador</th><th class="p-3">Ações</th></tr>
            </thead><tbody id="movimentacoes-table-body"></tbody></table>
        </div>`;

    // 3. Lógica do Lookup (adaptada do seu exemplo)
    const searchInput = section.querySelector('#mov-produto-search');
    const resultsContainer = section.querySelector('#search-results-container');
    const produtoIdInput = section.querySelector('#mov-produto-id');
    let selectedResultIndex = -1;

    // Função para selecionar um produto e fechar a busca
    function selectProduct(product) {
        if (!product) return;
        searchInput.value = `${product.nome} (Est: ${product.estoque})`;
        produtoIdInput.value = product.id;
        resultsContainer.classList.add('hidden');
        toggleMovimentacaoFields();
    }
    
    // Mostra e filtra os resultados
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        selectedResultIndex = -1;
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('hidden');
            return;
        }

        const filteredProducts = produtos.filter(p => p.nome.toLowerCase().includes(query));
        
        resultsContainer.innerHTML = '';
        if (filteredProducts.length > 0) {
            filteredProducts.forEach(p => {
                const resultItem = document.createElement('a');
                resultItem.href = '#';
                resultItem.className = 'block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100';
                resultItem.textContent = `${p.nome} - Estoque: ${p.estoque}`;
                resultItem.dataset.productId = p.id;
                resultsContainer.appendChild(resultItem);
            });
            resultsContainer.classList.remove('hidden');
        } else {
            resultsContainer.classList.add('hidden');
        }
    });

    // Navegação com teclado
    searchInput.addEventListener('keydown', (e) => {
        const results = resultsContainer.querySelectorAll('a');
        if (results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedResultIndex = (selectedResultIndex + 1) % results.length;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedResultIndex = (selectedResultIndex - 1 + results.length) % results.length;
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedResultIndex > -1) {
                results[selectedResultIndex].click();
            }
        }
        
        results.forEach((item, index) => item.classList.toggle('bg-gray-200', index === selectedResultIndex));
    });

    // Seleção com o mouse
    resultsContainer.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.closest('a');
        if (target) {
            const product = produtos.find(p => p.id == target.dataset.productId);
            selectProduct(product);
        }
    });

    // Esconde a lista ao clicar fora
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });

    // 4. Lógica restante da função (sem alterações)
    const tipoSelect = section.querySelector('#mov-tipo-select');
    const funcionarioField = section.querySelector('#funcionario-field');
    const loteValidadeFields = section.querySelector('#lote-validade-fields');
    const veiculoField = section.querySelector('#veiculo-field');

    const toggleMovimentacaoFields = () => {
        const produtoId = produtoIdInput.value;
        const tipo = tipoSelect.value;
        const produto = produtosData[produtoId];

        funcionarioField.classList.add('hidden');
        funcionarioField.querySelector('select').removeAttribute('required');
        loteValidadeFields.classList.add('hidden');
        loteValidadeFields.querySelector('input[name="lote"]').removeAttribute('required');
        veiculoField.classList.add('hidden');
        veiculoField.querySelector('select').removeAttribute('required');

        if (tipo === 'entrada') {
            loteValidadeFields.classList.remove('hidden');
            loteValidadeFields.querySelector('input[name="lote"]').setAttribute('required', 'required');
        } else if (tipo === 'saida' && produto) {
            if (produto.is_epi) {
                funcionarioField.classList.remove('hidden');
                funcionarioField.querySelector('select').setAttribute('required', 'required');
            }
            if (produto.is_peca_veicular) {
                veiculoField.classList.remove('hidden');
                veiculoField.querySelector('select').setAttribute('required', 'required');
            }
        }
    };
    
    tipoSelect.addEventListener('change', toggleMovimentacaoFields);
    
    section.querySelector('#movimentacao-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        try {
            const result = await api.post('movimentacoes', data);
            alert(result.message);
            showSection('movimentacoes');
        } catch (error) {
            alert(error.message);
        }
    });

    const tableBody = section.querySelector('#movimentacoes-table-body');
    tableBody.innerHTML = `<tr><td colspan="9" class="text-center p-8"><div class="loader mx-auto"></div></td></tr>`;
    try {
        const movimentacoes = await api.get('movimentacoes');
        if (movimentacoes.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" class="text-center p-8 text-gray-500">Nenhuma movimentação registada.</td></tr>`;
        } else {
            tableBody.innerHTML = movimentacoes.map(m => {
                const destino = m.funcionario_nome 
                    ? `<span class="text-blue-600">${m.funcionario_nome}</span>` 
                    : (m.veiculo_nome ? `<span class="text-purple-600">${m.veiculo_nome}</span>` : '');
                const corrigirButton = (USER_ROLE === 'gerente')
                    ? `<button class="text-blue-600 hover:text-blue-800 edit-mov-btn" data-id="${m.id}" title="Corrigir Lançamento"><i class="fas fa-edit"></i></button>`
                    : '';
                return `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-3">${m.data}</td>
                        <td class="p-3 font-medium">${m.produto_nome}</td>
                        <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${m.tipo === 'entrada' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">${m.tipo}</span></td>
                        <td class="p-3">${m.quantidade}</td>
                        <td class="p-3">${m.lote || ''}</td>
                        <td class="p-3">${m.setor_nome}</td>
                        <td class="p-3">${destino}</td>
                        <td class="p-3 text-gray-500">${m.usuario_nome}</td>
                        <td class="p-3 text-center">${corrigirButton}</td>
                    </tr>`;
            }).join('');
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center p-8 text-red-500">Falha ao carregar dados.</td></tr>`;
    }
};
    const openMovimentacaoModal = async (id) => {
        let movimentacao;
        try {
            // Primeiro, buscamos os dados atuais da movimentação que será corrigida
            movimentacao = await api.get('movimentacoes', id);
        } catch (error) {
            alert('Não foi possível carregar os dados da movimentação.');
            return;
        }

        const title = 'Corrigir Lançamento de Movimentação';
        const formHtml = `
            <div class="space-y-4">
                <div class="bg-gray-100 p-4 rounded-md text-sm">
                    <p><strong>Produto:</strong> ${movimentacao.produto_nome}</p>
                    <p><strong>Data Original:</strong> ${movimentacao.data}</p>
                    <p><strong>Quantidade Original:</strong> ${movimentacao.quantidade}</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                     <div>
                        <label for="quantidade_corrigida" class="block font-medium">Nova Quantidade</label>
                        <input type="number" name="quantidade" class="w-full p-2 border rounded-md" value="${movimentacao.quantidade}" required>
                    </div>
                    <div>
                        <label for="motivo_correcao" class="block font-medium">Motivo da Correção</label>
                        <input type="text" name="motivo" class="w-full p-2 border rounded-md" placeholder="Ex: Erro de digitação" required>
                    </div>
                </div>

                <div class="pt-4 border-t">
                    <p class="font-bold text-red-600">Autorização do Gerente</p>
                    <p class="text-sm text-gray-600 mb-2">Para aplicar esta correção, um gerente deve autorizar com a sua senha.</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="gerente_username" class="block font-medium">Utilizador do Gerente</label>
                            <input type="text" name="gerente_username" class="w-full p-2 border rounded-md" required>
                        </div>
                        <div>
                            <label for="gerente_password" class="block font-medium">Senha do Gerente</label>
                            <input type="password" name="gerente_password" class="w-full p-2 border rounded-md" required>
                        </div>
                    </div>
                </div>
            </div>
            <div class="text-right mt-6 border-t pt-4">
                <button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar Correção</button>
            </div>`;

        openModal(title, formHtml, 'movimentacoes'); // Corrigido para 'movimentacoes'
        if (id) modalForm.dataset.editId = id;
    };   
    // Em app.js, substitua a sua função renderRelatorios por esta:

// Em app.js, substitua a sua função renderRelatorios por esta:


 // --- FUNÇÃO GENÉRICA PARA PÁGINA DE RELATÓRIO ---
    const renderRelatorioGenerico = (config) => {
        const section = document.getElementById(config.sectionId);
        if (!section) return;

        section.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-3xl font-bold text-gray-800 mb-2 flex items-center"><i class="${config.icon} fa-fw mr-4 text-gray-500"></i>${config.title}</h2>
                <p class="text-gray-600 mb-6">${config.description}</p>
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-t pt-6">
                    <div><label for="${config.entityName}-data-inicio" class="block font-medium text-sm">Data de Início</label><input type="date" id="${config.entityName}-data-inicio" class="w-full p-2 border rounded-md mt-1"></div>
                    <div><label for="${config.entityName}-data-fim" class="block font-medium text-sm">Data de Fim</label><input type="date" id="${config.entityName}-data-fim" class="w-full p-2 border rounded-md mt-1"></div>
                    <button id="consultar-${config.entityName}-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 w-full flex items-center justify-center"><i class="fas fa-search mr-2"></i>Consultar</button>
                    <button id="pdf-${config.entityName}-btn" class="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 w-full flex items-center justify-center"><i class="fas fa-file-pdf mr-2"></i>Imprimir PDF</button>
                </div>
                <div id="container-${config.entityName}" class="mt-6 hidden border-t pt-6"></div>
            </div>`;

        document.getElementById(`consultar-${config.entityName}-btn`).addEventListener('click', async () => {
            const dataInicio = document.getElementById(`${config.entityName}-data-inicio`).value;
            const dataFim = document.getElementById(`${config.entityName}-data-fim`).value;
            const container = document.getElementById(`container-${config.entityName}`);
            container.classList.remove('hidden');
            container.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div></div>`;
            try {
                const data = await api.get(`${config.endpoint}?data_inicio=${dataInicio}&data_fim=${dataFim}`);
                if (data.length === 0) {
                    container.innerHTML = `<p class="text-center p-8 text-gray-500">Nenhum resultado encontrado para o período selecionado.</p>`;
                    return;
                }
                const tableHeaders = `<tr>${config.tableHeaders.map(h => `<th class="p-3">${h}</th>`).join('')}</tr>`;
                const tableRows = data.map(item => `<tr class="border-b hover:bg-gray-50">${config.renderRow(item)}</tr>`).join('');
                container.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-gray-100 text-gray-600 uppercase">${tableHeaders}</thead><tbody>${tableRows}</tbody></table></div>`;
            } catch (error) {
                container.innerHTML = `<p class="text-center p-8 text-red-500">Falha ao gerar o relatório.</p>`;
            }
        });

        document.getElementById(`pdf-${config.entityName}-btn`).addEventListener('click', () => {
            const dataInicio = document.getElementById(`${config.entityName}-data-inicio`).value;
            const dataFim = document.getElementById(`${config.entityName}-data-fim`).value;
            if (!dataInicio || !dataFim) {
                alert("Por favor, selecione a data de início e a data de fim para gerar o PDF.");
                return;
            }
            window.open(`/api/${config.endpoint}/pdf?data_inicio=${dataInicio}&data_fim=${dataFim}`, '_blank');
        });
    };



    // --- Funções que abrem os Modais ---
    const openModal = (title, formHtml, entity) => {
        if(modal && modalTitle && modalForm) {
            modalForm.removeAttribute('data-edit-id');
            modalTitle.textContent = title;
            modalForm.innerHTML = formHtml;
            modalForm.dataset.entity = entity;
            modal.classList.remove('hidden');
            // Adiciona um novo estado ao histórico do navegador quando o modal é aberto
            history.pushState({ modal: true }, null);
        }
    };
    const openSetorModal = async (id = null) => {
        let setor = { nome: '', descricao: '' };
        let title = 'Adicionar Novo Setor';
        if (id) {
            try {
                setor = await api.get('setores', id);
                title = 'Editar Setor';
            } catch (error) { alert('Não foi possível carregar os dados do setor.'); return; }
        }
        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome do Setor</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${setor.nome}" required></div>
                <div><label class="block font-medium">Descrição</label><textarea name="descricao" class="w-full p-2 border rounded-md" rows="3">${setor.descricao || ''}</textarea></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'setores');
        if (id) modalForm.dataset.editId = id;
    };
    const openCategoriaModal = async (id = null) => {
        let categoria = { nome: '', descricao: '' };
        let title = 'Adicionar Nova Categoria';
        if (id) {
            try {
                categoria = await api.get('categorias', id);
                title = 'Editar Categoria';
            } catch (error) { alert('Não foi possível carregar os dados da categoria.'); return; }
        }
        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome da Categoria</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${categoria.nome}" required></div>
                <div><label class="block font-medium">Descrição</label><textarea name="descricao" class="w-full p-2 border rounded-md" rows="3">${categoria.descricao || ''}</textarea></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'categorias');
        if (id) modalForm.dataset.editId = id;
    };
    const openAlmoxarifadoModal = async (id = null) => {
        let almoxarifado = { nome: '', localizacao: '' };
        let title = 'Adicionar Novo Almoxarifado';
        if (id) {
            try {
                almoxarifado = await api.get('almoxarifados', id);
                title = 'Editar Almoxarifado';
            } catch (error) { alert('Não foi possível carregar os dados do almoxarifado.'); return; }
        }
        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome do Almoxarifado</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${almoxarifado.nome}" required></div>
                <div><label class="block font-medium">Localização</label><input type="text" name="localizacao" class="w-full p-2 border rounded-md" value="${almoxarifado.localizacao || ''}"></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'almoxarifados');
        if (id) modalForm.dataset.editId = id;
    };
    const openProdutoModal = async (id = null) => {
        try {
            // Buscamos a resposta completa (objeto de paginação)
            const [categoriasResponse, almoxarifadosResponse, fornecedoresResponse] = await Promise.all([
                api.get('categorias?page=1&search='), 
                api.get('almoxarifados?page=1&search='),
                api.get('fornecedores') // Busca a lista de fornecedores
            ]);
    
            // Extraímos a lista de dados da propriedade 'data'
            const categorias = categoriasResponse.data;
            const almoxarifados = almoxarifadosResponse.data;
            const fornecedores = fornecedoresResponse.data;
            const categoriasOptions = categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
            const almoxarifadosOptions = almoxarifados.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
            const fornecedoresOptions = `<option value="">Nenhum</option>` + fornecedores.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
            let produto = { 
                nome: '', unidade: '', preco_unitario: '', estoque: 0, 
                categoria_id: '', almoxarifado_id: '', fornecedor_id: '', is_epi: false, is_peca_veicular: false 
            };
            let title = 'Adicionar Novo Produto';
    
            if (id) {
                produto = await api.get('produtos', id);
                title = 'Editar Produto';
            }
    
            const formHtml = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2"><label class="block font-medium">Nome do Produto</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${produto.nome}" required></div>
                    <div><label class="block font-medium">Categoria</label><select name="categoria_id" class="w-full p-2 border rounded-md" required>${categoriasOptions}</select></div>
                    <div><label class="block font-medium">Almoxarifado</label><select name="almoxarifado_id" class="w-full p-2 border rounded-md" required>${almoxarifadosOptions}</select></div>
                    <div class="md:col-span-2"><label class="block font-medium">Fornecedor (Opcional)</label><select name="fornecedor_id" class="w-full p-2 border rounded-md">${fornecedoresOptions}</select></div>
                    <div id="add-nota-produto-container" class="md:col-span-2 hidden">
                        <button type="button" id="add-nota-produto-btn" class="text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600">Adicionar Nota Fiscal para este Fornecedor</button>
                    </div>
                    <div><label class="block font-medium">Unidade (ex: kg, un, L)</label><input type="text" name="unidade" class="w-full p-2 border rounded-md" value="${produto.unidade || ''}"></div>
                    <div><label class="block font-medium">Preço Unitário (R$)</label><input type="number" step="0.01" name="preco_unitario" class="w-full p-2 border rounded-md" value="${produto.preco_unitario || ''}"></div>
                    <div><label class="block font-medium">Estoque Atual</label><input type="number" name="estoque" class="w-full p-2 border rounded-md" value="${produto.estoque}"></div>
                </div>
                <div class="mt-4 pt-4 border-t space-y-3">
                     <label class="flex items-center space-x-3">
                        <input type="checkbox" name="is_epi" class="h-5 w-5" ${produto.is_epi ? 'checked' : ''}>
                        <span class="text-gray-700 font-medium">Este produto é um EPI (Equipamento de Proteção Individual)</span>
                    </label>
                    <label class="flex items-center space-x-3">
                        <input type="checkbox" name="is_peca_veicular" class="h-5 w-5" ${produto.is_peca_veicular ? 'checked' : ''}>
                        <span class="text-gray-700 font-medium">Este produto é uma Peça Veicular</span>
                    </label>
                </div>
                <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
            
            openModal(title, formHtml, 'produtos');
            // --- ADICIONE ESTE BLOCO DE CÓDIGO NO FINAL DA FUNÇÃO ---
            const fornecedorSelect = modalForm.querySelector('select[name="fornecedor_id"]');
            const addNotaContainer = modalForm.querySelector('#add-nota-produto-container');
            const addNotaBtn = modalForm.querySelector('#add-nota-produto-btn');

            const toggleNotaButton = () => {
                const fornecedorId = fornecedorSelect.value;
                addNotaContainer.classList.toggle('hidden', !fornecedorId);
            };
            fornecedorSelect.addEventListener('change', toggleNotaButton);
            addNotaBtn.addEventListener('click', () => {
                const fornecedorId = fornecedorSelect.value;
                if (fornecedorId) {
                    openNotaFiscalFormModal(fornecedorId);
                }
            });
            if (id) {
                modalForm.dataset.editId = id;
                modalForm.querySelector('select[name="categoria_id"]').value = produto.categoria_id;
                modalForm.querySelector('select[name="almoxarifado_id"]').value = produto.almoxarifado_id;
                if (produto.fornecedor_id) {
                    modalForm.querySelector('select[name="fornecedor_id"]').value = produto.fornecedor_id;
                }
            }
        } catch (error) {
            alert('Não foi possível carregar os dados para o modal de produtos.');
            console.error(error);
        }
    };   

        const openFuncionarioModal = async (id = null) => {
        // --- CORREÇÃO APLICADA AQUI ---
        // Busca a resposta completa do servidor (o objeto de paginação)
        const setoresResponse = await api.get('setores');
        // E extrai a lista de dados de dentro da propriedade 'data'
        const setores = setoresResponse.data;
        // --- FIM DA MODIFICAÇÃO ---
    
        const setoresOptions = setores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
        
        let funcionario = { nome: '', cargo: '', setor_id: '' };
        let title = 'Adicionar Novo Funcionário';
        
        if (id) {
            try {
                funcionario = await api.get('funcionarios', id);
                title = 'Editar Funcionário';
            } catch (error) { 
                alert('Não foi possível carregar os dados do funcionário.'); 
                return; 
            }
        }
    
        const formHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block font-medium">Nome Completo</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${funcionario.nome}" required></div>
                <div><label class="block font-medium">Cargo</label><input type="text" name="cargo" class="w-full p-2 border rounded-md" value="${funcionario.cargo || ''}"></div>
                <div class="md:col-span-2"><label class="block font-medium">Setor</label><select name="setor_id" class="w-full p-2 border rounded-md" required>${setoresOptions}</select></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        
        openModal(title, formHtml, 'funcionarios');
        
        if (id) {
            modalForm.dataset.editId = id;
            modalForm.querySelector('select[name="setor_id"]').value = funcionario.setor_id;
        }
    };
    const openFuncaoModal = async (id = null) => {
        let funcao = { nome: '', descricao: '' };
        let title = 'Adicionar Nova Função';
        if (id) {
            try {
                funcao = await api.get('funcoes', id);
                title = 'Editar Função';
            } catch (error) { alert('Não foi possível carregar os dados da função.'); return; }
        }
        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome da Função</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${funcao.nome}" required></div>
                <div><label class="block font-medium">Descrição</label><textarea name="descricao" class="w-full p-2 border rounded-md" rows="3">${funcao.descricao || ''}</textarea></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'funcoes');
        if (id) modalForm.dataset.editId = id;
    };
    const openUsuarioModal = async (id = null) => {
        let user = { username: '', role: 'supervisor' };
        let title = 'Adicionar Novo Utilizador';
        if (id) {
            try {
                user = await api.get('usuarios', id);
                title = 'Editar Utilizador';
            } catch (error) { alert('Não foi possível carregar os dados do utilizador.'); return; }
        }
        
        const passwordField = id 
            ? `<div><label class="block font-medium">Nova Senha</label><input type="password" name="password" class="w-full p-2 border rounded-md" placeholder="Deixe em branco para não alterar"></div>`
            : `<div><label class="block font-medium">Senha</label><input type="password" name="password" class="w-full p-2 border rounded-md" required></div>`;

        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome de Utilizador</label><input type="text" name="username" class="w-full p-2 border rounded-md" value="${user.username}" required></div>
                ${passwordField}
                <div>
                    <label class="block font-medium">Perfil</label>
                    <select name="role" class="w-full p-2 border rounded-md">
                        <option value="gerente" ${user.role === 'gerente' ? 'selected' : ''}>Gerente</option>
                        <option value="supervisor" ${user.role === 'supervisor' ? 'selected' : ''}>Supervisor</option>
                        <option value="operador" ${user.role === 'operador' ? 'selected' : ''}>Operador</option>
                    </select>
                </div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'usuarios');
        if (id) modalForm.dataset.editId = id;
    };
    const openTipoCombustivelModal = async (id = null) => {
        let tipo = { nome: '' };
        let title = 'Adicionar Novo Tipo de Combustível';
        if (id) {
            try {
                tipo = await api.get('tipos_combustivel', id);
                title = 'Editar Tipo de Combustível';
            } catch (error) { alert('Não foi possível carregar os dados.'); return; }
        }
        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome (ex: Diesel S10, Gasolina)</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${tipo.nome}" required></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'tipos_combustivel');
        if (id) modalForm.dataset.editId = id;
    };
    const openTipoVeiculoModal = async (id = null) => {
        let tipo = { nome: '' };
        let title = 'Adicionar Novo Tipo de Veículo';
        if (id) {
            try {
                tipo = await api.get('tipos_veiculo', id);
                title = 'Editar Tipo de Veículo';
            } catch (error) { alert('Não foi possível carregar os dados.'); return; }
        }
        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome (ex: Trator, Camião)</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${tipo.nome}" required></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'tipos_veiculo');
        if (id) modalForm.dataset.editId = id;
    };
    // Em app/static/js/app.js

    const openVeiculoModal = async (id = null) => {
        // --- CORREÇÃO APLICADA AQUI ---
        // Busca a resposta completa do servidor (o objeto de paginação)
        const tiposVeiculoResponse = await api.get('tipos_veiculo');
        // E extrai a lista de dados de dentro da propriedade 'data'
        const tiposVeiculo = tiposVeiculoResponse.data;
        // --- FIM DA MODIFICAÇÃO ---
    
        const tiposOptions = tiposVeiculo.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
    
        let veiculo = { nome: '', placa: '', tipo_veiculo_id: '' };
        let title = 'Adicionar Novo Veículo';
        if (id) {
            try {
                veiculo = await api.get('veiculos', id);
                title = 'Editar Veículo';
            } catch (error) { 
                alert('Não foi possível carregar os dados do veículo.'); 
                return; 
            }
        }
    
        const formHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block font-medium">Nome do Veículo</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${veiculo.nome}" required></div>
                <div><label class="block font-medium">Placa</label><input type="text" name="placa" class="w-full p-2 border rounded-md" value="${veiculo.placa || ''}"></div>
                <div class="md:col-span-2"><label class="block font-medium">Tipo de Veículo</label><select name="tipo_veiculo_id" class="w-full p-2 border rounded-md" required>${tiposOptions}</select></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        
        openModal(title, formHtml, 'veiculos');
        
        if (id) {
            modalForm.dataset.editId = id;
            modalForm.querySelector('select[name="tipo_veiculo_id"]').value = veiculo.tipo_veiculo_id;
        }
    };

// SUBSTITUA a sua função renderControleCombustivel por esta versão completa
const renderControleCombustivel = async () => {
    const section = document.getElementById('controle_combustivel');
    section.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div></div>`;

    try {
        const [dados, entradas, tiposCombustivelResponse, veiculosResponse, funcoesResponse, fornecedoresResponse] = await Promise.all([
            api.get('combustivel/dados'),
            api.get('combustivel/entradas'),
            api.get('tipos_combustivel'),
            api.get('veiculos'),
            api.get('funcoes'),
            api.get('fornecedores')
        ]);

        const tiposCombustivel = tiposCombustivelResponse.data;
        const veiculos = veiculosResponse.data;
        const funcoes = funcoesResponse.data;
        const fornecedores = fornecedoresResponse.data;
        const funcionarios = dados.funcionarios;
        const implementos = dados.implementos;

        const tiposCombustivelOptions = tiposCombustivel.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
        const veiculosOptions = veiculos.map(v => `<option value="${v.id}" data-hodometro="${v.hodometro_horimetro || 0}">${v.nome}</option>`).join('');
        const funcoesOptions = funcoes.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
        const fornecedoresOptions = `<option value="">Nenhum</option>` + fornecedores.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
        const funcionariosOptions = funcionarios.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
        const implementosOptions = '<option value="">Nenhum</option>' + implementos.map(i => `<option value="${i.id}">${i.nome}</option>`).join('');
    
        const stockCards = dados.estoque.map(e => `
            <div class="bg-white p-4 rounded-lg shadow-sm border">
                <h4 class="font-semibold text-gray-700">${e.tipo_combustivel_nome}</h4>
                <p class="text-2xl font-bold text-gray-900">${e.quantidade.toFixed(2)} L</p>
            </div>
        `).join('');

        section.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                 <h2 class="text-3xl font-bold text-gray-800">Controle de Combustível</h2>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-md mb-6">
                <h3 class="text-lg font-bold mb-4">Estoque Atual</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">${stockCards || '<p>Nenhum estoque.</p>'}</div>
            </div>

            <!-- =====> NOVO ESTILO DE ABAS APLICADO AQUI <===== -->
            <div class="mb-0">
                <ul class="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200" id="combustivel-tabs">
                    <li class="mr-2">
                        <button data-tab="saidas" class="tab-btn active-tab inline-flex items-center p-4 text-blue-600 bg-gray-100 rounded-t-lg active">
                            <i class="fas fa-gas-pump mr-2"></i>Registrar Saída (Abastecimento)
                        </button>
                    </li>
                    <li class="mr-2">
                        <button data-tab="entradas" class="tab-btn inline-block p-4 rounded-t-lg hover:text-gray-600 hover:bg-gray-50">
                            <i class="fas fa-dolly mr-2"></i>Registrar Entrada (Compra)
                        </button>
                    </li>
                </ul>
            </div>
            <!-- ============================================== -->

            <div>
                <div id="tab-content-saidas" class="tab-content space-y-6">
                    <div class="bg-white p-6 rounded-b-xl rounded-tr-xl shadow-md border-t-0 border">
                        <h3 class="text-lg font-bold mb-4">Formulário de Saída</h3>
                        <form id="form-saida-combustivel" class="space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label class="block text-sm font-medium">Data</label><input type="date" name="data" class="w-full p-2 border rounded-md" value="${new Date().toISOString().slice(0, 10)}" required></div>
                                <div><label class="block text-sm font-medium">Funcionário</label><select name="funcionario_id" class="w-full p-2 border rounded-md" required>${funcionariosOptions}</select></div>
                                <div><label class="block text-sm font-medium">Veículo</label><select name="veiculo_id" id="saida-veiculo-select" class="w-full p-2 border rounded-md" required>${veiculosOptions}</select></div>
                                <div><label class="block text-sm font-medium">Implemento</label><select name="implemento_id" class="w-full p-2 border rounded-md">${implementosOptions}</select></div>
                                <div><label class="block text-sm font-medium">Tipo de Combustível</label><select name="tipo_combustivel_id" class="w-full p-2 border rounded-md" required>${tiposCombustivelOptions}</select></div>
                                <div><label class="block text-sm font-medium">Função / Tarefa</label><select name="funcao_id" class="w-full p-2 border rounded-md" required>${funcoesOptions}</select></div>
                                <div><label class="block text-sm font-medium">Horímetro Inicial</label><input type="number" id="horimetro_inicial" name="horimetro_inicial" step="0.1" class="w-full p-2 border rounded-md" required></div>
                                <div><label class="block text-sm font-medium">Horímetro Final</label><input type="number" id="horimetro_final" name="horimetro_final" step="0.1" class="w-full p-2 border rounded-md" required></div>
                                <div><label class="block text-sm font-medium">Total Horas/Km</label><input type="text" id="total_horas_km" class="w-full p-2 border rounded-md bg-gray-100" readonly></div>
                            </div>
                            <div><label class="block text-sm font-medium">Quantidade Abastecida (L)</label><input type="number" name="quantidade_abastecida" step="0.01" class="w-full p-2 border rounded-md" required></div>
                            <div><label class="block text-sm font-medium">Descrição (Opcional)</label><textarea name="descricao" rows="2" class="w-full p-2 border rounded-md"></textarea></div>
                            <div class="text-right"><button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg">Registrar Saída</button></div>
                        </form>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-md">
                        <h3 class="text-lg font-bold mb-4">Histórico Recente de Saídas</h3>
                        <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-gray-50"><tr><th class="p-2">Data</th><th class="p-2">Veículo</th><th class="p-2">Função</th><th class="p-2">Qtd (L)</th><th class="p-2">Utilizador</th><th class="p-2">Ações</th></tr></thead><tbody id="historico-saidas-combustivel"></tbody></table></div>
                    </div>
                </div>
                <div id="tab-content-entradas" class="tab-content space-y-6 hidden">
                     <div class="bg-white p-6 rounded-b-xl rounded-tr-xl shadow-md border-t-0 border">
                        <h3 class="text-lg font-bold mb-4">Formulário de Entrada</h3>
                        <form id="form-entrada-combustivel" class="space-y-4">
                            <div><label>Tipo de Combustível</label><select name="tipo_combustivel_id" class="w-full p-2 border rounded-md" required>${tiposCombustivelOptions}</select></div>
                            <div><label>Fornecedor (Opcional)</label><select name="fornecedor_id" id="entrada-fornecedor-select" class="w-full p-2 border rounded-md">${fornecedoresOptions}</select></div>
                            <div id="add-nota-combustivel-container" class="hidden">
                                <button type="button" id="add-nota-combustivel-btn" class="text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 w-full">Adicionar Nota Fiscal para este Fornecedor</button>
                            </div>
                            <div><label>Quantidade (Litros)</label><input type="number" name="quantidade" step="0.01" class="w-full p-2 border rounded-md" required></div>
                            <div><label>Preço por Litro (R$)</label><input type="number" name="preco_litro" step="0.01" class="w-full p-2 border rounded-md" required></div>
                            <div class="text-right"><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Registrar Entrada</button></div>
                        </form>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-md">
                        <h3 class="text-lg font-bold mb-4">Histórico Recente de Entradas</h3>
                        <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-gray-50"><tr><th class="p-2">Data</th><th class="p-2">Combustível</th><th class="p-2">Qtd</th><th class="p-2">Preço/L</th><th class="p-2">Ações</th></tr></thead><tbody id="historico-entradas-combustivel"></tbody></table></div>
                    </div>
                </div>
            </div>
        `;

        // LÓGICA DE EVENTOS (COM NOVA LÓGICA PARA O ESTILO DAS ABAS)

        const tabsContainer = section.querySelector('#combustivel-tabs');
        if (tabsContainer) {
            tabsContainer.addEventListener('click', (e) => {
                const clickedButton = e.target.closest('button');
                if (!clickedButton) return;
                
                const tab = clickedButton.dataset.tab;
                
                // =====> NOVA LÓGICA DE ESTILO <=====
                section.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('bg-gray-100', 'text-blue-600', 'active-tab');
                    btn.classList.add('hover:text-gray-600', 'hover:bg-gray-50');
                });
                clickedButton.classList.add('bg-gray-100', 'text-blue-600', 'active-tab');
                clickedButton.classList.remove('hover:text-gray-600', 'hover:bg-gray-50');
                // ==================================

                section.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
                const activeTab = section.querySelector(`#tab-content-${tab}`);
                if (activeTab) activeTab.classList.remove('hidden');
            });
        }

        // Lógica para o botão da nota fiscal
        const fornecedorSelectComb = section.querySelector('#entrada-fornecedor-select');
        const addNotaContainerComb = section.querySelector('#add-nota-combustivel-container');
        if (fornecedorSelectComb && addNotaContainerComb) {
            fornecedorSelectComb.addEventListener('change', () => {
                addNotaContainerComb.classList.toggle('hidden', !fornecedorSelectComb.value);
            });
        }
        const addNotaBtnComb = section.querySelector('#add-nota-combustivel-btn');
        if (addNotaBtnComb) {
            addNotaBtnComb.addEventListener('click', () => {
                if (fornecedorSelectComb.value) {
                    openNotaFiscalFormModal(fornecedorSelectComb.value);
                }
            });
        }
        
        // Lógica para o formulário de ENTRADA
        const formEntrada = section.querySelector('#form-entrada-combustivel');
        if (formEntrada) {
            formEntrada.addEventListener('submit', async e => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.target).entries());
                try {
                    const result = await api.post('combustivel/entradas', data);
                    alert(result.message);
                    showSection('controle_combustivel');
                } catch (error) {
                    alert(error.message);
                }
            });
        }

        // Lógica para o formulário de SAÍDA
        const formSaida = section.querySelector('#form-saida-combustivel');
        if (formSaida) {
            formSaida.addEventListener('submit', async e => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.target).entries());
                try {
                    const result = await api.post('combustivel/saidas', data);
                    alert(result.message);
                    showSection('controle_combustivel');
                } catch (error) {
                    alert(error.message);
                }
            });
        }

        // Lógica do cálculo de horímetro
        const horimetroInicialInput = section.querySelector('#horimetro_inicial');
        const horimetroFinalInput = section.querySelector('#horimetro_final');
        const totalHorasKmInput = section.querySelector('#total_horas_km');
        const veiculoSelectSaida = section.querySelector('#saida-veiculo-select');

        const calcularTotalHorimetro = () => {
            const inicio = parseFloat(horimetroInicialInput.value);
            const fim = parseFloat(horimetroFinalInput.value);
            if (!isNaN(inicio) && !isNaN(fim) && fim >= inicio) {
                totalHorasKmInput.value = (fim - inicio).toFixed(2);
            } else {
                totalHorasKmInput.value = '';
            }
        };
        if (horimetroInicialInput && horimetroFinalInput) {
            horimetroInicialInput.addEventListener('input', calcularTotalHorimetro);
            horimetroFinalInput.addEventListener('input', calcularTotalHorimetro);
        }

        const preencherHorimetroInicial = () => {
            if (veiculoSelectSaida.options.length > 0) {
                const selectedOption = veiculoSelectSaida.options[veiculoSelectSaida.selectedIndex];
                const ultimoRegisto = selectedOption.dataset.hodometro || 0;
                horimetroInicialInput.value = ultimoRegisto;
            }
        };
        if (veiculoSelectSaida) {
            veiculoSelectSaida.addEventListener('change', preencherHorimetroInicial);
            preencherHorimetroInicial();
        }

        // =====> CORREÇÃO PRINCIPAL AQUI <=====
        // Preenchimento das tabelas
        const tableBodyEntradas = section.querySelector('#historico-entradas-combustivel');
        if (tableBodyEntradas) {
            tableBodyEntradas.innerHTML = entradas.map(e => `
                <tr class="border-b">
                    <td class="p-2">${e.data}</td>
                    <td class="p-2">${e.tipo_combustivel}</td>
                    <td class="p-2">${e.quantidade.toFixed(2)} L</td>
                    <td class="p-2">R$ ${e.preco_litro.toFixed(2)}</td>
                    <td class="p-2">
                        <button data-action="edit-combustivel-entrada" data-id="${e.id}" class="text-blue-600 hover:text-blue-800" title="Editar"><i class="fas fa-edit"></i></button>
                        <button data-action="delete-combustivel-entrada" data-id="${e.id}" class="text-red-600 hover:text-red-800 ml-2" title="Excluir"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('') || `<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhuma entrada registrada.</td></tr>`;
        }
        
        const tableBodySaidas = section.querySelector('#historico-saidas-combustivel');
        if (tableBodySaidas) {
            tableBodySaidas.innerHTML = dados.historico.map(s => `
                <tr class="border-b">
                    <td class="p-2">${s.data}</td>
                    <td class="p-2">${s.veiculo_nome}</td>
                    <td class="p-2">${s.funcao_nome}</td>
                    <td class="p-2">${s.quantidade.toFixed(2)}</td>
                    <td class="p-2">${s.funcionario_nome}</td>
                    <td class="p-2">
                        <button data-action="edit-combustivel-saida" data-id="${s.id}" class="text-blue-600 hover:text-blue-800" title="Editar"><i class="fas fa-edit"></i></button>
                        <button data-action="delete-combustivel-saida" data-id="${s.id}" class="text-red-600 hover:text-red-800 ml-2" title="Excluir"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('') || `<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhuma saída registrada.</td></tr>`;
        }

    } catch (error) {
        section.innerHTML = '<p class="text-center text-red-500">Falha ao carregar dados do controle de combustível.</p>';
        console.error("Erro em renderControleCombustivel:", error);
    }
};

// Função para abrir o modal de EDIÇÃO de SAÍDA de combustível
async function openEditCombustivelSaidaModal(id) {
    try {
        const [saida, dados, tiposCombustivelResponse, veiculosResponse, funcoesResponse] = await Promise.all([
            api.get('combustivel/saidas', id),
            api.get('combustivel/dados'),
            api.get('tipos_combustivel'),
            api.get('veiculos'),
            api.get('funcoes')
        ]);

        const funcionariosOptions = dados.funcionarios.map(f => `<option value="${f.id}" ${f.id === saida.funcionario_id ? 'selected' : ''}>${f.nome}</option>`).join('');
        const veiculosOptions = veiculosResponse.data.map(v => `<option value="${v.id}" ${v.id === saida.veiculo_id ? 'selected' : ''}>${v.nome}</option>`).join('');
        const implementosOptions = '<option value="">Nenhum</option>' + dados.implementos.map(i => `<option value="${i.id}" ${i.id === saida.implemento_id ? 'selected' : ''}>${i.nome}</option>`).join('');
        const tiposOptions = tiposCombustivelResponse.data.map(t => `<option value="${t.id}" ${t.id === saida.tipo_combustivel_id ? 'selected' : ''}>${t.nome}</option>`).join('');
        const funcoesOptions = funcoesResponse.data.map(f => `<option value="${f.id}" ${f.id === saida.funcao_id ? 'selected' : ''}>${f.nome}</option>`).join('');

        // =====> 1. HTML DO FORMULÁRIO CORRIGIDO <=====
        const formHtml = `
            <div class="space-y-4">
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium">Data</label><input type="date" name="data" class="w-full p-2 border rounded-md" value="${saida.data}" required></div>
                    <div><label class="block text-sm font-medium">Funcionário</label><select name="funcionario_id" class="w-full p-2 border rounded-md" required>${funcionariosOptions}</select></div>
                    <div><label class="block text-sm font-medium">Veículo</label><select name="veiculo_id" class="w-full p-2 border rounded-md" required>${veiculosOptions}</select></div>
                    <div><label class="block text-sm font-medium">Implemento</label><select name="implemento_id" class="w-full p-2 border rounded-md">${implementosOptions}</select></div>
                    <div><label class="block text-sm font-medium">Tipo de Combustível</label><select name="tipo_combustivel_id" class="w-full p-2 border rounded-md" required>${tiposOptions}</select></div>
                    <div><label class="block text-sm font-medium">Função / Tarefa</label><select name="funcao_id" class="w-full p-2 border rounded-md" required>${funcoesOptions}</select></div>
                    
                    <div><label class="block text-sm font-medium">Horímetro Inicial</label><input type="number" id="edit_horimetro_inicial" name="horimetro_inicial" step="0.1" class="w-full p-2 border rounded-md" value="${saida.horimetro_inicial || ''}" required></div>
                    <div><label class="block text-sm font-medium">Horímetro Final</label><input type="number" id="edit_horimetro_final" name="horimetro_final" step="0.1" class="w-full p-2 border rounded-md" value="${saida.horimetro_final || ''}" required></div>
                    
                    <div><label class="block text-sm font-medium">Total Horas/Km</label><input type="text" id="edit_total_horas_km" class="w-full p-2 border rounded-md bg-gray-100" readonly></div>

                    <div><label class="block text-sm font-medium">Quantidade Abastecida (L)</label><input type="number" name="quantidade_abastecida" step="0.01" class="w-full p-2 border rounded-md" value="${saida.quantidade_abastecida}" required></div>
                </div>
                <div><label class="block text-sm font-medium">Descrição (Opcional)</label><textarea name="descricao" rows="2" class="w-full p-2 border rounded-md">${saida.descricao || ''}</textarea></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar Alterações</button></div>`;
        
        openModal('Editar Saída de Combustível', formHtml, 'combustivel/saidas'); // ANTES: 'combustivel-saidas'
    modalForm.dataset.editId = id;

        // =====> 2. LÓGICA DE CÁLCULO ADICIONADA AO MODAL <=====
        const hInicialModal = document.getElementById('edit_horimetro_inicial');
        const hFinalModal = document.getElementById('edit_horimetro_final');
        const hTotalModal = document.getElementById('edit_total_horas_km');

        const calcularTotalModal = () => {
            const inicio = parseFloat(hInicialModal.value);
            const fim = parseFloat(hFinalModal.value);
            if (!isNaN(inicio) && !isNaN(fim) && fim >= inicio) {
                hTotalModal.value = (fim - inicio).toFixed(2);
            } else {
                hTotalModal.value = '';
            }
        };

        hInicialModal.addEventListener('input', calcularTotalModal);
        hFinalModal.addEventListener('input', calcularTotalModal);
        
        // Calcula o valor inicial assim que o modal abre
        calcularTotalModal();

    } catch (error) {
      alert('Não foi possível carregar os dados para edição.');
      console.error('Erro ao abrir modal de edição de saída:', error);
    }
}

// Função para EXCLUIR uma SAÍDA de combustível
async function deleteCombustivelSaida(id) {
    if (confirm('Tem certeza que deseja excluir esta saída? O valor será devolvido ao estoque.')) {
        try {
            const result = await api.delete('combustivel/saidas', id);
            alert(result.message);
            showSection('controle_combustivel');
        } catch (error) {
            alert(error.message);
        }
    }
}

// Função para abrir o modal de EDIÇÃO de entrada de combustível
async function openEditCombustivelEntradaModal(id) {
    try {
        const [entrada, tiposCombustivelResponse, fornecedoresResponse] = await Promise.all([
            api.get('combustivel/entradas', id),
            api.get('tipos_combustivel'),
            api.get('fornecedores')
        ]);

        const tiposOptions = tiposCombustivelResponse.data.map(t => `<option value="${t.id}" ${t.id === entrada.tipo_combustivel_id ? 'selected' : ''}>${t.nome}</option>`).join('');
        const fornecedoresOptions = '<option value="">Nenhum</option>' + fornecedoresResponse.data.map(f => `<option value="${f.id}" ${f.id === entrada.fornecedor_id ? 'selected' : ''}>${f.nome}</option>`).join('');

        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Tipo de Combustível</label><select name="tipo_combustivel_id" class="w-full p-2 border rounded-md" required>${tiposOptions}</select></div>
                <div><label class="block font-medium">Fornecedor (Opcional)</label><select name="fornecedor_id" class="w-full p-2 border rounded-md">${fornecedoresOptions}</select></div>
                <div><label class="block font-medium">Quantidade (Litros)</label><input type="number" name="quantidade" step="0.01" class="w-full p-2 border rounded-md" value="${entrada.quantidade}" required></div>
                <div><label class="block font-medium">Preço por Litro (R$)</label><input type="number" name="preco_litro" step="0.01" class="w-full p-2 border rounded-md" value="${entrada.preco_litro}" required></div>
                <div><label class="block font-medium">Observação</label><textarea name="observacao" rows="2" class="w-full p-2 border rounded-md">${entrada.observacao || ''}</textarea></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar Alterações</button></div>`;

        openModal('Editar Entrada de Combustível', formHtml, 'combustivel-entradas');
        modalForm.dataset.editId = id;

    } catch (error) {
        alert('Não foi possível carregar os dados para edição.');
        console.error('Erro ao abrir modal de edição:', error);
    }
}

// Função para EXCLUIR uma entrada de combustível
    async function deleteCombustivelEntrada(id) {
        if (confirm('Tem certeza que deseja excluir esta entrada? Esta ação irá corrigir o estoque.')) {
            try {
                const result = await api.delete('combustivel/entradas', id);
                alert(result.message);
                showSection('controle_combustivel'); // Recarrega a seção
            } catch (error) {
                alert(error.message);
            }
        }
    }


    const openManutencaoModal = async (id = null) => {
        try {
            const [veiculosResponse, pecasResponse] = await Promise.all([
                api.get('veiculos?page=1&search='),
                api.get('produtos?search=&per_page=9999')
            ]);

            const veiculos = veiculosResponse.data;
            const pecas = pecasResponse.data.filter(p => p.is_peca_veicular);

            const veiculosOptions = veiculos.map(v => `<option value="${v.id}">${v.nome}</option>`).join('');
            const pecasOptions = pecas.map(p => `<option value="${p.id}">${p.nome} (Est: ${p.estoque})</option>`).join('');

            let title = 'Registar Nova Manutenção';
            const formHtml = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label class="block font-medium">Veículo</label><select name="veiculo_id" class="w-full p-2 border rounded-md" required>${veiculosOptions}</select></div>
                    <div><label class="block font-medium">Tipo</label><select name="tipo" class="w-full p-2 border rounded-md" required><option>Preventiva</option><option>Corretiva</option></select></div>
                    <div><label class="block font-medium">Data</label><input type="date" name="data" class="w-full p-2 border rounded-md" value="${new Date().toISOString().split('T')[0]}" required></div>
                    <div><label class="block font-medium">Custo Mão de Obra (R$)</label><input type="number" name="custo_mo" step="0.01" class="w-full p-2 border rounded-md" value="0"></div>
                    <div class="md:col-span-2"><label class="block font-medium">Descrição do Serviço</label><textarea name="descricao" rows="3" class="w-full p-2 border rounded-md" required></textarea></div>
                </div>
                <div class="mt-6 pt-4 border-t">
                    <h4 class="font-bold mb-2">Peças Utilizadas</h4>
                    <div id="pecas-container" class="space-y-2"></div>
                    <button type="button" id="add-peca-btn" class="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600">Adicionar Peça</button>
                </div>
                <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar Manutenção</button></div>
            `;
            
            openModal(title, formHtml, 'manutencoes');
            
            const pecasContainer = document.getElementById('pecas-container');
            document.getElementById('add-peca-btn').addEventListener('click', () => {
                const div = document.createElement('div');
                div.classList.add('flex', 'items-center', 'gap-2', 'peca-row');
                // --- SINTAXE CORRETA AQUI (usando crases ``) ---
                div.innerHTML = `<select class="peca-produto w-2/3 p-2 border rounded-md">${pecasOptions}</select><input type="number" class="peca-quantidade w-1/3 p-2 border rounded-md" placeholder="Qtd." min="1" value="1"><button type="button" class="remove-peca-btn text-red-500 hover:text-red-700 font-bold text-xl">&times;</button>`;
                pecasContainer.appendChild(div);
            });

            pecasContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-peca-btn')) {
                    e.target.parentElement.remove();
                }
            });
        } catch (error) {
            alert("Erro ao abrir o modal de manutenção. Verifique se existem veículos e produtos cadastrados.");
            console.error(error);
        }
    };  

    const openRelatorioManutencaoModal = () => {
        const title = 'Relatório de Custos de Manutenção';
        const formHtml = `
            <div class="space-y-4">
                <p class="text-sm text-gray-600">Filtre os custos por um período específico para ver os totais com peças e mão de obra para cada veículo.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label for="modal-man-data-inicio" class="block font-medium text-sm">Data de Início</label>
                        <input type="date" id="modal-man-data-inicio" class="w-full p-2 border rounded-md mt-1">
                    </div>
                    <div>
                        <label for="modal-man-data-fim" class="block font-medium text-sm">Data de Fim</label>
                        <input type="date" id="modal-man-data-fim" class="w-full p-2 border rounded-md mt-1">
                    </div>
                </div>
                <div class="flex justify-end space-x-3 pt-4 border-t">
                    <button id="consultar-man-modal-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"><i class="fas fa-search mr-2"></i>Consultar</button>
                    <button id="pdf-man-modal-btn" class="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 flex items-center justify-center"><i class="fas fa-file-pdf mr-2"></i>Imprimir PDF</button>
                </div>
                <div id="container-man-modal" class="mt-4 border-t pt-4 hidden"></div>
            </div>
        `;

        openModal(title, formHtml, 'relatorio-manutencao');

        // Adiciona os eventos aos botões
        document.getElementById('consultar-man-modal-btn').addEventListener('click', async () => {
            const dataInicio = document.getElementById('modal-man-data-inicio').value;
            const dataFim = document.getElementById('modal-man-data-fim').value;
            const container = document.getElementById('container-man-modal');
            container.classList.remove('hidden');
            container.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div></div>`;

            try {
                const custos = await api.get(`relatorios/custos-manutencao?data_inicio=${dataInicio}&data_fim=${dataFim}`);
                if (custos.length === 0) {
                    container.innerHTML = `<p class="text-center p-8 text-gray-500">Nenhum custo encontrado.</p>`;
                    return;
                }
                const tableHeaders = `<tr><th class="p-3">Veículo</th><th class="p-3 text-right">Custo Peças (R$)</th><th class="p-3 text-right">Custo M. Obra (R$)</th><th class="p-3 text-right">Custo Total (R$)</th></tr>`;
                const tableRows = custos.map(c => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-3 font-medium">${c.veiculo_nome}</td>
                        <td class="p-3 text-right">R$ ${c.custo_pecas.toFixed(2)}</td>
                        <td class="p-3 text-right">R$ ${c.custo_mo.toFixed(2)}</td>
                        <td class="p-3 text-right font-bold">R$ ${c.custo_total.toFixed(2)}</td>
                    </tr>`).join('');
                container.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-gray-100">${tableHeaders}</thead><tbody>${tableRows}</tbody></table></div>`;
            } catch (error) {
                container.innerHTML = `<p class="text-center p-8 text-red-500">Falha ao gerar o relatório.</p>`;
            }
        });

        document.getElementById('pdf-man-modal-btn').addEventListener('click', () => {
            const dataInicio = document.getElementById('modal-man-data-inicio').value;
            const dataFim = document.getElementById('modal-man-data-fim').value;
            window.open(`/api/relatorios/custos-manutencao/pdf?data_inicio=${dataInicio}&data_fim=${dataFim}`, '_blank');
        });
    };
   const openRelatorioEstoqueModal = async () => {
        const title = 'Relatório de Posição de Estoque';
        
        // Busca os dados para os filtros antes de abrir o modal
        let almoxarifadosOptions = '<option value="todos">Geral (Todos)</option>';
        let categoriasOptions = '<option value="todos">Geral (Todas)</option>';

        try {
            const [almoxarifadosResponse, categoriasResponse] = await Promise.all([
                api.get('almoxarifados'),
                api.get('categorias')
            ]);
            almoxarifadosResponse.data.forEach(a => {
                almoxarifadosOptions += `<option value="${a.id}">${a.nome}</option>`;
            });
            categoriasResponse.data.forEach(c => {
                categoriasOptions += `<option value="${c.id}">${c.nome}</option>`;
            });
        } catch (error) {
            alert('Erro ao carregar filtros. Tente novamente.');
            return;
        }

        const formHtml = `
            <div class="space-y-4">
                <p class="text-sm text-gray-600">Gere um PDF com a posição do estoque. Você pode filtrar por um almoxarifado ou categoria específica, ou gerar um relatório geral.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="filtro-almoxarifado" class="block font-medium text-sm">Filtrar por Almoxarifado</label>
                        <select id="filtro-almoxarifado" class="w-full p-2 border rounded-md mt-1">${almoxarifadosOptions}</select>
                    </div>
                    <div>
                        <label for="filtro-categoria" class="block font-medium text-sm">Filtrar por Categoria</label>
                        <select id="filtro-categoria" class="w-full p-2 border rounded-md mt-1">${categoriasOptions}</select>
                    </div>
                </div>

                <div class="flex justify-end pt-4 border-t mt-4">
                    <button id="pdf-est-modal-btn" class="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 w-full md:w-auto flex items-center justify-center"><i class="fas fa-file-pdf mr-2"></i>Gerar PDF</button>
                </div>
            </div>
        `;

        openModal(title, formHtml, 'relatorio-estoque');

        // Adiciona evento ao botão
        document.getElementById('pdf-est-modal-btn').addEventListener('click', () => {
            const almoxarifadoId = document.getElementById('filtro-almoxarifado').value;
            const categoriaId = document.getElementById('filtro-categoria').value;
            
            // Constrói a URL com os parâmetros de filtro
            const url = `/api/relatorios/estoque/pdf?almoxarifado_id=${almoxarifadoId}&categoria_id=${categoriaId}`;
            window.open(url, '_blank');
        });
    };

    const openRelatorioMovimentacoesModal = () => {
        const title = 'Relatório de Movimentações';
        const formHtml = `
            <div class="space-y-4">
                <p class="text-sm text-gray-600">Filtre as movimentações por um período específico.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label for="modal-mov-data-inicio" class="block font-medium text-sm">Data de Início</label>
                        <input type="date" id="modal-mov-data-inicio" class="w-full p-2 border rounded-md mt-1">
                    </div>
                    <div>
                        <label for="modal-mov-data-fim" class="block font-medium text-sm">Data de Fim</label>
                        <input type="date" id="modal-mov-data-fim" class="w-full p-2 border rounded-md mt-1">
                    </div>
                </div>
                <div class="flex justify-end space-x-3 pt-4 border-t">
                    <button id="consultar-mov-modal-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"><i class="fas fa-search mr-2"></i>Consultar</button>
                    <button id="pdf-mov-modal-btn" class="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 flex items-center justify-center"><i class="fas fa-file-pdf mr-2"></i>Imprimir PDF</button>
                </div>
                <div id="container-mov-modal" class="mt-4 border-t pt-4 hidden"></div>
            </div>
        `;

        openModal(title, formHtml, 'relatorio-movimentacoes');

        // Adiciona os eventos aos botões recém-criados dentro do modal
        document.getElementById('consultar-mov-modal-btn').addEventListener('click', async () => {
            const dataInicio = document.getElementById('modal-mov-data-inicio').value;
            const dataFim = document.getElementById('modal-mov-data-fim').value;
            const container = document.getElementById('container-mov-modal');
            container.classList.remove('hidden');
            container.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div></div>`;

            try {
                const relatorio = await api.get(`relatorios/movimentacoes?data_inicio=${dataInicio}&data_fim=${dataFim}`);
                if (relatorio.length === 0) {
                    container.innerHTML = `<p class="text-center p-8 text-gray-500">Nenhum resultado encontrado.</p>`;
                    return;
                }
                const tableHeaders = `<tr><th class="p-3">Data</th><th class="p-3">Produto</th><th class="p-3">Tipo</th><th class="p-3">Qtd.</th><th class="p-3">Setor</th><th class="p-3 text-right">Valor (R$)</th></tr>`;
                const tableRows = relatorio.map(r => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-3">${r.data}</td>
                        <td class="p-3 font-medium">${r.produto_nome}</td>
                        <td class="p-3">${r.tipo}</td>
                        <td class="p-3">${r.quantidade}</td>
                        <td class="p-3">${r.setor_nome}</td>
                        <td class="p-3 text-right">R$ ${r.valor_total.toFixed(2)}</td>
                    </tr>`).join('');
                container.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-gray-100">${tableHeaders}</thead><tbody>${tableRows}</tbody></table></div>`;
            } catch (error) {
                container.innerHTML = `<p class="text-center p-8 text-red-500">Falha ao gerar o relatório.</p>`;
            }
        });

        document.getElementById('pdf-mov-modal-btn').addEventListener('click', () => {
            const dataInicio = document.getElementById('modal-mov-data-inicio').value;
            const dataFim = document.getElementById('modal-mov-data-fim').value;
            if (!dataInicio || !dataFim) {
                alert("Por favor, selecione as datas para gerar o PDF.");
                return;
            }
            window.open(`/api/relatorios/movimentacoes/pdf?data_inicio=${dataInicio}&data_fim=${dataFim}`, '_blank');
        });
    }; 




    
    // Em app/static/js/app.js

const openFornecedorModal = async (id = null) => {
    let fornecedor = {};
    let title = 'Adicionar Novo Fornecedor';
    if (id) {
        try {
            fornecedor = await api.get('fornecedores', id);
            title = 'Editar Fornecedor';
        } catch (error) { alert('Não foi possível carregar os dados do fornecedor.'); return; }
    }

    const formHtml = `
        <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <h4 class="font-bold text-blue-800">Preenchimento Automático por XML</h4>
            <p class="text-sm text-gray-600 mt-1">Selecione o ficheiro XML da NF-e para preencher os dados do fornecedor automaticamente.</p>
            <div class="mt-2">
                <input type="file" id="nfe-xml-input" class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" accept=".xml">
            </div>
            <div id="nfe-message" class="text-sm mt-2"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div class="lg:col-span-2"><label class="block font-medium">Nome</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${fornecedor.nome || ''}" required></div>
            <div><label class="block font-medium">Contato</label><input type="text" name="contato" class="w-full p-2 border rounded-md" value="${fornecedor.contato || ''}"></div>
            <div class="lg:col-span-3"><label class="block font-medium">Razão Social</label><input type="text" name="razao_social" class="w-full p-2 border rounded-md" value="${fornecedor.razao_social || ''}"></div>
            <div><label class="block font-medium">CNPJ</label><input type="text" name="cnpj" class="w-full p-2 border rounded-md" value="${fornecedor.cnpj || ''}"></div>
            <div><label class="block font-medium">Inscrição Estadual</label><input type="text" name="inscricao_estadual" class="w-full p-2 border rounded-md" value="${fornecedor.inscricao_estadual || ''}"></div>
            <div><label class="block font-medium">Telefone Fixo</label><input type="text" name="fone" class="w-full p-2 border rounded-md" value="${fornecedor.fone || ''}"></div>
            <div><label class="block font-medium">Celular</label><input type="text" name="cel" class="w-full p-2 border rounded-md" value="${fornecedor.cel || ''}"></div>
            <div><label class="block font-medium">WhatsApp</label><input type="text" name="whatsapp" class="w-full p-2 border rounded-md" value="${fornecedor.whatsapp || ''}"></div>
            <div class="lg:col-span-2"><label class="block font-medium">Endereço</label><input type="text" name="endereco" class="w-full p-2 border rounded-md" value="${fornecedor.endereco || ''}"></div>
            <div><label class="block font-medium">Bairro</label><input type="text" name="bairro" class="w-full p-2 border rounded-md" value="${fornecedor.bairro || ''}"></div>
            <div><label class="block font-medium">CEP</label><input type="text" name="cep" class="w-full p-2 border rounded-md" value="${fornecedor.cep || ''}"></div>
            <div><label class="block font-medium">Cidade</label><input type="text" name="cidade" class="w-full p-2 border rounded-md" value="${fornecedor.cidade || ''}"></div>
             <div>
                <label class="block font-medium">Estado (UF)</label>
                <select name="estado" class="w-full p-2 border rounded-md">
                    <option value="">Selecione...</option>
                    <option value="AC" ${fornecedor.estado === 'AC' ? 'selected' : ''}>Acre</option><option value="AL" ${fornecedor.estado === 'AL' ? 'selected' : ''}>Alagoas</option>
                    <option value="AP" ${fornecedor.estado === 'AP' ? 'selected' : ''}>Amapá</option><option value="AM" ${fornecedor.estado === 'AM' ? 'selected' : ''}>Amazonas</option>
                    <option value="BA" ${fornecedor.estado === 'BA' ? 'selected' : ''}>Bahia</option><option value="CE" ${fornecedor.estado === 'CE' ? 'selected' : ''}>Ceará</option>
                    <option value="DF" ${fornecedor.estado === 'DF' ? 'selected' : ''}>Distrito Federal</option><option value="ES" ${fornecedor.estado === 'ES' ? 'selected' : ''}>Espírito Santo</option>
                    <option value="GO" ${fornecedor.estado === 'GO' ? 'selected' : ''}>Goiás</option><option value="MA" ${fornecedor.estado === 'MA' ? 'selected' : ''}>Maranhão</option>
                    <option value="MT" ${fornecedor.estado === 'MT' ? 'selected' : ''}>Mato Grosso</option><option value="MS" ${fornecedor.estado === 'MS' ? 'selected' : ''}>Mato Grosso do Sul</option>
                    <option value="MG" ${fornecedor.estado === 'MG' ? 'selected' : ''}>Minas Gerais</option><option value="PA" ${fornecedor.estado === 'PA' ? 'selected' : ''}>Pará</option>
                    <option value="PB" ${fornecedor.estado === 'PB' ? 'selected' : ''}>Paraíba</option><option value="PR" ${fornecedor.estado === 'PR' ? 'selected' : ''}>Paraná</option>
                    <option value="PE" ${fornecedor.estado === 'PE' ? 'selected' : ''}>Pernambuco</option><option value="PI" ${fornecedor.estado === 'PI' ? 'selected' : ''}>Piauí</option>
                    <option value="RJ" ${fornecedor.estado === 'RJ' ? 'selected' : ''}>Rio de Janeiro</option><option value="RN" ${fornecedor.estado === 'RN' ? 'selected' : ''}>Rio Grande do Norte</option>
                    <option value="RS" ${fornecedor.estado === 'RS' ? 'selected' : ''}>Rio Grande do Sul</option><option value="RO" ${fornecedor.estado === 'RO' ? 'selected' : ''}>Rondônia</option>
                    <option value="RR" ${fornecedor.estado === 'RR' ? 'selected' : ''}>Roraima</option><option value="SC" ${fornecedor.estado === 'SC' ? 'selected' : ''}>Santa Catarina</option>
                    <option value="SP" ${fornecedor.estado === 'SP' ? 'selected' : ''}>São Paulo</option><option value="SE" ${fornecedor.estado === 'SE' ? 'selected' : ''}>Sergipe</option>
                    <option value="TO" ${fornecedor.estado === 'TO' ? 'selected' : ''}>Tocantins</option>
                </select>
            </div>
            <div class="lg:col-span-2"><label class="block font-medium">E-mail</label><input type="email" name="email" class="w-full p-2 border rounded-md" value="${fornecedor.email || ''}"></div>
            <div><label class="block font-medium">Site</label><input type="text" name="site" class="w-full p-2 border rounded-md" value="${fornecedor.site || ''}"></div>
            <div class="lg:col-span-3"><label class="block font-medium">Observação</label><textarea name="observacao" class="w-full p-2 border rounded-md" rows="3">${fornecedor.observacao || ''}</textarea></div>
        </div>
        <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
    
    openModal(title, formHtml, 'fornecedores');
    if (id) modalForm.dataset.editId = id;

    // --- NOVA LÓGICA PARA O UPLOAD DE XML ---
    const xmlInput = document.getElementById('nfe-xml-input');
    const nfeMessage = document.getElementById('nfe-message');

    xmlInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        nfeMessage.textContent = 'A processar o XML...';
        nfeMessage.className = 'text-sm mt-2 text-blue-600';

        const formData = new FormData();
        formData.append('nfe_xml', file);

        try {
            // A API de fetch para ficheiros é um pouco diferente
            const response = await fetch('/api/fornecedores/consultar-nfe', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            // Preenche o formulário
            const form = document.getElementById('modal-form');
            form.querySelector('input[name="nome"]').value = result.nome || '';
            form.querySelector('input[name="razao_social"]').value = result.razao_social || '';
            form.querySelector('input[name="cnpj"]').value = result.cnpj || '';
            form.querySelector('input[name="endereco"]').value = result.endereco || '';
            form.querySelector('input[name="bairro"]').value = result.bairro || '';
            form.querySelector('input[name="cidade"]').value = result.cidade || '';
            form.querySelector('select[name="estado"]').value = result.estado || '';
            form.querySelector('input[name="cep"]').value = result.cep || '';
            form.querySelector('input[name="fone"]').value = result.fone || '';
            
            nfeMessage.textContent = 'Dados preenchidos com sucesso!';
            nfeMessage.className = 'text-sm mt-2 text-green-600';

        } catch (error) {
            nfeMessage.textContent = `Erro: ${error.message}`;
            nfeMessage.className = 'text-sm mt-2 text-red-600';
        }
    });
};   

const openRelatorioSaidaCombustivelModal = async () => {
    const title = 'Relatório de Saída de Combustível';

    // 1. Busca os dados para os novos filtros ANTES de criar o modal
    let funcionariosOptions = '<option value="todos">Todos os Funcionários</option>';
    let funcoesOptions = '<option value="todos">Todas as Funções</option>';
    let veiculosOptions = '<option value="todos">Todos os Veículos</option>';

    try {
        const [funcionariosResponse, funcoesResponse, veiculosResponse] = await Promise.all([
            api.get('funcionarios?per_page=9999'),
            api.get('funcoes?per_page=9999'),
            api.get('veiculos?per_page=9999')
        ]);
        funcionariosResponse.data.forEach(f => { funcionariosOptions += `<option value="${f.id}">${f.nome}</option>`; });
        funcoesResponse.data.forEach(f => { funcoesOptions += `<option value="${f.id}">${f.nome}</option>`; });
        veiculosResponse.data.forEach(v => { veiculosOptions += `<option value="${v.id}">${v.nome}</option>`; });
    } catch (error) {
        alert('Erro ao carregar filtros. Tente novamente.');
        return;
    }

    // 2. Cria o HTML do formulário com os novos campos de filtro
    const formHtml = `
        <div class="space-y-4">
            <p class="text-sm text-gray-600">Filtre as saídas de combustível por um período e/ou por funcionário, função e veículo.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                    <label class="block font-medium text-sm">Data de Início</label>
                    <input type="date" id="modal-saida-comb-data-inicio" class="w-full p-2 border rounded-md mt-1">
                </div>
                <div>
                    <label class="block font-medium text-sm">Data de Fim</label>
                    <input type="date" id="modal-saida-comb-data-fim" class="w-full p-2 border rounded-md mt-1">
                </div>
                <div>
                    <label class="block font-medium text-sm">Funcionário</label>
                    <select id="modal-saida-comb-funcionario" class="w-full p-2 border rounded-md mt-1">${funcionariosOptions}</select>
                </div>
                <div>
                    <label class="block font-medium text-sm">Função</label>
                    <select id="modal-saida-comb-funcao" class="w-full p-2 border rounded-md mt-1">${funcoesOptions}</select>
                </div>
                <div class="md:col-span-2">
                    <label class="block font-medium text-sm">Veículo</label>
                    <select id="modal-saida-comb-veiculo" class="w-full p-2 border rounded-md mt-1">${veiculosOptions}</select>
                </div>
            </div>
            <div class="flex justify-end space-x-3 pt-4 border-t">
                <button id="consultar-saida-comb-modal-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Consultar</button>
                <button id="pdf-saida-comb-modal-btn" class="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800">Imprimir PDF</button>
            </div>
            <div id="container-saida-comb-modal" class="mt-4 border-t pt-4 hidden"></div>
        </div>
    `;

    openModal(title, formHtml, 'relatorio-saida-combustivel');

    // 3. Atualiza os "ouvintes de eventos" para incluir os novos filtros na chamada da API
    document.getElementById('consultar-saida-comb-modal-btn').addEventListener('click', async () => {
    const dataInicio = document.getElementById('modal-saida-comb-data-inicio').value;
    const dataFim = document.getElementById('modal-saida-comb-data-fim').value;
    const funcionarioId = document.getElementById('modal-saida-comb-funcionario').value;
    const funcaoId = document.getElementById('modal-saida-comb-funcao').value;
    const veiculoId = document.getElementById('modal-saida-comb-veiculo').value;
    
    const container = document.getElementById('container-saida-comb-modal');
    container.classList.remove('hidden');
    container.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div></div>`;

    try {
        const url = `relatorios/saidas-combustivel?data_inicio=${dataInicio}&data_fim=${dataFim}&funcionario_id=${funcionarioId}&funcao_id=${funcaoId}&veiculo_id=${veiculoId}`;
        const saidas = await api.get(url);
        
        if (saidas.length === 0) {
            container.innerHTML = `<p class="text-center p-8 text-gray-500">Nenhuma saída encontrada para os filtros selecionados.</p>`;
            return;
        }

        // --- Lógica de Agrupamento em JavaScript ---
        const grouped = saidas.reduce((acc, s) => {
            const key = `${s.veiculo_nome} | ${s.funcao_nome}`;
            if (!acc[key]) {
                acc[key] = {
                    registos: [],
                    total_litros: 0,
                    total_horas: 0
                };
            }
            acc[key].registos.push(s);
            acc[key].total_litros += s.quantidade;
            acc[key].total_horas += (s.hodometro_horimetro - s.horimetro_inicial) || 0; // Recalcula para garantir
            return acc;
        }, {});

        let htmlResult = '';
        for (const key in grouped) {
            const group = grouped[key];
            htmlResult += `<div class="mb-6">
                <h4 class="font-bold text-lg bg-gray-100 p-2 rounded-t-lg">${key}</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-gray-200">
                            <tr>
                                <th class="p-2">Data</th>
                                <th class="p-2">Funcionário</th>
                                <th class="p-2 text-right">Qtd (L)</th>
                                <th class="p-2 text-right">Horas Trab.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.registos.map(s => `
                                <tr class="border-b">
                                    <td class="p-2">${s.data}</td>
                                    <td class="p-2">${s.funcionario_nome}</td>
                                    <td class="p-2 text-right">${s.quantidade.toFixed(2)}</td>
                                    <td class="p-2 text-right">${((s.hodometro_horimetro - s.horimetro_inicial) || 0).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <tr class="bg-gray-100 font-bold">
                                <td colspan="2" class="p-2 text-right">TOTAIS:</td>
                                <td class="p-2 text-right">${group.total_litros.toFixed(2)} L</td>
                                <td class="p-2 text-right">${group.total_horas.toFixed(2)} h</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>`;
        }
        container.innerHTML = htmlResult;

    } catch (error) {
        container.innerHTML = `<p class="text-center p-8 text-red-500">Falha ao gerar o relatório.</p>`;
    }
});

    document.getElementById('pdf-saida-comb-modal-btn').addEventListener('click', () => {
        const dataInicio = document.getElementById('modal-saida-comb-data-inicio').value;
        const dataFim = document.getElementById('modal-saida-comb-data-fim').value;
        const funcionarioId = document.getElementById('modal-saida-comb-funcionario').value;
        const funcaoId = document.getElementById('modal-saida-comb-funcao').value;
        const veiculoId = document.getElementById('modal-saida-comb-veiculo').value;

        const url = `/api/relatorios/saidas-combustivel/pdf?data_inicio=${dataInicio}&data_fim=${dataFim}&funcionario_id=${funcionarioId}&funcao_id=${funcaoId}&veiculo_id=${veiculoId}`;
        window.open(url, '_blank');
    });
};

    const openCodigoAcessoModal = async () => {
        let title = 'Gerar Nova Chave de Acesso';
        const formHtml = `
            <div class="space-y-4">
                <div>
                    <label class="block font-medium">Nível de Permissão para a Nova Chave</label>
                    <select name="role" class="w-full p-2 border rounded-md">
                        <option value="supervisor" selected>Supervisor</option>
                        <option value="gerente">Gerente</option>
                    </select>
                </div>
                <p class="text-sm text-gray-600">Será gerado um código aleatório de 8 dígitos para o nível de permissão selecionado.</p>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Gerar Chave</button></div>`;
        
        openModal(title, formHtml, 'codigos-acesso');
    };   
    
    

    const openNotaFiscalFormModal = async (fornecedorId, notaId = null) => {
        let nota = { numero: '', data_emissao: new Date().toISOString().slice(0, 10), valor_total: '' };
        let title = 'Adicionar Nova Nota Fiscal';

        if (notaId) {
            try {
                nota = await api.get('notas-fiscais', notaId);
                title = 'Editar Nota Fiscal';
            } catch (error) {
                alert('Não foi possível carregar os dados da nota fiscal.');
                return;
            }
        }

        const formHtml = `
            <input type="hidden" name="fornecedor_id" value="${fornecedorId}">
            <div class="space-y-4">
                <div><label class="block font-medium">Número da Nota</label><input type="text" name="numero" class="w-full p-2 border rounded-md" value="${nota.numero}" required></div>
                <div><label class="block font-medium">Data de Emissão</label><input type="date" name="data_emissao" class="w-full p-2 border rounded-md" value="${nota.data_emissao}" required></div>
                <div><label class="block font-medium">Valor Total (R$)</label><input type="number" step="0.01" name="valor_total" class="w-full p-2 border rounded-md" value="${nota.valor_total}" required></div>
            </div>
            <div class="text-right mt-6 border-t pt-4">
                <button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button>
            </div>`;

        openModal(title, formHtml, 'notas-fiscais');
        if (notaId) {
            modalForm.dataset.editId = notaId;
        }
    };

    // --- FUNÇÃO PARA O MODAL MESTRE-DETALHE DE FORNECEDORES ---
    const openNotasFiscaisModal = async (fornecedorId, fornecedorNome) => {
        const title = `Notas Fiscais de: ${fornecedorNome}`;
        const formHtml = `
            <div class="flex justify-end mb-4">
                <button id="add-nota-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm flex items-center">
                    <i class="fas fa-plus mr-2"></i>Adicionar Nota Fiscal
                </button>
            </div>
            <div class="overflow-y-auto max-h-96">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="p-2">Número</th>
                            <th class="p-2">Data Emissão</th>
                            <th class="p-2 text-right">Valor Total</th>
                            <th class="p-2 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="notas-fiscais-table-body">
                        <tr><td colspan="4" class="text-center p-8"><div class="loader mx-auto"></div></td></tr>
                    </tbody>
                </table>
            </div>`;

        openModal(title, formHtml, 'notas-fiscais-list');

        const renderTable = async () => {
            const tableBody = document.getElementById('notas-fiscais-table-body');
            try {
                const notas = await api.get(`fornecedores/${fornecedorId}/notas`);
                if (notas.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-500">Nenhuma nota fiscal registada.</td></tr>`;
                } else {
                    tableBody.innerHTML = notas.map(n => `
                        <tr class="border-b">
                            <td class="p-2">${n.numero}</td>
                            <td class="p-2">${n.data_emissao}</td>
                            <td class="p-2 text-right">R$ ${n.valor_total.toFixed(2)}</td>
                            <td class="p-2 text-center">
                                <button class="text-blue-600 hover:text-blue-800 mr-3 edit-nota-btn" data-id="${n.id}" title="Editar Nota"><i class="fas fa-edit"></i></button>
                                <button class="text-red-600 hover:text-red-800 delete-nota-btn" data-id="${n.id}" title="Excluir Nota"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('');
                }
            } catch (error) {
                 tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-red-500">Falha ao carregar notas.</td></tr>`;
            }
        };

        document.getElementById('add-nota-btn').addEventListener('click', () => {
            openNotaFiscalFormModal(fornecedorId);
        });

        document.getElementById('notas-fiscais-table-body').addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.edit-nota-btn');
            const deleteBtn = e.target.closest('.delete-nota-btn');

            if (editBtn) {
                openNotaFiscalFormModal(fornecedorId, editBtn.dataset.id);
            }

            if (deleteBtn) {
                if (confirm('Tem a certeza que deseja apagar esta nota fiscal?')) {
                    try {
                        await api.delete('notas-fiscais', deleteBtn.dataset.id);
                        renderTable();
                    } catch (error) {
                        alert(error.message);
                    }
                }
            }
        });

        renderTable();
    };

    // Adicione esta função completa em app.js

    const openImplementoModal = async (id = null) => {
        let implemento = { nome: '', descricao: '' };
        let title = 'Adicionar Novo Implemento';
        if (id) {
            try {
                implemento = await api.get('implementos', id);
                title = 'Editar Implemento';
            } catch (error) { alert('Não foi possível carregar os dados do implemento.'); return; }
        }
        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome do Implemento</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${implemento.nome}" required></div>
                <div><label class="block font-medium">Descrição</label><textarea name="descricao" class="w-full p-2 border rounded-md" rows="3">${implemento.descricao || ''}</textarea></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'implementos');
        if (id) modalForm.dataset.editId = id;
    };

    const renderImportarProdutos = async () => {
        const section = document.getElementById('importar-produtos');
        if (!section) return;

        section.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-3xl font-bold text-gray-800 mb-2 flex items-center"><i class="fas fa-file-import fa-fw mr-4 text-gray-500"></i>Importar Produtos via XML da NF-e</h2>
                <p class="text-gray-600 mb-6">Faça o upload do ficheiro XML de uma Nota Fiscal para dar entrada nos produtos automaticamente.</p>
                <div class="border-t pt-6">
                    <label class="block font-medium text-lg mb-2">1. Selecione o Ficheiro XML</label>
                    <input type="file" id="nfe-xml-upload-input" class="w-full max-w-lg text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" accept=".xml">
                    <div id="xml-message" class="text-sm mt-2"></div>
                </div>
                <div id="produtos-container" class="mt-6 border-t pt-6 hidden">
                    <h3 class="font-medium text-lg mb-4">2. Confirme os Itens para Importação</h3>
                    <p class="text-sm text-gray-600 mb-4">Associe cada item a uma <strong>Categoria</strong> e <strong>Almoxarifado</strong> antes de importar.</p>
                    <div id="lista-produtos-xml" class="space-y-4"></div>
                    <div class="text-right mt-6">
                        <button id="importar-produtos-btn" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold"><i class="fas fa-check-circle mr-2"></i>Importar Produtos</button>
                    </div>
                </div>
            </div>`;

        const xmlInput = section.querySelector('#nfe-xml-upload-input');
        const xmlMessage = section.querySelector('#xml-message');
        const produtosContainer = section.querySelector('#produtos-container');
        const listaProdutosXml = section.querySelector('#lista-produtos-xml');
        const importarBtn = section.querySelector('#importar-produtos-btn');
        let fornecedorIdGlobal = null;

        xmlInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            xmlMessage.textContent = 'A processar o XML...';
            const formData = new FormData();
            formData.append('nfe_xml', file);
            try {
                const response = await fetch('/api/produtos/ler-xml-nfe', { method: 'POST', body: formData });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                fornecedorIdGlobal = result.fornecedor_id;
                const [categoriasResponse, almoxarifadosResponse] = await Promise.all([api.get('categorias'), api.get('almoxarifados')]);
                const categoriasOptions = categoriasResponse.data.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
                const almoxarifadosOptions = almoxarifadosResponse.data.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
                listaProdutosXml.innerHTML = result.produtos.map((p, index) => `
                    <div class="border rounded-lg p-4 bg-gray-50 produto-item" data-index="${index}">
                        <p class="font-bold">${p.nome}</p>
                        <p class="text-sm text-gray-600">Qtd: ${p.quantidade} ${p.unidade} | Valor Unit.: R$ ${p.preco_unitario.toFixed(2)}</p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div><label class="block text-xs font-medium">Categoria*</label><select class="w-full p-2 border rounded-md" name="categoria_id_${index}" required>${categoriasOptions}</select></div>
                            <div><label class="block text-xs font-medium">Almoxarifado*</label><select class="w-full p-2 border rounded-md" name="almoxarifado_id_${index}" required>${almoxarifadosOptions}</select></div>
                        </div>
                        <div class="hidden">
                            <input type="hidden" name="nome_${index}" value="${p.nome}"><input type="hidden" name="unidade_${index}" value="${p.unidade}"><input type="hidden" name="quantidade_${index}" value="${p.quantidade}"><input type="hidden" name="preco_unitario_${index}" value="${p.preco_unitario}"><input type="hidden" name="lote_${index}" value="${p.lote}"><input type="hidden" name="data_validade_${index}" value="${p.data_validade}">
                        </div>
                    </div>`).join('');
                produtosContainer.classList.remove('hidden');
                xmlMessage.textContent = `${result.produtos.length} produto(s) encontrado(s).`;
            } catch (error) {
                xmlMessage.textContent = `Erro: ${error.message}`;
            }
        });

        importarBtn.addEventListener('click', async () => {
            const produtosParaImportar = [];
            let hasInvalidFields = false;
            document.querySelectorAll('.produto-item').forEach(item => {
                const index = item.dataset.index;
                const categoriaSelect = item.querySelector(`select[name="categoria_id_${index}"]`);
                const almoxarifadoSelect = item.querySelector(`select[name="almoxarifado_id_${index}"]`);
                if (!categoriaSelect.value || !almoxarifadoSelect.value) hasInvalidFields = true;
                produtosParaImportar.push({
                    nome: item.querySelector(`input[name="nome_${index}"]`).value,
                    unidade: item.querySelector(`input[name="unidade_${index}"]`).value,
                    quantidade: item.querySelector(`input[name="quantidade_${index}"]`).value,
                    preco_unitario: item.querySelector(`input[name="preco_unitario_${index}"]`).value,
                    lote: item.querySelector(`input[name="lote_${index}"]`).value,
                    data_validade: item.querySelector(`input[name="data_validade_${index}"]`).value,
                    categoria_id: categoriaSelect.value,
                    almoxarifado_id: almoxarifadoSelect.value,
                    fornecedor_id: fornecedorIdGlobal
                });
            });
            if (hasInvalidFields) {
                alert('Por favor, preencha a Categoria e o Almoxarifado para todos os itens.');
                return;
            }
            importarBtn.disabled = true;
            importarBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>A Importar...';
            try {
                const result = await api.post('produtos/importar-nfe', { produtos: produtosParaImportar });
                alert(result.message);
                showSection('produtos'); // Redireciona para a lista de produtos após o sucesso
            } catch (error) {
                alert(`Erro ao importar: ${error.message}`);
            } finally {
                importarBtn.disabled = false;
                importarBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Importar Produtos';
            }
        });
    };
        const implementosConfig = {
            sectionId: 'implementos', // Deve corresponder ao ID na secção que vamos criar
            entityName: 'implementos',
            endpoint: 'implementos',
            title: 'Cadastro de Implementos',
            addBtnText: 'Adicionar Implemento',
            tableHeaders: ['Nome', 'Descrição', 'Ações'],
            renderRow: (i) => `<td class="p-3 font-medium">${i.nome}</td><td class="p-3">${i.descricao || ''}</td>`,
            openModalFn: openImplementoModal
        };
     const fornecedoresConfig = {
        sectionId: 'fornecedores',
        entityName: 'fornecedores',
        endpoint: 'fornecedores',
        title: 'Cadastro de Fornecedores',
        addBtnText: 'Adicionar Fornecedor',
        tableHeaders: ['Nome', 'Razão Social', 'Contato', 'Telefone', 'Cidade', 'Ações'],
        renderRow: (f) => `
            <td class="p-3 font-medium">${f.nome}</td>
            <td class="p-3">${f.razao_social || ''}</td>
            <td class="p-3">${f.contato || ''}</td>
            <td class="p-3">${f.fone || ''}</td>
            <td class="p-3">${f.cidade || ''}</td>`,
        openModalFn: openFornecedorModal
    };
    const codigosAcessoConfig = {
    sectionId: 'codigos_acesso',
    entityName: 'codigos-acesso',
    endpoint: 'admin/codigos-acesso', // <-- ESTA É A VERSÃO CORRETA
    title: 'Gerir Chaves de Acesso',
    addBtnText: 'Gerar Nova Chave',
        tableHeaders: ['Código', 'Nível Permitido', 'Usado?', 'Ações'],
        renderRow: (c) => `
            <td class="p-3 font-mono">${c.codigo}</td>
            <td class="p-3">${c.role_permitida}</td>
            <td class="p-3">${c.usado ? '<span class="text-red-500 font-semibold">Sim</span>' : '<span class="text-green-500 font-semibold">Não</span>'}</td>
        `,
        openModalFn: openCodigoAcessoModal
    };

    // --- Configurações para cada Módulo de Cadastro ---
    const setoresConfig = {
        sectionId: 'setores', entityName: 'setores', endpoint: 'setores', title: 'Cadastro de Setores', addBtnText: 'Adicionar Setor',
        tableHeaders: ['ID', 'Nome', 'Descrição', 'Ações'],
        renderRow: (s) => `<td class="p-3">${s.id}</td><td class="p-3 font-medium">${s.nome}</td><td class="p-3">${s.descricao || ''}</td>`,
        openModalFn: openSetorModal
    };


    const categoriasConfig = {
        sectionId: 'categorias', entityName: 'categorias', endpoint: 'categorias', title: 'Cadastro de Categorias', addBtnText: 'Adicionar Categoria',
        tableHeaders: ['ID', 'Nome', 'Descrição', 'Ações'],
        renderRow: (c) => `<td class="p-3">${c.id}</td><td class="p-3 font-medium">${c.nome}</td><td class="p-3">${c.descricao || ''}</td>`,
        openModalFn: openCategoriaModal
    };
    const almoxarifadosConfig = {
        sectionId: 'almoxarifados', entityName: 'almoxarifados', endpoint: 'almoxarifados', title: 'Cadastro de Almoxarifados', addBtnText: 'Adicionar Almoxarifado',
        tableHeaders: ['ID', 'Nome', 'Localização', 'Ações'],
        renderRow: (a) => `<td class="p-3">${a.id}</td><td class="p-3 font-medium">${a.nome}</td><td class="p-3">${a.localizacao || ''}</td>`,
        openModalFn: openAlmoxarifadoModal
    };
    const produtosConfig = {
        sectionId: 'produtos', entityName: 'produtos', endpoint: 'produtos', title: 'Cadastro de Produtos', addBtnText: 'Adicionar Produto',
        tableHeaders: ['Nome', 'Categoria', 'Almoxarifado', 'Estoque', 'Preço', 'Ações'],
        renderRow: (p) => `<td class="p-3 font-medium">${p.nome}</td><td>${p.categoria_nome}</td><td>${p.almoxarifado_nome}</td><td>${p.estoque} ${p.unidade || ''}</td><td>${p.preco_unitario ? `R$ ${p.preco_unitario.toFixed(2)}` : ''}</td>`,
        openModalFn: openProdutoModal
    };
    const usuariosConfig = {
        sectionId: 'usuarios', entityName: 'usuarios', endpoint: 'usuarios', title: 'Gestão de Utilizadores', addBtnText: 'Adicionar Utilizador',
        tableHeaders: ['ID', 'Nome de Utilizador', 'Perfil', 'Ações'],
        renderRow: (u) => `<td class="p-3">${u.id}</td><td class="p-3 font-medium">${u.username}</td><td class="p-3">${u.role}</td>`,
        openModalFn: openUsuarioModal
    };
    const funcoesConfig = {
        sectionId: 'funcoes', entityName: 'funcoes', endpoint: 'funcoes', title: 'Cadastro de Funções', addBtnText: 'Adicionar Função',
        tableHeaders: ['ID', 'Nome', 'Descrição', 'Ações'],
        renderRow: (f) => `<td class="px-4 py-3">${f.id}</td><td class="px-4 py-3 font-medium text-gray-900">${f.nome}</td><td class="px-4 py-3 text-gray-500">${f.descricao || ''}</td>`,
        openModalFn: openFuncaoModal
    };
    const tiposCombustivelConfig = {
        sectionId: 'tipos_combustivel', entityName: 'tipos_combustivel', endpoint: 'tipos_combustivel', title: 'Cadastro de Tipos de Combustível', addBtnText: 'Adicionar Tipo',
        tableHeaders: ['ID', 'Nome', 'Ações'],
        renderRow: (t) => `<td class="px-4 py-3">${t.id}</td><td class="px-4 py-3 font-medium text-gray-900">${t.nome}</td>`,
        openModalFn: openTipoCombustivelModal
    };
    const tiposVeiculoConfig = {
        sectionId: 'tipos_veiculo', entityName: 'tipos_veiculo', endpoint: 'tipos_veiculo', title: 'Cadastro de Tipos de Veículo', addBtnText: 'Adicionar Tipo',
        tableHeaders: ['ID', 'Nome', 'Ações'],
        renderRow: (t) => `<td class="px-4 py-3">${t.id}</td><td class="px-4 py-3 font-medium text-gray-900">${t.nome}</td>`,
        openModalFn: openTipoVeiculoModal
    };
    const veiculosConfig = {
        sectionId: 'veiculos', entityName: 'veiculos', endpoint: 'veiculos', title: 'Cadastro de Veículos', addBtnText: 'Adicionar Veículo',
        tableHeaders: ['Nome', 'Placa', 'Tipo de Veículo', 'Ações'],
        renderRow: (v) => `<td class="px-4 py-3 font-medium text-gray-900">${v.nome}</td><td class="px-4 py-3">${v.placa || ''}</td><td class="px-4 py-3">${v.tipo_veiculo_nome}</td>`,
        openModalFn: openVeiculoModal
    };
    const funcionariosConfig = {
        sectionId: 'funcionarios', entityName: 'funcionarios', endpoint: 'funcionarios', title: 'Cadastro de Funcionários', addBtnText: 'Adicionar Funcionário',
        tableHeaders: ['Nome', 'Cargo', 'Setor', 'Ações'],
        renderRow: (f) => `<td class="p-3 font-medium">${f.nome}</td><td class="p-3">${f.cargo || ''}</td><td class="p-3">${f.setor_nome}</td>`,
        openModalFn: openFuncionarioModal
    };

    const manutencoesConfig = {
        sectionId: 'manutencoes',
        entityName: 'manutencoes',
        endpoint: 'manutencoes',
        title: 'Controlo de Manutenção de Frota',
        addBtnText: 'Registar Manutenção',
        tableHeaders: ['Data', 'Veículo', 'Tipo', 'Descrição', 'Custo Total', 'Ações'],
        renderRow: (m) => `
            <td class="p-3">${m.data}</td>
            <td class="p-3 font-medium">${m.veiculo_nome}</td>
            <td class="p-3">${m.tipo}</td>
            <td class="p-3 text-sm text-gray-600">${m.descricao.substring(0, 50)}...</td>
            <td class="p-3">R$ ${m.custo_total.toFixed(2)}</td>
        `,
        openModalFn: openManutencaoModal
    };
        const relatorioMovimentacoesConfig = {
        sectionId: 'relatorio-movimentacoes',
        entityName: 'movimentacoes',
        endpoint: 'relatorios/movimentacoes',
        icon: 'fas fa-exchange-alt',
        title: 'Relatório de Movimentações',
        description: 'Gera um histórico de todas as entradas e saídas de produtos num período específico.',
        tableHeaders: ['Data', 'Produto', 'Tipo', 'Qtd.', 'Setor', 'Utilizador', 'Valor Total (R$)'],
        renderRow: (r) => `
            <td class="p-3">${r.data}</td>
            <td class="p-3 font-medium">${r.produto_nome}</td>
            <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${r.tipo === 'entrada' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">${r.tipo}</span></td>
            <td class="p-3">${r.quantidade}</td>
            <td class="p-3">${r.setor_nome}</td>
            <td class="p-3 text-gray-500">${r.usuario_nome}</td>
            <td class="p-3 text-right">R$ ${r.valor_total.toFixed(2)}</td>`
    };

    // --- Mapeamento e Navegação ---
    const renderers = {
        'dashboard': renderDashboard,
        'setores': () => renderGenericCrud(setoresConfig),
        'categorias': () => renderGenericCrud(categoriasConfig),
        'almoxarifados': () => renderGenericCrud(almoxarifadosConfig),
        'produtos': () => renderGenericCrud(produtosConfig),
        'usuarios': () => renderGenericCrud(usuariosConfig),
        'movimentacoes': renderMovimentacoes,
        'funcoes': () => renderGenericCrud(funcoesConfig),
        'tipos_veiculo': () => renderGenericCrud(tiposVeiculoConfig),
        'veiculos': () => renderGenericCrud(veiculosConfig),
        'controle_combustivel': renderControleCombustivel,
        'tipos_combustivel': () => renderGenericCrud(tiposCombustivelConfig),
        'fornecedores': () => renderGenericCrud(fornecedoresConfig),
        'manutencoes': () => renderGenericCrud(manutencoesConfig),
        'codigos_acesso': () => renderGenericCrud(codigosAcessoConfig),
        'relatorio-movimentacoes': () => renderRelatorioGenerico(relatorioMovimentacoesConfig),
        'importar-produtos': renderImportarProdutos,
        'funcionarios': () => renderGenericCrud(funcionariosConfig),
        'implementos': () => renderGenericCrud(implementosConfig)
    };
    
    // --- Event Listeners Globais ---
    // SUBSTITUA a função 'document.body.addEventListener' inteira por esta:
// SUBSTITUA o seu event listener 'document.body.addEventListener' por este bloco completo

document.body.addEventListener('click', async (e) => {
    const button = e.target.closest('button');
    if (!button) return; // Se o clique não foi num botão, sai da função

    const action = button.dataset.action;
    const id = button.dataset.id;

    // Ações para Entradas de Combustível
    if (action === 'edit-combustivel-entrada') {
        openEditCombustivelEntradaModal(id);
        return;
    }
    if (action === 'delete-combustivel-entrada') {
        deleteCombustivelEntrada(id);
        return;
    }

    // =====> LÓGICA CORRIGIDA E ADICIONADA AQUI <=====
    // Ações para Saídas de Combustível
    if (action === 'edit-combustivel-saida') {
        openEditCombustivelSaidaModal(id);
        return;
    }
    if (action === 'delete-combustivel-saida') {
        deleteCombustivelSaida(id);
        return;
    }
    // ===============================================

    // Ação para corrigir movimentação (código que já existia)
    if (button.classList.contains('edit-mov-btn')) {
        const movimentacaoId = button.dataset.id;
        openMovimentacaoModal(movimentacaoId);
        return;
    }

    // Ação para ver detalhes (notas fiscais) (código que já existia)
    if (button.classList.contains('details-btn')) {
        const fornecedorId = button.dataset.id;
        const fornecedorNome = button.dataset.name;
        openNotasFiscaisModal(fornecedorId, fornecedorNome);
        return;
    }

    // Ações genéricas de Editar e Apagar (código que já existia)
    const entity = button.dataset.entity;
    if (!entity) return;

    if (button.classList.contains('delete-btn')) {
        if (confirm(`Tem a certeza que deseja excluir este item?`)) {
            try {
                const result = await api.delete(entity, id);
                alert(result.message);
                const currentSection = document.querySelector('.content-section.active').id;
                showSection(currentSection);
            } catch (error) {
                alert(error.message);
            }
        }
    } else if (button.classList.contains('edit-btn')) {
        if (entity === 'setores') openSetorModal(id);
        else if (entity === 'categorias') openCategoriaModal(id);
        else if (entity === 'almoxarifados') openAlmoxarifadoModal(id);
        else if (entity === 'produtos') openProdutoModal(id);
        else if (entity === 'usuarios') openUsuarioModal(id);
        else if (entity === 'funcoes') openFuncaoModal(id);
        else if (entity === 'tipos_combustivel') openTipoCombustivelModal(id);
        else if (entity === 'tipos_veiculo') openTipoVeiculoModal(id);
        else if (entity === 'veiculos') openVeiculoModal(id);
        else if (entity === 'fornecedores') openFornecedorModal(id);
        else if (entity === 'manutencoes') openManutencaoModal(id);
        else if (entity === 'funcionarios') openFuncionarioModal(id);
        else if (entity === 'implementos') openImplementoModal(id);
    }
});
    window.addEventListener('popstate', (event) => {
        // Se o utilizador clicar em "Voltar", escondemos o modal visualmente
        // sem adicionar um novo estado ao histórico.
        const modalElement = document.getElementById('form-modal');
        if (modalElement && !modalElement.classList.contains('hidden')) {
            modalElement.classList.add('hidden');
        }
    });
    
     window.addEventListener('beforeunload', (event) => {
        // Exibe uma mensagem de confirmação padrão do navegador
        // para impedir que o utilizador feche a página acidentalmente.
        event.preventDefault();
        event.returnValue = '';
    });
    // Substitua o bloco acima por este
// SUBSTITUA o seu event listener 'submit' do modalForm por este bloco completo

if(modalForm) {
    modalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Aguarde...';

        const entity = e.target.dataset.entity;
        const editId = e.target.dataset.editId;
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // --- CÓDIGO CORRIGIDO ---
        if (entity === 'notas-fiscais') {
            let result;
            // A verificação abaixo impede o erro 'textContent of null'
            const modalTitleElement = document.querySelector('#modal-title');
            const fornecedorNome = modalTitleElement ? modalTitleElement.textContent.replace('Notas Fiscais de: ', '') : '';

            if (editId) {
                result = await api.put('notas-fiscais', editId, data);
            } else {
                result = await api.post('notas-fiscais', data);
            }

            closeModal();
            // Garante que só tenta reabrir o modal se tivermos o nome do fornecedor
            if (fornecedorNome) {
                openNotasFiscaisModal(data.fornecedor_id, fornecedorNome);
            }
            
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
            return; 
        }

        if (entity === 'manutencoes') {
            data.pecas = [];
            document.querySelectorAll('.peca-row').forEach(row => {
                const produtoId = row.querySelector('.peca-produto').value;
                const quantidade = row.querySelector('.peca-quantidade').value;
                if (produtoId && quantidade) {
                    data.pecas.push({
                        produto_id: produtoId,
                        quantidade: quantidade
                    });
                }
            });
        }
        if (editId && !data.password) {
            delete data.password;
        }

       try {
            let result;
             if (entity === 'combustivel-entradas' && editId) {
                result = await api.put('combustivel/entradas', editId, data);
            } 
            else if (entity === 'combustivel/saidas' && editId) {
                result = await api.put('combustivel/saidas', editId, data);
            } 
            else if (entity === 'movimentacoes' && editId) {
                result = await api.put('movimentacoes', editId, data);
            } else if (editId) {
                result = await api.put(entity, editId, data);
            } else {
                result = await api.post(entity, data);
            }
            alert(result.message);
            closeModal();

            if (entity.includes('combustivel')) {
                showSection('controle_combustivel');
            } else if (entity.includes('codigos-acesso')) {
                showSection('codigos_acesso');
            } else {
                showSection(entity);
            }

        } catch (error) {
            alert(error.message);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
}
    
    const showSection = (sectionId) => {
        contentSections.forEach(sec => sec.style.display = 'none');
        navLinks.forEach(link => link.classList.remove('active'));
        const sectionElement = document.getElementById(sectionId);
        const navLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
        if (sectionElement) sectionElement.style.display = 'block';
        if (navLink) navLink.classList.add('active');
        if (mobileHeaderTitle && navLink) {
            mobileHeaderTitle.textContent = navLink.querySelector('span').textContent;
        }
        if (renderers[sectionId]) {
            renderers[sectionId]();
        }
    };
    
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        // Se o link tiver target="_blank", não fazemos nada e deixamos o navegador abri-lo.
        if (link.getAttribute('target') === '_blank') {
            return;
        }

        // Caso contrário, impedimos a ação padrão e carregamos a secção na página.
        e.preventDefault();
        showSection(link.dataset.section);
    });
});

    // Inicialização
    showSection('dashboard');
});