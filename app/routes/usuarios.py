# Em app/routes/usuarios.py

from flask import Blueprint, jsonify, request
from ..models import db, Usuario
from flask_login import login_required, current_user
from ..decorators import gerente_required

usuarios_bp = Blueprint('usuarios', __name__)

# Rota para LER (GET) todos os utilizadores
@usuarios_bp.route('/usuarios', methods=['GET'])
@login_required
@gerente_required
def get_usuarios():
    users = Usuario.query.order_by(Usuario.username).all()
    return jsonify([{'id': u.id, 'username': u.username, 'role': u.role} for u in users])

# Rota para LER (GET) um único utilizador por ID
@usuarios_bp.route('/usuarios/<int:id>', methods=['GET'])
@login_required
@gerente_required
def get_usuario(id):
    user = Usuario.query.get_or_404(id)
    return jsonify({'id': user.id, 'username': user.username, 'role': user.role})

# Rota para CRIAR (POST) um novo utilizador
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

# Rota para ATUALIZAR (PUT) um utilizador existente
@usuarios_bp.route('/usuarios/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_usuario(id):
    user = Usuario.query.get_or_404(id)
    data = request.get_json()

    # Atualiza o nome de utilizador se for fornecido e diferente
    new_username = data.get('username')
    if new_username and new_username != user.username:
        if Usuario.query.filter_by(username=new_username).first():
            return jsonify({'error': 'Este nome de utilizador já está em uso.'}), 409
        user.username = new_username

    # Atualiza o perfil (role) se for fornecido
    if data.get('role'):
        user.role = data.get('role')

    # Atualiza a senha se for fornecida
    if data.get('password'):
        user.set_password(data.get('password'))
        
    db.session.commit()
    return jsonify({'message': 'Utilizador atualizado com sucesso!'})

# Rota para APAGAR (DELETE) um utilizador
@usuarios_bp.route('/usuarios/<int:id>', methods=['DELETE'])
@login_required
@gerente_required
def delete_usuario(id):
    user = Usuario.query.get_or_404(id)
    # Impede que o utilizador se apague a si mesmo
    if user.id == current_user.id:
        return jsonify({'error': 'Não pode apagar o seu próprio utilizador.'}), 403
        
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Utilizador apagado com sucesso!'})
