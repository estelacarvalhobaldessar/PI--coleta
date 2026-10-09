<?php

// Busca o endereço de um CEP no ViaCEP (https://viacep.com.br).
class Endereco
{
    public static function somenteDigitos(string $cep): string
    {
        return preg_replace('/\D/', '', $cep);
    }

    public static function formatarCep(string $cep): string
    {
        $digitos = self::somenteDigitos($cep);

        return strlen($digitos) === 8
            ? substr($digitos, 0, 5) . "-" . substr($digitos, 5)
            : $cep;
    }

    // Retorna logradouro, bairro, cidade e uf; null quando o CEP não existe.
    // Lança RuntimeException quando o ViaCEP não responde, para quem chama decidir o que fazer.
    public static function buscarPorCep(string $cep): ?array
    {
        $digitos = self::somenteDigitos($cep);

        if (strlen($digitos) !== 8) {
            return null;
        }

        $curl = curl_init("https://viacep.com.br/ws/{$digitos}/json/");
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 6,
            // Não herda proxies do sistema: um proxy local indisponível impede a consulta ao ViaCEP.
            CURLOPT_PROXY => '',
            CURLOPT_HTTPHEADER => ["Accept: application/json"],
        ]);

        $corpo = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);

        if ($corpo === false || $status >= 500 || $status === 0) {
            throw new RuntimeException("Serviço de CEP indisponível: " . curl_error($curl));
        }

        if ($status === 400) {
            return null;
        }

        $dados = json_decode($corpo, true);

        if (!is_array($dados)) {
            throw new RuntimeException("Serviço de CEP retornou uma resposta inválida.");
        }

        if (!empty($dados["erro"])) {
            return null;
        }

        return [
            "logradouro" => trim((string) ($dados["logradouro"] ?? "")),
            "bairro" => trim((string) ($dados["bairro"] ?? "")),
            "cidade" => trim((string) ($dados["localidade"] ?? "")),
            "uf" => trim((string) ($dados["uf"] ?? "")),
        ];
    }
}
