# Em app/routes/tipos_combustivel.py

from flask import Blueprint, jsonify, request
from ..models import db, TipoCombustivel
from flask_login import login_required
from ..decorators import gerente_required

tipos_combustivel_bp = Blueprint('tipos_combustivel', __name__)

@tipos_combustivel_bp.route('/tipos_combustivel', methods=['GET'])
@login_required
def get_tipos_combustivel():
    page = request.args.get('page', 1, type=int)
    per_page = 1000 # Um número grande para garantir que todos os tipos venham para os dropdowns
    search = request.args.get('search', '')

    query = TipoCombustivel.query
    if search:
        query = query.filter(TipoCombustivel.nome.ilike(f'%{search}%'))
        
    pagination = query.order_by(TipoCombustivel.nome).paginate(page=page, per_page=per_page, error_out=False)
    items = pagination.items

    data = [{'id': t.id, 'nome': t.nome} for t in items]
    
    return jsonify({
        'data': data,
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })

@tipos_combustivel_bp.route('/tipos_combustivel/<int:id>', methods=['GET'])
@login_required
def get_tipo_combustivel(id):
    tipo = TipoCombustivel.query.get_or_404(id)
    return jsonify({'id': tipo.id, 'nome': tipo.nome})

@tipos_combustivel_bp.route('/tipos_combustivel', methods=['POST'])
@login_required
@gerente_required
def create_tipo_combustivel():
    data = request.get_json()
    if not data or not data.get('nome'):
        return jsonify({'error': 'O nome do tipo de combustível é obrigatório.'}), 400
    if TipoCombustivel.query.filter(TipoCombustivel.nome.ilike(data['nome'])).first():
        return jsonify({'error': 'Este tipo de combustível já existe.'}), 409

    novo_tipo = TipoCombustivel(nome=data['nome'])
    db.session.add(novo_tipo)
    db.session.commit()
    return jsonify({'message': 'Tipo de combustível criado com sucesso!'}), 201

@tipos_combustivel_bp.route('/tipos_combustivel/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_tipo_combustivel(id):
    tipo = TipoCombustivel.query.get_or_404(id)
    data = request.get_json()
    novo_nome = data.get('nome')
    if novo_nome and novo_nome.lower() != tipo.nome.lower() and TipoCombustivel.query.filter(TipoCombustivel.nome.ilike(novo_nome)).first():
        return jsonify({'error': 'Este nome de tipo de combustível já está em uso.'}), 409
        
    tipo.nome = novo_nome or tipo.nome
    db.session.commit()
    return jsonify({'message': 'Tipo de combustível atualizado com sucesso!'})

@tipos_combustivel_bp.route('/tipos_combustivel/<int:id>', methods=['DELETE'])
@login_required
@gerente_required
def delete_tipo_combustivel(id):
    tipo = TipoCombustivel.query.get_or_404(id)
    db.session.delete(tipo)
    db.session.commit()
    return jsonify({'message': 'Tipo de combustível apagado com sucesso!'})