# Em app/routes/tipos_veiculo.py

from flask import Blueprint, jsonify, request
from ..models import db, TipoVeiculo
from flask_login import login_required
from ..decorators import gerente_required

tipos_veiculo_bp = Blueprint('tipos_veiculo', __name__)

@tipos_veiculo_bp.route('/tipos_veiculo', methods=['GET'])
@login_required
def get_tipos_veiculo():
    # --- LÓGICA DE BUSCA E PAGINAÇÃO ADICIONADA ---
    page = request.args.get('page', 1, type=int)
    per_page = 20
    search = request.args.get('search', '')

    query = TipoVeiculo.query
    if search:
        query = query.filter(TipoVeiculo.nome.ilike(f'%{search}%'))

    pagination = query.order_by(TipoVeiculo.nome).paginate(page=page, per_page=per_page, error_out=False)
    tipos = pagination.items
    
    tipos_data = [{'id': t.id, 'nome': t.nome} for t in tipos]

    return jsonify({
        'data': tipos_data,
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })

@tipos_veiculo_bp.route('/tipos_veiculo/<int:id>', methods=['GET'])
@login_required
def get_tipo_veiculo(id):
    tipo = TipoVeiculo.query.get_or_404(id)
    return jsonify({'id': tipo.id, 'nome': tipo.nome})

@tipos_veiculo_bp.route('/tipos_veiculo', methods=['POST'])
@login_required
@gerente_required
def create_tipo_veiculo():
    data = request.get_json()
    if not data or not data.get('nome'):
        return jsonify({'error': 'O nome do tipo de veículo é obrigatório.'}), 400
    if TipoVeiculo.query.filter_by(nome=data['nome']).first():
        return jsonify({'error': 'Este tipo de veículo já existe.'}), 409

    novo_tipo = TipoVeiculo(nome=data['nome'])
    db.session.add(novo_tipo)
    db.session.commit()
    return jsonify({'message': 'Tipo de veículo criado com sucesso!'}), 201

@tipos_veiculo_bp.route('/tipos_veiculo/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_tipo_veiculo(id):
    tipo = TipoVeiculo.query.get_or_404(id)
    data = request.get_json()
    novo_nome = data.get('nome')
    if novo_nome and novo_nome != tipo.nome and TipoVeiculo.query.filter_by(nome=novo_nome).first():
        return jsonify({'error': 'Este nome de tipo de veículo já está em uso.'}), 409
        
    tipo.nome = novo_nome or tipo.nome
    db.session.commit()
    return jsonify({'message': 'Tipo de veículo atualizado com sucesso!'})

@tipos_veiculo_bp.route('/tipos_veiculo/<int:id>', methods=['DELETE'])
@login_required
@gerente_required
def delete_tipo_veiculo(id):
    tipo = TipoVeiculo.query.get_or_404(id)
    db.session.delete(tipo)
    db.session.commit()
    return jsonify({'message': 'Tipo de veículo apagado com sucesso!'})