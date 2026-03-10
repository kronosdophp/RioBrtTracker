# 📘 BRT Rio - Backend API (C++)

## Descrição

Este projeto é o **backend em C++** para monitoramento em tempo real de veículos do **BRT Rio**.  

Ele utiliza a biblioteca **Boost** (Beast, Asio, SSL, JSON) para:

- Buscar dados em tempo real da API oficial de mobilidade do Rio de Janeiro (`dados.mobilidade.rio`).  
- Processar e armazenar informações dos veículos, incluindo:  
  `latitude`, `longitude`, `velocidade`, `linha`, `placa`, `sentido`, `trajeto`, `ignição` e `timestamp`.  
- Fornecer uma **API HTTP local** para consulta de veículos em tempo real.  
- Verificar periodicamente se o frontend está online e exibir o status em uma página HTML.

O backend é **multi-threaded**, confiável, e suporta respostas **comprimidas em gzip/deflate**, garantindo eficiência e performance.  

**Obs:** O padrão de consulta usado na API foi inspirado no que eu utilizava durante meus estudos com PHP e **GuzzleHTTP**, adaptado para C++ com Boost.Beast e Boost.Asio.  

---

## Funcionalidades Principais

1. **Coleta de dados**  
   - Consulta a API oficial do BRT Rio em intervalos regulares.  
   - Suporta backoff automático em caso de erros ou rate-limiting.

2. **Processamento e normalização**  
   - Converte os dados recebidos em JSON consistente.  
   - Garante que campos ausentes ou variáveis sejam tratados corretamente.

3. **Armazenamento em memória**  
   - Mantém os dados dos veículos para acesso rápido.  
   - Permite múltiplas consultas simultâneas sem impactar a coleta.

4. **Serviço HTTP local**  
   - Endpoint principal:  
     ```
     GET /api/veiculos
     ```
     Retorna os veículos em tempo real no formato JSON.  

   - Endpoint em desenvolvimento:  
     ```
     GET /api/veiculos/all
     ```
     (Acessa dados de todos os veículos públicos do estado)

5. **Monitoramento do frontend**  
   - Verifica se a interface do usuário (frontend) está online.  
   - Exibe status em uma página HTML com estilo simples e responsivo.  

---

## Observações Importantes

- Eu queria que o sistema fosse **totalmente async**, mas infelizmente a API oficial **não é**. Ela atualiza os dados em intervalos específicos.  
- No entanto, o **frontend do meu projeto recebe todos os dados de forma async do backend local**, permitindo que a atualização seja automática, sem necessidade de refresh na página.  
- Isso é possível graças ao **Boost**, que permite processar requisições, manipular dados e enviar respostas de forma assíncrona.

---

## Exemplo de Resposta da API

```json
[
  {
    "id": 12345,
    "veiculo": "12345",
    "linha": "TransOeste",
    "latitude": -22.912345,
    "longitude": -43.230987,
    "velocidade": 40,
    "sentido": "ida",
    "datahora": "2026-03-10T12:00:00",
    "trajeto": "Terminal Alvorada - Jardim Oceânico",
    "ignicao": true,
    "direcao": 180,
    "placa": "ABC-1234",
    "timestamp": 1712953200
  }
]
