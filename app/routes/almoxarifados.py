# Em app/routes/almoxarifados.py

from flask import Blueprint, jsonify, request
from ..models import db, Almoxarifado
from ..decorators import gerente_required
from flask_login import login_required

almoxarifados_bp = Blueprint('almoxarifados', __name__)

@almoxarifados_bp.route('/almoxarifados', methods=['GET'])
@login_required
def get_almoxarifados():
    page = request.args.get('page', 1, type=int)
    per_page = 20
    search = request.args.get('search', '')

    query = Almoxarifado.query
    if search:
        query = query.filter(Almoxarifado.nome.ilike(f'%{search}%'))

    pagination = query.order_by(Almoxarifado.nome).paginate(page=page, per_page=per_page, error_out=False)
    items = pagination.items
    
    data = [{'id': a.id, 'nome': a.nome, 'localizacao': a.localizacao} for a in items]
    
    return jsonify({
        'data': data,
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })

@almoxarifados_bp.route('/almoxarifados/<int:id>', methods=['GET'])
def get_almoxarifado(id):
    almoxarifado = Almoxarifado.query.get_or_404(id)
    return jsonify({'id': almoxarifado.id, 'nome': almoxarifado.nome, 'localizacao': almoxarifado.localizacao})

@almoxarifados_bp.route('/almoxarifados', methods=['POST'])
@login_required
@gerente_required
def create_almoxarifado():
    data = request.get_json()
    if not data or not data.get('nome'):
        return jsonify({'error': 'O nome do almoxarifado é obrigatório.'}), 400
    if Almoxarifado.query.filter_by(nome=data['nome']).first():
        return jsonify({'error': 'Este almoxarifado já existe.'}), 409

    novo_almoxarifado = Almoxarifado(nome=data['nome'], localizacao=data.get('localizacao'))
    db.session.add(novo_almoxarifado)
    db.session.commit()
    return jsonify({'message': 'Almoxarifado criado com sucesso!', 'id': novo_almoxarifado.id}), 201

@almoxarifados_bp.route('/almoxarifados/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_almoxarifado(id):
    almoxarifado = Almoxarifado.query.get_or_404(id)
    data = request.get_json()
    novo_nome = data.get('nome')
    if novo_nome and novo_nome != almoxarifado.nome and Almoxarifado.query.filter_by(nome=novo_nome).first():
        return jsonify({'error': 'Este nome de almoxarifado já está em uso.'}), 409
        
    almoxarifado.nome = novo_nome or almoxarifado.nome
    almoxarifado.localizacao = data.get('localizacao', almoxarifado.localizacao)
    db.session.commit()
    return jsonify({'message': 'Almoxarifado atualizado com sucesso!'})

@almoxarifados_bp.route('/almoxarifados/<int:id>', methods=['DELETE'])
@login_required
@gerente_required
def delete_almoxarifado(id):
    almoxarifado = Almoxarifado.query.get_or_404(id)
    db.session.delete(almoxarifado)
    db.session.commit()
    return jsonify({'message': 'Almoxarifado apagado com sucesso!'})