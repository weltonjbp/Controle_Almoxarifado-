# Em app/routes/movimentacoes.py

from flask import Blueprint, jsonify, request
from ..models import db, Produto, Setor, Movimentacao, Funcionario, EstoqueLote, Usuario # Adicionar EstoqueLote e Usuario
from flask_login import login_required, current_user
from ..decorators import gerente_required
from datetime import datetime

movimentacoes_bp = Blueprint('movimentacoes', __name__)

# ... (a rota get_movimentacoes não precisa de alterações por agora) ...
@movimentacoes_bp.route('/movimentacoes', methods=['GET'])
@login_required
def get_movimentacoes():
    movs = Movimentacao.query.order_by(Movimentacao.data.desc()).limit(50).all()
    return jsonify([{
        'id': m.id,
        'produto_nome': m.produto.nome if m.produto else 'Produto Removido',
        'tipo': m.tipo,
        'quantidade': m.quantidade,
        'setor_nome': m.setor.nome if m.setor else 'Setor Removido',
        'data': m.data.strftime('%d/%m/%Y %H:%M'),
        'usuario_nome': m.usuario.username if m.usuario else 'Utilizador Removido',
        'funcionario_nome': m.funcionario.nome if m.funcionario else None,
        'veiculo_nome': m.veiculo.nome if m.veiculo else None # <-- Adicionado
    } for m in movs])


@movimentacoes_bp.route('/movimentacoes', methods=['POST'])
@login_required
def create_movimentacao():
    data = request.get_json()
    required = ['produto_id', 'tipo', 'quantidade', 'setor_id']
    if not all(field in data and data[field] for field in required):
        return jsonify({'error': 'Todos os campos são obrigatórios.'}), 400

    produto = Produto.query.get(data['produto_id'])
    if not produto:
        return jsonify({'error': 'Produto não encontrado.'}), 404
        
    quantidade = int(data['quantidade'])
    
    # --- LÓGICA DE ENTRADA COM LOTE E VALIDADE ---
    if data['tipo'] == 'entrada':
        lote_str = data.get('lote')
        validade_str = data.get('data_validade')

        if not lote_str:
            return jsonify({'error': 'O número do lote é obrigatório para entradas.'}), 400

        # Converte a data de validade, se existir
        data_validade = None
        if validade_str:
            try:
                data_validade = datetime.strptime(validade_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Formato de data de validade inválido. Use AAAA-MM-DD.'}), 400

        # Procura se o lote já existe para este produto
        lote_existente = EstoqueLote.query.filter_by(produto_id=produto.id, lote=lote_str).first()

        if lote_existente:
            # Se o lote já existe, apenas atualiza a quantidade
            lote_existente.quantidade += quantidade
        else:
            # Se não existe, cria um novo registo de lote
            novo_lote = EstoqueLote(
                produto_id=produto.id,
                lote=lote_str,
                data_validade=data_validade,
                quantidade=quantidade
            )
            db.session.add(novo_lote)
        
        # Atualiza o stock total do produto
        produto.estoque += quantidade

    # --- LÓGICA DE SAÍDA ---
    elif data['tipo'] == 'saida':
        # Validação de EPI
        funcionario_id = data.get('funcionario_id')
        if produto.is_epi and not funcionario_id:
            return jsonify({'error': 'Para saída de EPI, é obrigatório selecionar um funcionário.'}), 400
        
         # --- NOVA VALIDAÇÃO PARA PEÇAS VEICULARES ---
        veiculo_id = data.get('veiculo_id')
        if produto.is_peca_veicular and not veiculo_id:
            return jsonify({'error': 'Para saída de Peça Veicular, é obrigatório selecionar um veículo.'}), 400
        
        
        if produto.estoque < quantidade:
            return jsonify({'error': f'Stock insuficiente. Disponível: {produto.estoque}'}), 400
        
        # TODO: Implementar a lógica de abate do lote mais antigo (PEPS/FEFO) no futuro.
        # Por agora, apenas abatemos do stock total.
        produto.estoque -= quantidade
    
    else:
        return jsonify({'error': 'Tipo de movimentação inválido.'}), 400

    # Cria o registo histórico da movimentação
    nova_movimentacao = Movimentacao(
        produto_id=data['produto_id'],
        tipo=data['tipo'],
        quantidade=quantidade,
        setor_id=data['setor_id'],
        usuario_id=current_user.id,
        funcionario_id=data.get('funcionario_id'),
        veiculo_id=data.get('veiculo_id'), # <-- Adicionado
        lote=data.get('lote'),
        data_validade=data_validade if data['tipo'] == 'entrada' and data_validade else None
    )

    db.session.add(nova_movimentacao)
    db.session.add(produto) 
    db.session.commit()

    return jsonify({'message': 'Movimentação registada com sucesso!'}), 201


# --- NOVA ROTA ADICIONADA PARA BUSCAR UMA MOVIMENTAÇÃO ---
@movimentacoes_bp.route('/movimentacoes/<int:id>', methods=['GET'])
@login_required
def get_movimentacao(id):
    m = Movimentacao.query.get_or_404(id)
    return jsonify({
        'id': m.id,
        'produto_nome': m.produto.nome if m.produto else 'Produto Removido',
        'quantidade': m.quantidade,
        'data': m.data.strftime('%d/%m/%Y %H:%M'),
    })
    
    
@movimentacoes_bp.route('/movimentacoes/<int:id>', methods=['PUT'])
@login_required
def update_movimentacao(id):
    data = request.get_json()
    
    # Validação dos dados recebidos
    if not all(k in data for k in ['gerente_username', 'gerente_password', 'quantidade', 'motivo']):
        return jsonify({'error': 'Todos os campos para correção são obrigatórios.'}), 400

    # 1. Autenticação do Gerente
    gerente = Usuario.query.filter_by(username=data['gerente_username']).first()
    if not gerente or not gerente.check_password(data['gerente_password']):
        return jsonify({'error': 'Credenciais do gerente inválidas.'}), 401
    if gerente.role != 'gerente':
        return jsonify({'error': 'A autorização requer um perfil de gerente.'}), 403

    # 2. Busca dos registros
    movimentacao = Movimentacao.query.get_or_404(id)
    produto = movimentacao.produto
    quantidade_antiga = movimentacao.quantidade
    quantidade_nova = int(data['quantidade'])
    
    # 3. Cálculo da diferença de estoque
    diferenca_estoque = quantidade_nova - quantidade_antiga

    # 4. Verifica se a correção é viável (não deixa estoque negativo)
    if produto.estoque - diferenca_estoque < 0:
        return jsonify({'error': f'Esta correção deixaria o estoque negativo. Estoque atual: {produto.estoque}'}), 400

    # 5. Aplica as alterações
    produto.estoque -= diferenca_estoque # Ajusta o estoque do produto
    movimentacao.quantidade = quantidade_nova # Atualiza a quantidade na movimentação
    
    # Adiciona um campo para log (vamos precisar ajustar o modelo para isso depois)
    # Por agora, vamos apenas salvar
    
    db.session.commit()

    return jsonify({'message': 'Movimentação corrigida com sucesso!'}), 200    