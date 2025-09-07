# Em app/routes/funcionarios.py

from flask import Blueprint, jsonify, request
from ..models import db, Funcionario
from flask_login import login_required
from ..decorators import gerente_required

funcionarios_bp = Blueprint('funcionarios', __name__)

@funcionarios_bp.route('/funcionarios', methods=['GET'])
@login_required
def get_funcionarios():
    page = request.args.get('page', 1, type=int)
    per_page = 20
    search = request.args.get('search', '')

    query = Funcionario.query
    if search:
        query = query.filter(Funcionario.nome.ilike(f'%{search}%'))

    pagination = query.order_by(Funcionario.nome).paginate(page=page, per_page=per_page, error_out=False)
    funcionarios = pagination.items

    # --- CORREÇÃO APLICADA AQUI ---
    # Adicionada uma verificação de segurança para f.setor
    funcionarios_data = [{
        'id': f.id, 
        'nome': f.nome, 
        'cargo': f.cargo,
        'setor_nome': f.setor.nome if f.setor else 'Setor Removido' 
    } for f in funcionarios]
    
    return jsonify({
        'data': funcionarios_data,
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })

@funcionarios_bp.route('/funcionarios/<int:id>', methods=['GET'])
@login_required
def get_funcionario(id):
    f = Funcionario.query.get_or_404(id)
    return jsonify({
        'id': f.id, 'nome': f.nome, 'cargo': f.cargo, 'setor_id': f.setor_id
    })

@funcionarios_bp.route('/funcionarios', methods=['POST'])
@login_required
@gerente_required
def create_funcionario():
    data = request.get_json()
    if not data or not data.get('nome') or not data.get('setor_id'):
        return jsonify({'error': 'Nome e setor são obrigatórios.'}), 400
    
    novo = Funcionario(
        nome=data['nome'], 
        cargo=data.get('cargo'), 
        setor_id=data['setor_id']
    )
    db.session.add(novo)
    db.session.commit()
    return jsonify({'message': 'Funcionário criado com sucesso!'}), 201

@funcionarios_bp.route('/funcionarios/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_funcionario(id):
    func = Funcionario.query.get_or_404(id)
    data = request.get_json()
    
    func.nome = data.get('nome', func.nome)
    func.cargo = data.get('cargo', func.cargo)
    func.setor_id = data.get('setor_id', func.setor_id)
    
    db.session.commit()
    return jsonify({'message': 'Funcionário atualizado com sucesso!'})

@funcionarios_bp.route('/funcionarios/<int:id>', methods=['DELETE'])
@login_required
@gerente_required
def delete_funcionario(id):
    func = Funcionario.query.get_or_404(id)
    db.session.delete(func)
    db.session.commit()
    return jsonify({'message': 'Funcionário apagado com sucesso!'})