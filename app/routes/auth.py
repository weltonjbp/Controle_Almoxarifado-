from flask import Blueprint, render_template, request, redirect, url_for, flash
from app.models import db, Usuario
from flask_login import login_user, logout_user, login_required

auth_bp = Blueprint('auth', __name__)

# Rota para exibir a página de login
@auth_bp.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html') # Precisaremos criar este arquivo

# Rota para processar os dados do formulário de login
@auth_bp.route('/login', methods=['POST'])
def login_submit():
    username = request.form.get('username')
    password = request.form.get('password')
    remember = True if request.form.get('remember') else False

    user = Usuario.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        flash('Usuário ou senha inválidos. Por favor, tente novamente.')
        return redirect(url_for('auth.login_page'))

    login_user(user, remember=remember)
    return redirect(url_for('main.dashboard_page'))

# Rota para fazer logout
@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login_page'))