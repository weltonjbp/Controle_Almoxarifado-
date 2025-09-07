from flask import Blueprint, jsonify, request, redirect, url_for, render_template
from app.models import db, Usuario, CodigoAcesso
from flask_login import login_user, logout_user, login_required

auth_bp = Blueprint('auth', __name__)

# --- ROTAS DE LOGIN ---

@auth_bp.route('/login', methods=['GET'])
def login_page():
    """Mostra a página de login."""
    return render_template('login.html')

@auth_bp.route('/login', methods=['POST'])
def login_submit():
    """Processa o envio do formulário de login."""
    data = request.form
    username = data.get('username')
    password = data.get('password')
    # --- MUDANÇA IMPORTANTE AQUI ---
    # Captura o valor da checkbox "remember". Se ela for marcada, o valor será 'on'.
    remember_me = True if data.get('remember') else False

    user = Usuario.query.filter_by(username=username).first()

    if user and user.check_password(password):
        # Passamos a variável 'remember_me' para a função 'login_user'.
        # O Flask-Login irá criar um cookie seguro para manter o utilizador logado.
        login_user(user, remember=remember_me)
        # Retorna uma resposta JSON para o JavaScript.
        return jsonify({"success": True, "redirect_url": url_for('main.dashboard_page')})
    
    # Se as credenciais forem inválidas, retorna uma mensagem de erro em JSON.
    return jsonify({'success': False, 'message': 'Credenciais inválidas.'}), 401

@auth_bp.route('/logout')
@login_required
def logout():
    """Termina a sessão do utilizador."""
    logout_user()
    return redirect(url_for('auth.login_page'))

# --- ROTAS DE REGISTO (NOVAS) ---
@auth_bp.route('/register', methods=['GET'])
def register_page():
    """Mostra a página de cadastro."""
    return render_template('register.html')

@auth_bp.route('/register', methods=['POST'])
def register_submit():
    """Processa o envio do formulário de cadastro com chave de acesso."""
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Pedido inválido.'}), 400

    username = data.get('username', '').strip()
    password = data.get('password')
    confirm_password = data.get('confirm_password')
    access_code = data.get('access_code', '').strip()

    if not all([username, password, access_code]):
        return jsonify({'message': 'Todos os campos são obrigatórios.'}), 400
    
    if password != confirm_password:
        return jsonify({'message': 'As palavras-passe não coincidem.'}), 400

    if Usuario.query.filter_by(username=username).first():
        return jsonify({'message': 'Este nome de utilizador já está em uso.'}), 409

    codigo = CodigoAcesso.query.filter_by(codigo=access_code, usado=False).first()
    if not codigo:
        return jsonify({'message': 'Chave de acesso inválida ou já utilizada.'}), 403

    new_user = Usuario(username=username, role=codigo.role_permitida)
    new_user.set_password(password)
    
    codigo.usado = True

    db.session.add(new_user)
    db.session.add(codigo)
    db.session.commit()

    return jsonify({'message': 'Utilizador criado com sucesso! A redirecionar...'}), 201