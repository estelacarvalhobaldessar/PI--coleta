# Écoleta

Aplicativo que mostra ao morador a rota do caminhão de coleta até o seu endereço e o horário previsto de chegada. A ideia é resolver um problema comum: as pessoas não sabem quando o caminhão vai passar, perdem o horário e o lixo acaba acumulando nas calçadas.

Projeto do grupo **2025-2MA-cidadeconectada-G01**. Equipe: Ana, Camila, Duda e Estela.

## Sumário

- [Visão geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Configuração](#configuração)
- [Checklist: Windows com XAMPP](#checklist-windows-com-xampp)
- [Como rodar](#como-rodar)
- [Como funciona](#como-funciona)
- [Referência das APIs](#referência-das-apis)
- [Banco de dados](#banco-de-dados)
- [Segurança](#segurança)
- [Testes](#testes)
- [Solução de problemas](#solução-de-problemas)
- [Pontos de atenção](#pontos-de-atenção)

## Visão geral

O projeto tem três partes:

| Pasta | O que é | Tecnologia |
| --- | --- | --- |
| `app/` | O aplicativo: login, cadastro e o mapa com a rota do caminhão. | React (Vite) + servidor Node.js (Express) |
| `api/` | API de usuários: cadastro, login e endereço do usuário. | PHP + MySQL, servida pelo Apache |
| `website/` | Site institucional: apresentação do projeto, da equipe e páginas próprias de login e cadastro. | HTML, CSS e PHP |

O caminho de quem usa o aplicativo:

1. Na primeira visita, abre a tela de **Login**.
2. Quem não tem conta clica em **Criar uma conta** e preenche nome, e-mail, CEP e senha. O CEP é conferido no ViaCEP.
3. Depois do cadastro, volta ao Login com o e-mail já preenchido.
4. Depois do login, abre o **Mapa**, com a rota do caminhão até o endereço do CEP e o horário previsto de chegada. O mapa só fica disponível com login.
5. **Sair do Perfil**, no menu, encerra a sessão.

## Arquitetura

```text
 Navegador
    │  http://localhost:5173 (desenvolvimento) ou :8787 (produção)
    ▼
 app/  ── Vite (tela React) + servidor Express (porta 8787)
    │        ├─ /api/login, /api/cadastro, /api/sessao, /api/logout
    │        ├─ /api/usuario e /api/usuario/stream  (dados do usuário logado)
    │        └─ /api/route  ──────────────► openrouteservice (geocodificação e rota)
    │
    │  chamadas servidor → servidor, com o token interno (X-Api-Token)
    ▼
 api/  ── Apache + PHP  (http://localhost/ecoleta/api/)
    │        ├─ usuarios.php       cadastro e login
    │        └─ dados_usuario.php  endereço do usuário + endereço do caminhão
    │                                  └──────► ViaCEP (endereço a partir do CEP)
    ▼
 MySQL  ── banco ecoleta, tabela usuarios  ◄── website/ (login e cadastro do site)
```

O navegador nunca chama a pasta `api/` diretamente. Tudo passa pelo servidor Express, que guarda a sessão e envia o token interno que a API PHP exige.

### Estrutura de pastas

```text
ecoleta/
├── README.md               este arquivo
├── .env                    configuração única (banco, Apache, portas, tokens)
├── .env.example            modelo comentado do .env
├── env.php                 leitor do .env para a api e o website (PHP)
├── .htaccess               impede o Apache de servir o .env
├── .gitignore
├── api/                    API PHP
│   ├── usuarios.php        cadastro, login e manutenção de usuários
│   ├── dados_usuario.php   endereço do usuário logado e do caminhão (constante CAMINHAO)
│   ├── database.sql        estrutura do banco
│   ├── config.php          configuração da API, lida do .env
│   └── classes/
│       ├── Api.php         resposta JSON e verificação do token
│       ├── Database.php    conexão com o MySQL
│       ├── Endereco.php    consulta ao ViaCEP
│       └── Usuarios.php    operações na tabela usuarios
├── app/                    aplicativo
│   ├── package.json
│   ├── server/
│   │   ├── env.js          carrega o .env da raiz
│   │   ├── index.js        servidor Express: rota, dados do usuário, atualização ao vivo
│   │   ├── auth.js         login, cadastro e sessão
│   │   ├── auth.test.js    testes automatizados (npm test)
│   │   └── dev.js          sobe Express e Vite juntos (npm run dev)
│   └── src/
│       ├── App.jsx         escolhe Login, Cadastro ou Mapa conforme a sessão
│       ├── api.js          chamadas ao servidor Express
│       ├── sidebar.jsx     menu lateral
│       ├── styles.css      cores, fontes e medidas por tamanho de tela
│       ├── assets/         imagens (caminhão, lixeira, folhas)
│       └── Pages/
│           ├── AuthLayout.jsx, auth.css   moldura das telas de acesso
│           ├── Login/Login.jsx
│           ├── Cadastro/Cadastro.jsx
│           └── Mapa/Mapa.jsx, Mapa.css, routeCache.js
└── website/                site institucional
    ├── inicio.html, projeto.html
    ├── login.php, cadastro.php, act/   formulários e processamento
    └── conexao.php         conexão com o MySQL (dados do .env)
```

## Tecnologias

- **Front-end:** React 19, Vite 8, Leaflet e React Leaflet (mapa), fonte Poppins.
- **Servidor do app:** Node.js com Express 5 e dotenv.
- **API:** PHP 8 com PDO (MySQL) e cURL.
- **Banco:** MySQL.
- **Serviços externos:**
  - [openrouteservice](https://openrouteservice.org): geocodificação e rota para caminhões. Precisa de chave gratuita.
  - [ViaCEP](https://viacep.com.br): endereço a partir do CEP. Não precisa de chave.
  - Mapas do [OpenStreetMap](https://www.openstreetmap.org).

## Pré-requisitos

| Programa | Versão | Observação |
| --- | --- | --- |
| Node.js | 20.19 ou superior (ou 22.12+) | Exigência do Vite 8. |
| PHP | 8.1 ou superior | Com as extensões `pdo_mysql`, `curl` e `mbstring`. |
| MySQL | 8 ou superior | Também funciona com o MariaDB do XAMPP. |
| Apache | 2.4 | Servindo a pasta onde o projeto está. |
| Conta no openrouteservice | — | Para a chave `ORS_API_KEY`. |

O computador também precisa de internet, para acessar o ViaCEP, o openrouteservice e os mapas.

**macOS com Homebrew:**

```bash
brew install node php mysql httpd
brew services start httpd
brew services start php
brew services start mysql
```

A pasta pública do Apache do Homebrew é `/opt/homebrew/var/www`.

**Windows com XAMPP:** instale o [XAMPP](https://www.apachefriends.org) e o [Node.js](https://nodejs.org), e inicie **Apache** e **MySQL** no painel do XAMPP. A pasta pública é `C:\xampp\htdocs`.

## Configuração

Faça estes passos uma vez, na primeira instalação. Os comandos partem da pasta `ecoleta/`, exceto onde indicado.

### 1. Coloque o projeto na pasta pública do Apache

Copie ou clone a pasta `ecoleta` para dentro da pasta pública do Apache:

- macOS (Homebrew): `/opt/homebrew/var/www/ecoleta`
- Windows (XAMPP): `C:\xampp\htdocs\ecoleta`

Confira se a API responde. Abra `http://localhost/ecoleta/api/usuarios.php` no navegador; deve aparecer `{"sucesso":false,"mensagem":"Acesso não autorizado."}`. Essa é a resposta certa, porque a API recusa quem não envia o token.

> Se o seu Apache usa outra porta ou outra pasta (por exemplo, `http://localhost:8080/meu-projeto/`), anote a porta e o caminho: eles vão no `.env` do passo 3.

### 2. Crie o banco de dados

```bash
mysql -uroot < api/database.sql
```

Isso cria o banco `ecoleta` e a tabela `usuarios`, se ainda não existirem. No XAMPP, você também pode abrir o phpMyAdmin (`http://localhost/phpmyadmin`), ir em **Importar** e escolher o arquivo `api/database.sql`.

Se a tabela `usuarios` já existia sem as colunas de endereço, rode o `ALTER TABLE` que está no comentário do início de `api/database.sql`.

### 3. Revise o `.env`

Toda a configuração fica num único arquivo, o `.env` da raiz do projeto. Ele é lido pelo app (Node), pela api e pelo website (PHP), então o token e os dados do banco nunca ficam diferentes entre eles. Se o arquivo não existir, copie o modelo:

```bash
cp .env.example .env          # macOS / Linux
copy .env.example .env        # Windows
```

| Variável | O que colocar |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Acesso ao MySQL. Padrão do XAMPP e do Homebrew: `localhost`, `3306`, `ecoleta`, `root`, sem senha. |
| `APACHE_HOST`, `APACHE_PORT` | Onde o Apache responde. `80` no Apache padrão; `8080` se o XAMPP foi configurado assim. |
| `API_PATH` | Caminho da pasta `api` no Apache. Padrão: `/ecoleta/api`. |
| `PORT` | Porta do servidor Express. Padrão: `8787`. |
| `SESSION_SECRET` | Chave que assina o cookie de sessão. |
| `INTERNAL_API_TOKEN` | Token que o app envia à api. Use um valor diferente do `SESSION_SECRET`. |
| `ORS_API_KEY` | Token do openrouteservice: crie uma conta em <https://openrouteservice.org/dev/#/signup> e copie o token do painel. |

Para gerar `SESSION_SECRET` e `INTERNAL_API_TOKEN`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Depois de alterar o `.env`, reinicie o `npm run dev`. A api e o website leem o arquivo a cada requisição.

> O `.env` é versionado no Git. Se o repositório for público, troque `SESSION_SECRET`, `INTERNAL_API_TOKEN` e `ORS_API_KEY` por valores que não sejam os da produção.

### 4. Instale as dependências do app

```bash
cd app
npm install
```

## Checklist: Windows com XAMPP

Para instalar o projeto numa máquina com Windows 11 e XAMPP. Os caminhos supõem o XAMPP em `C:\xampp` e o Apache na porta `8080`. Se o seu Apache usa a porta 80, troque `8080` por `80` nos itens abaixo.

### Programas

- [ ] XAMPP com **PHP 8.1 ou superior** (o código usa recursos do PHP 8.1). Confira com `C:\xampp\php\php.exe -v`.
- [ ] Node.js 20.19+ ou 22.12+. Confira com `node -v`, num terminal aberto depois da instalação.

### Apache na porta 8080

- [ ] Em `C:\xampp\apache\conf\httpd.conf`: `Listen 8080` e `ServerName localhost:8080`.
- [ ] No mesmo arquivo, o bloco `<Directory "C:/xampp/htdocs">` tem `AllowOverride All` (é o padrão do XAMPP). Sem isso, o `.htaccess` que protege o `.env` é ignorado.
- [ ] Apache iniciado no painel do XAMPP, mostrando a porta 8080.

### PHP

- [ ] Em `C:\xampp\php\php.ini`, as linhas `extension=curl`, `extension=pdo_mysql` e `extension=mbstring` estão sem `;` no começo.
- [ ] No mesmo arquivo, `curl.cainfo` aponta para um arquivo que existe, por exemplo `curl.cainfo="C:\xampp\apache\bin\curl-ca-bundle.crt"`. Sem isso, a consulta ao ViaCEP (HTTPS) falha e o cadastro não encontra o CEP.
- [ ] Depois de alterar o `httpd.conf` ou o `php.ini`, pare e inicie o Apache de novo.

### MySQL

- [ ] MySQL iniciado no painel do XAMPP (porta 3306).
- [ ] Banco importado: em `http://localhost:8080/phpmyadmin`, **Importar** → arquivo `api/database.sql`.
- [ ] O banco `ecoleta` aparece com a tabela `usuarios`.

### Projeto

- [ ] Pasta em `C:\xampp\htdocs\ecoleta`, com `api`, `app`, `website` e o `.env` direto dentro dela.
- [ ] `http://localhost:8080/ecoleta/api/usuarios.php` mostra `{"sucesso":false,"mensagem":"Acesso não autorizado."}`.
- [ ] `http://localhost:8080/ecoleta/.env` mostra **Forbidden**. Se mostrar o conteúdo do arquivo, os segredos estão expostos: confira o `AllowOverride All` acima.

### `.env`, na raiz `C:\xampp\htdocs\ecoleta`

- [ ] O arquivo existe. Se não, crie com `copy .env.example .env`.
- [ ] `APACHE_PORT=8080` e `API_PATH=/ecoleta/api`.
- [ ] `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_USER=root` e `DB_PASSWORD` vazio (padrão do XAMPP). No Windows, use `127.0.0.1` em vez de `localhost`: com `localhost` o PHP tenta antes o IPv6 e cada conexão ao banco pode atrasar cerca de 1 segundo.
- [ ] `SESSION_SECRET`, `INTERNAL_API_TOKEN` e `ORS_API_KEY` preenchidos.
- [ ] Não há outro `.env` dentro de `app\`. Só o da raiz é lido.

### App

- [ ] Em `C:\xampp\htdocs\ecoleta`, no PowerShell ou no Prompt de Comando: `npm install` (instala também as dependências da pasta `app`).
- [ ] `npm run dev` mostra `API PHP em http://localhost:8080/ecoleta/api`. Se a porta não for 8080, o `.env` não foi lido ou está errado.
- [ ] Se o Windows perguntar sobre o firewall para o Node.js, permita em redes privadas.
- [ ] `http://localhost:5173` abre o login, o cadastro com um CEP real funciona e, depois do login, o mapa mostra a rota do caminhão.
- [ ] O site abre em `http://localhost:8080/ecoleta/website/inicio.html`.

## Como rodar

### Aplicativo em desenvolvimento

Com Apache, PHP e MySQL ligados:

```bash
npm run dev
```

Funciona tanto na raiz `ecoleta/` quanto dentro de `app/`: o `package.json` da raiz só repassa os comandos (`dev`, `build`, `preview`, `test`, `lint`) para a pasta `app`. Esse comando sobe o servidor Express (porta 8787) e o Vite. Abra **<http://localhost:5173>**. Alterações no código aparecem na hora no navegador; alterações em `app/server/` exigem parar (Ctrl+C) e rodar de novo.

### Aplicativo em produção

```bash
cd app
npm run build
npm run preview
```

Abra **<http://localhost:8787>** (ou a porta definida em `PORT`). Nesse modo, o próprio Express entrega a tela pronta da pasta `dist/`.

### Site institucional

Abra `http://localhost/ecoleta/website/inicio.html`. O site é servido direto pelo Apache e não precisa do `npm`.

### Comandos do app

Rode dentro da pasta `app/`:

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe Express + Vite para desenvolvimento. |
| `npm run build` | Gera a versão de produção em `dist/`. |
| `npm run preview` | Sobe o Express servindo a pasta `dist/`. |
| `npm test` | Roda os testes automatizados. |
| `npm run lint` | Verifica o código com o ESLint. |
| `npm run server` | Sobe só o servidor Express. |
| `npm run dev:client` | Sobe só o Vite. |

## Como funciona

### Login e sessão

O servidor Express recebe login e cadastro e repassa para `api/usuarios.php`. Se o login der certo, cria uma sessão num cookie assinado, que dura 7 dias. As rotas do mapa só respondem com a sessão; sem ela, a tela volta para o Login.

### Endereço do usuário

- No cadastro, o PHP busca o CEP no ViaCEP e grava rua, bairro, cidade e UF na tabela `usuarios`. Um CEP inexistente é recusado.
- Depois do login, o Express chama `dados_usuario.php?id=<usuário logado>`, que devolve o endereço do usuário e o do caminhão.
- Usuários cadastrados sem o endereço gravado (por exemplo, pelo site) têm o endereço buscado pelo CEP e gravado no primeiro acesso ao mapa.
- Sem CEP, ou com CEP inexistente, o mapa mostra uma mensagem explicando o motivo.

### Rota e mapa

- O endereço do caminhão é a constante `CAMINHAO` em `api/dados_usuario.php`.
- O servidor localiza os dois endereços e calcula a rota para caminhão no openrouteservice, considerando altura, largura, peso e carga por eixo.
- O CEP não traz o número da casa, então o ponto de coleta é localizado pela rua. Quando o serviço não conhece a rua, usa o centro do bairro, e o marcador mostra "Localização aproximada".
- O caminhão anda pela rota em uma **animação**. A posição mostrada é simulada, não vem de GPS.
- O horário previsto é a hora atual mais o tempo estimado da rota.
- Controles do mapa:
  - **+** e **−**: aproximar e afastar.
  - **◎**: acompanhar o caminhão, mantendo-o no centro. Arrastar o mapa desliga o acompanhamento; tocar de novo no ◎ volta a mostrar a rota inteira.
- A última rota fica salva no navegador, separada por usuário, e é recalculada depois de 24 horas.
- A tela se adapta a celular (em pé e deitado), tablet, desktop e monitores ultrawide.

### Atualização automática

Com o mapa aberto, a página mantém uma conexão com o servidor (Server-Sent Events, em `/api/usuario/stream`). O servidor observa o arquivo `api/dados_usuario.php`: ao salvá-lo (por exemplo, com um novo endereço em `CAMINHAO`), quem estiver com o mapa aberto recebe os dados novos e a rota é recalculada, sem recarregar a página.

## Referência das APIs

### Servidor Express (usado pelo navegador)

| Método e rota | Precisa de login | Descrição |
| --- | --- | --- |
| `POST /api/cadastro` | Não | Cria o usuário. Corpo: `nome`, `email`, `cep`, `senha`. |
| `POST /api/login` | Não | Valida `email` e `senha` e cria a sessão. |
| `GET /api/sessao` | — | Devolve o usuário logado, ou 401. |
| `POST /api/logout` | — | Encerra a sessão. |
| `GET /api/usuario` | Sim | Endereço do usuário logado e do caminhão. |
| `GET /api/usuario/stream` | Sim | O mesmo, em conexão contínua (Server-Sent Events). |
| `POST /api/route` | Sim | Calcula a rota. Corpo: `origin`, `destination` e `vehicle`. |
| `GET /api/health` | Não | Verifica se o servidor está no ar. |

### API PHP (`api/`, só para o servidor Express)

Toda chamada precisa do cabeçalho `X-Api-Token` com o valor de `INTERNAL_API_TOKEN` do `.env`. Sem ele, a resposta é 403.

| Arquivo | Chamada | Descrição |
| --- | --- | --- |
| `usuarios.php` | `POST` com `{"acao": "cadastrar", "nome", "email", "cep", "senha"}` | Cadastra o usuário. |
| `usuarios.php` | `POST` com `{"acao": "login", "email", "senha"}` | Valida o login. |
| `usuarios.php` | `POST` com `{"acao": "recuperarSenha", "email", "novaSenha"}` | Troca a senha. |
| `usuarios.php` | `GET ?id=` / `PUT {id, nome, email}` / `DELETE {id}` | Consulta, altera ou exclui um usuário. |
| `dados_usuario.php` | `GET ?id=` | Endereço do usuário e do caminhão. |

## Banco de dados

Banco `ecoleta`, tabela `usuarios`:

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `UsuarioID` | INT, auto incremento | Chave primária. |
| `Nome` | VARCHAR(20) | O limite de 20 caracteres é validado no cadastro do app. |
| `Email` | VARCHAR(150) | |
| `Senha` | VARCHAR(150) | Hash bcrypt (`password_hash`); a senha nunca é gravada em texto. |
| `CEP` | VARCHAR(11) | Só números (ex.: `90020000`). |
| `Logradouro`, `Bairro`, `Cidade`, `Uf` | VARCHAR / CHAR(2) | Preenchidos pelo ViaCEP. |

O app e o site gravam na mesma tabela.

## Segurança

- **Sessão:** cookie `HttpOnly` (o JavaScript da página não consegue ler) e assinado com `SESSION_SECRET` (não dá para forjar).
- **Tentativas de login:** depois de 10 senhas erradas para o mesmo e-mail e IP, o login fica bloqueado por 15 minutos.
- **API PHP:** só aceita chamadas com o token interno, então não dá para usá-la direto pelo navegador para ler, alterar ou excluir usuários.
- **Senhas:** guardadas com hash bcrypt.
- **Segredos:** ficam todos no `.env`, que é versionado. O `.htaccess` impede o Apache de entregá-lo pelo navegador (no Apache do Homebrew, que vem com `AllowOverride None`, adicione a mesma regra no `httpd.conf`). Se vazarem, gere valores novos.

## Testes

```bash
cd app
npm test        # testes automatizados de login, cadastro, sessão e token
npm run lint    # verificação do código
```

Os testes automatizados usam uma API PHP simulada, então não precisam de Apache nem MySQL.

## Solução de problemas

| Sintoma | Causa provável | Como resolver |
| --- | --- | --- |
| "Não foi possível conectar ao serviço de usuários" no login | Apache desligado ou `APACHE_PORT`/`API_PATH` errados. | Ligue o Apache e confira o passo 1 e o `.env`. |
| "O serviço de usuários está indisponível no momento" no login | A api recusou o token ou respondeu com erro. | Confira se existe um único `.env`, na raiz, e reinicie o `npm run dev`. O terminal mostra o endereço da API em uso e o motivo exato. |
| `{"sucesso":false,"mensagem":"Acesso não autorizado."}` | Chamada à API PHP sem o token certo. | É o esperado no navegador. No app, confira se os dois tokens são iguais. |
| "Erro interno do servidor" no cadastro ou login | MySQL desligado, ou usuário e senha do banco errados. | Ligue o MySQL e confira o passo 3. |
| "Configure ORS_API_KEY…" ou a rota não é calculada | `ORS_API_KEY` vazia ou inválida. | Preencha a chave no `.env` e reinicie o `npm run dev`. |
| "Seu cadastro não tem CEP" ou "CEP … não foi encontrado" | O usuário foi cadastrado sem CEP, ou com um CEP inexistente (por exemplo, pelo site). | Corrija o CEP do usuário no banco. |
| `EADDRINUSE` ao rodar `npm run dev` | A porta 8787 ou 5173 já está em uso. | Feche o outro processo ou troque `PORT` no `.env`. |
| O mapa não aparece ou fica cinza | Sem internet para carregar os mapas. | Verifique a conexão. |
| "Localização aproximada" no ponto de coleta | O serviço de mapas não conhece a rua; foi usado o centro do bairro. | É uma limitação do serviço (veja abaixo). |

## Pontos de atenção

- **Localização aproximada:** o CEP não traz o número da casa. Um campo "Número" no cadastro deixaria o ponto de coleta mais exato.
- **Um só caminhão, em Porto Alegre:** o endereço é fixo em `api/dados_usuario.php`, e a posição no mapa é uma animação. Usuários de outras cidades terão rotas longas.
- **Login do site e do app:** o site (`website/`) aceita **nome de usuário ou e-mail**; o app, só o **e-mail**. O cadastro dos dois segue as mesmas regras (o site usa a classe `Usuario` da `api`), então uma conta criada num entra no outro.
- **E-mail sem índice único:** o site e o app recusam e-mails repetidos no cadastro, mas a tabela em si não impede. Para garantir de vez, remova duplicados antigos e crie um índice único na coluna `Email`.
- **Recuperação de senha:** o botão "Esqueceu a senha?" do app ainda não tem fluxo; a ação `recuperarSenha` da API troca a senha sem confirmação por e-mail.
- **Menu do app:** "Mudar Local", "Col. Seletiva" e "Configurações" abrem telas vazias, prontas para receber conteúdo (`app/src/Pages/Mapa/MudarLocal.jsx`, `ColSeletiva.jsx` e `Configuracoes.jsx`). "Meu perfil" volta ao mapa e "Sair do Perfil" encerra a sessão.
