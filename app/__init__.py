import os
from flask import Flask
from config import Config
from .models import db, Usuario
from flask_login import LoginManager

def create_app(config_class=Config):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_class)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    db.init_app(app)

    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login_page'

    @login_manager.user_loader
    def load_user(user_id):
        return Usuario.query.get(int(user_id))

    # --- Registro dos Blueprints ---
    from app.routes.main import main_bp
    from app.routes.auth import auth_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    from app.routes.setores import setores_bp
    app.register_blueprint(setores_bp, url_prefix='/api')
    
    from app.routes.categorias import categorias_bp
    app.register_blueprint(categorias_bp, url_prefix='/api')
    
    from app.routes.almoxarifados import almoxarifados_bp
    app.register_blueprint(almoxarifados_bp, url_prefix='/api')
    
    from app.routes.produtos import produtos_bp
    app.register_blueprint(produtos_bp, url_prefix='/api')
    
    from app.routes.movimentacoes import movimentacoes_bp
    app.register_blueprint(movimentacoes_bp, url_prefix='/api')
    
    from app.routes.relatorios import relatorios_bp
    app.register_blueprint(relatorios_bp, url_prefix='/api')
    
    from app.routes.usuarios import usuarios_bp
    app.register_blueprint(usuarios_bp, url_prefix='/api')
    
    from app.routes.funcoes import funcoes_bp
    app.register_blueprint(funcoes_bp, url_prefix='/api')
    
    from app.routes.tipos_combustivel import tipos_combustivel_bp
    app.register_blueprint(tipos_combustivel_bp, url_prefix='/api')
    
    from app.routes.tipos_veiculo import tipos_veiculo_bp
    app.register_blueprint(tipos_veiculo_bp, url_prefix='/api')
    
    from app.routes.veiculos import veiculos_bp
    app.register_blueprint(veiculos_bp, url_prefix='/api')
    
    from app.routes.combustivel import combustivel_bp
    app.register_blueprint(combustivel_bp, url_prefix='/api')
    
    from app.routes.funcionarios import funcionarios_bp
    app.register_blueprint(funcionarios_bp, url_prefix='/api')
    
    from app.routes.manutencoes import manutencoes_bp
    app.register_blueprint(manutencoes_bp, url_prefix='/api')
    
    from app.routes.admin import admin_bp
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    from app.routes.fornecedores import fornecedores_bp
    app.register_blueprint(fornecedores_bp, url_prefix='/api')
    
    from app.routes.notas_fiscais import notas_fiscais_bp
    app.register_blueprint(notas_fiscais_bp, url_prefix='/api')
    
        
    return app