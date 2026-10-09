<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cadastro - Écoleta</title>
  <link rel="stylesheet" href="cadastro.css">
  <link rel="icon" href="./img/icons/logo.png">
</head>
<body>
  <header class="header">
        <div class="menu">
            <nav class="nav">
                <a href="" class="logo"><img src="./img/icons/logo.png" alt="" width="280" height="250"></a>
                <ul class="nav-list">
                    <li><a href="./inicio.html">Início</a></li>
                    <li><a href="#">Nossa equipe</a></li>
                    <li><a href="#">O projeto</a></li>
                    <li><a href="#">Contato</a></li>
                    <li><a href="./login.php">Login</a></li>
                    <li><a href="./cadastro.php">Cadastre-se</a></li>
                </ul>
            </nav>
        </div>
  </header>

  <main class="main">
    <div class="overlay"></div>
    <div class="form-container">
      <form class="form-cadastro" action="./act/cadastro.php" method="POST">
        <h2>Cadastre-se</h2>
        <p>Preencha os dados solicitados abaixo para ter acesso a uma conta no nosso site</p>

        <label for="usuario">Nome de Usuário</label>
        <input type="text" id="usuario" name="usuario" placeholder="Digite seu nome de usuário" maxlength="20" required>

        <label for="email">E-mail</label>
        <input type="email" id="email" name="email" placeholder="Digite seu e-mail" maxlength="150" required>

        <label for="senha">Senha</label>
        <input type="password" id="senha" name="senha" placeholder="Digite sua senha" minlength="6" required>

        <label for="cep">CEP</label>
        <input type="text" id="cep" name="cep" placeholder="00000-000" inputmode="numeric" pattern="\d{5}-?\d{3}" maxlength="9" required>

        <button type="submit">CRIAR</button>
        
      </form>
    </div>
  </main>
</body>
</html>