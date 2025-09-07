# Em app/routes/usuarios.py

from flask import Blueprint, jsonify, request
from ..models import db, Usuario
from flask_login import login_required, current_user
from ..decorators import gerente_required

usuarios_bp = Blueprint('usuarios', __name__)

@usuarios_bp.route('/usuarios', methods=['GET'])
@login_required
@gerente_required
def get_usuarios():
    # --- LÓGICA DE BUSCA E PAGINAÇÃO ADICIONADA ---
    page = request.args.get('page', 1, type=int)
    per_page = 20
    search = request.args.get('search', '')

    query = Usuario.query
    if search:
        query = query.filter(Usuario.username.ilike(f'%{search}%'))

    pagination = query.order_by(Usuario.id.asc()).paginate(page=page, per_page=per_page, error_out=False)
    users = pagination.items
    
    users_data = [{'id': u.id, 'username': u.username, 'role': u.role} for u in users]

    return jsonify({
        'data': users_data,
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })

@usuarios_bp.route('/usuarios/<int:id>', methods=['GET'])
@login_required
@gerente_required
def get_usuario(id):
    user = Usuario.query.get_or_404(id)
    return jsonify({'id': user.id, 'username': user.username, 'role': user.role})

@usuarios_bp.route('/usuarios', methods=['POST'])
@login_required
@gerente_required
def create_usuario():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Nome de utilizador e senha são obrigatórios.'}), 400
    if Usuario.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Este nome de utilizador já existe.'}), 409

    novo_usuario = Usuario(
        username=data['username'],
        role=data.get('role', 'supervisor')
    )
    novo_usuario.set_password(data['password'])
    db.session.add(novo_usuario)
    db.session.commit()
    return jsonify({'message': 'Utilizador criado com sucesso!'}), 201

@usuarios_bp.route('/usuarios/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_usuario(id):
    user = Usuario.query.get_or_404(id)
    data = request.get_json()
    
    novo_username = data.get('username')
    if novo_username and novo_username != user.username and Usuario.query.filter_by(username=novo_username).first():
        return jsonify({'error': 'Este nome de utilizador já está em uso.'}), 409

    user.username = novo_username or user.username
    user.role = data.get('role', user.role)
    
    if data.get('password'):
        user.set_password(data['password'])
        
    db.session.commit()
    return jsonify({'message': 'Utilizador atualizado com sucesso!'})

@usuarios_bp.route('/usuarios/<int:id>', methods=['DELETE'])
@login_required
@gerente_required
def delete_usuario(id):
    if id == current_user.id:
        return jsonify({'error': 'Não pode apagar o seu próprio utilizador.'}), 403
        
    user = Usuario.query.get_or_404(id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Utilizador apagado com sucesso!'})