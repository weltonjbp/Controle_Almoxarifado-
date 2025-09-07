# Em app/routes/manutencoes.py

from flask import Blueprint, jsonify, request
from ..models import db, Manutencao, ManutencaoPecas, Veiculo, Produto, Movimentacao
from flask_login import login_required, current_user
from ..decorators import gerente_required
from datetime import datetime

manutencoes_bp = Blueprint('manutencoes', __name__)

@manutencoes_bp.route('/manutencoes', methods=['GET'])
@login_required
def get_manutencoes():
    page = request.args.get('page', 1, type=int)
    per_page = 20
    search = request.args.get('search', '')

    query = Manutencao.query.join(Veiculo)
    if search:
        query = query.filter(Veiculo.nome.ilike(f'%{search}%'))

    pagination = query.order_by(Manutencao.data.desc()).paginate(page=page, per_page=per_page, error_out=False)
    manutencoes = pagination.items

    manutencoes_data = [{
        'id': m.id,
        'veiculo_nome': m.veiculo.nome if m.veiculo else 'Veículo Removido',
        'data': m.data.strftime('%d/%m/%Y'),
        'tipo': m.tipo,
        'descricao': m.descricao,
        'custo_total': m.custo_total
    } for m in manutencoes]

    return jsonify({
        'data': manutencoes_data,
        'total_pages': pagination.pages,
        'current_page': pagination.page
    })

@manutencoes_bp.route('/manutencoes', methods=['POST'])
@login_required
@gerente_required
def create_manutencao():
    data = request.get_json()
    
    # Validação dos dados principais
    if not all(k in data for k in ['veiculo_id', 'tipo', 'data', 'descricao']):
        return jsonify({'error': 'Dados incompletos.'}), 400

    # Cria o registo principal da manutenção
    nova_manutencao = Manutencao(
        veiculo_id=data['veiculo_id'],
        tipo=data['tipo'],
        data=datetime.strptime(data['data'], '%Y-%m-%d').date(),
        descricao=data['descricao'],
        custo_mo=float(data.get('custo_mo', 0))
    )
    db.session.add(nova_manutencao)
    
    # Processa as peças utilizadas
    pecas = data.get('pecas', [])
    for peca_data in pecas:
        produto = Produto.query.get(peca_data['produto_id'])
        quantidade = int(peca_data['quantidade'])
        
        if not produto or produto.estoque < quantidade:
            db.session.rollback()
            return jsonify({'error': f'Stock insuficiente para a peça: {produto.nome}.'}), 400

        # Abate a peça do stock
        produto.estoque -= quantidade
        
        # Cria a associação da peça com a manutenção
        peca_utilizada = ManutencaoPecas(
            manutencao=nova_manutencao,
            produto_id=produto.id,
            quantidade=quantidade
        )
        db.session.add(peca_utilizada)

        # Regista uma movimentação de saída para rastreabilidade
        movimentacao = Movimentacao(
            tipo='saida',
            produto_id=produto.id,
            quantidade=quantidade,
            setor_id=1, # Pode ser o ID do setor 'Oficina' ou um setor padrão
            usuario_id=current_user.id,
            veiculo_id=data['veiculo_id']
        )
        db.session.add(movimentacao)

    db.session.commit()
    return jsonify({'message': 'Manutenção registada com sucesso!'}), 201

