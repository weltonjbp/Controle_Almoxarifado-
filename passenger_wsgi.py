import os
import sys

# Adiciona o diretório do seu projeto ao path do Python para que ele encontre seus módulos
# Altere '/home/gmapsist/f6p.gmapsistemas.com.br' se o seu projeto estiver noutro lugar
# No seu caso, o caminho atual parece correto.
sys.path.insert(0, os.path.dirname(__file__))

# Importa a função que cria a sua aplicação (o "app factory")
from app import create_app

# Cria a instância da aplicação que o servidor Passenger irá usar
application = create_app()