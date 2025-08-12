import os

# Define o diretório base do projeto para encontrar o banco de dados
basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Configurações da aplicação Flask."""
    
    # Chave secreta para segurança das sessões e formulários
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'sua-chave-secreta-aqui-bem-dificil'
    
    # Configuração do banco de dados SQLite
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'instance', 'almoxarifado.db')
        
    # Desativa uma funcionalidade do SQLAlchemy que não usaremos, para economizar recursos
    SQLALCHEMY_TRACK_MODIFICATIONS = False