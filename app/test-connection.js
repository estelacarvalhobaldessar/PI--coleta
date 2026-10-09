// test-connection.js
const fetch = require('node-fetch');

(async () => {
    try {
        const response = await fetch('http://URL_DO_SERVICO_DE_USUARIOS');
        const data = await response.json();
        console.log('Conexão bem-sucedida:', data);
    } catch (error) {
        console.error('Erro ao conectar ao serviço:', error);
    }
})();