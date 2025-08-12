# Em app/routes/movimentacoes.py

from flask import Blueprint, jsonify, request
from ..models import db, Produto, Setor, Movimentacao
from flask_login import login_required, current_user # Importar current_user
from ..decorators import gerente_required # Importar nosso novo decorator
movimentacoes_bp = Blueprint('movimentacoes', __name__)

@movimentacoes_bp.route('/movimentacoes', methods=['GET'])
@login_required
def get_movimentacoes():
    movs = Movimentacao.query.order_by(Movimentacao.data.desc()).limit(50).all()
    # CORREÇÃO AQUI: Adicionar 'usuario_nome'
    return jsonify([{
        'id': m.id,
        'produto_nome': m.produto.nome,
        'tipo': m.tipo,
        'quantidade': m.quantidade,
        'setor_nome': m.setor.nome,
        'data': m.data.strftime('%d/%m/%Y %H:%M'),
        'usuario_nome': m.usuario.username # Adicionar esta linha
    } for m in movs])


@movimentacoes_bp.route('/movimentacoes', methods=['POST'])
@login_required # Movimentações exigem login para todos
def create_movimentacao():
    data = request.get_json()
    required = ['produto_id', 'tipo', 'quantidade', 'setor_id']
    if not all(field in data and data[field] for field in required):
        return jsonify({'error': 'Todos os campos são obrigatórios.'}), 400

    produto = Produto.query.get(data['produto_id'])
    if not produto:
        return jsonify({'error': 'Produto não encontrado.'}), 404
        
    quantidade = int(data['quantidade'])
    
    # Lógica de atualização de estoque
    if data['tipo'] == 'saida':
        if produto.estoque < quantidade:
            return jsonify({'error': f'Estoque insuficiente. Disponível: {produto.estoque}'}), 400
        produto.estoque -= quantidade
    elif data['tipo'] == 'entrada':
        produto.estoque += quantidade
    else:
        return jsonify({'error': 'Tipo de movimentação inválido.'}), 400

    nova_movimentacao = Movimentacao(
        produto_id=data['produto_id'],
        tipo=data['tipo'],
        quantidade=quantidade,
        setor_id=data['setor_id']
    )
    # --- MUDANÇA PRINCIPAL AQUI ---
    nova_movimentacao = Movimentacao(
        produto_id=data['produto_id'],
        tipo=data['tipo'],
        quantidade=quantidade,
        setor_id=data['setor_id'],
        usuario_id=current_user.id # Salva o ID do usuário logado
    )
    db.session.add(nova_movimentacao)
    db.session.add(produto) # Adiciona o produto à sessão para salvar a alteração de estoque
    db.session.commit()

    return jsonify({'message': 'Movimentação registrada com sucesso!'}), 201