#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/version.hpp>
#include <boost/beast/ssl.hpp>
#include <boost/asio.hpp>
#include <boost/asio/ssl.hpp>
#include <boost/json.hpp>
#include <iostream>
#include <string>
#include <thread>
#include <vector>
#include <atomic>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <memory>
#include <zlib.h>

namespace beast = boost::beast;
namespace http = beast::http;
namespace net = boost::asio;
namespace ssl = boost::asio::ssl;
namespace json = boost::json;
using tcp = net::ip::tcp;

std::string decompress_gzip(const std::string& compressed_data) {
    if (compressed_data.empty()) return "";

    z_stream zs;
    memset(&zs, 0, sizeof(zs));

    if (inflateInit2(&zs, 16 + MAX_WBITS) != Z_OK) {
        return "";
    }

    zs.next_in = (Bytef*)compressed_data.data();
    zs.avail_in = compressed_data.size();

    std::string decompressed;
    char outbuffer[32768];

    int ret;
    do {
        zs.next_out = (Bytef*)outbuffer;
        zs.avail_out = sizeof(outbuffer);

        ret = inflate(&zs, 0);

        if (decompressed.size() < zs.total_out) {
            decompressed.append(outbuffer, zs.total_out - decompressed.size());
        }
    } while (ret == Z_OK);

    inflateEnd(&zs);

    if (ret != Z_STREAM_END) {
        return "";
    }

    return decompressed;
}

class BRTDataFetcher {
private:
    net::io_context ioc_;
    ssl::context ctx_;
    std::vector<json::value> veiculos_;
    std::mutex mutex_;
    std::atomic<bool> running_{ true };
    std::thread fetch_thread_;
    int consecutive_errors_{ 0 };
    static constexpr int BASE_INTERVAL_S = 20;
    static constexpr int MAX_BACKOFF_S = 25;

public:
    BRTDataFetcher() : ctx_(ssl::context::tlsv12_client) {
        ctx_.set_verify_mode(ssl::verify_none);
        try {
            ctx_.set_default_verify_paths();
        }
        catch (...) {}
    }

    ~BRTDataFetcher() {
        stop_fetching();
    }

    void start_fetching() {
        fetch_thread_ = std::thread([this]() {
            while (running_) {
                fetch_data();
                int wait = BASE_INTERVAL_S;
                if (consecutive_errors_ > 0) {
                    wait = std::min(
                        BASE_INTERVAL_S * (1 << consecutive_errors_),
                        MAX_BACKOFF_S
                    );
                    std::cout << "[BACKOFF] Aguardando " << wait
                        << "s (erros: " << consecutive_errors_ << ")" << std::endl;
                }
                std::this_thread::sleep_for(std::chrono::seconds(wait));
            }
            });
    }

    void stop_fetching() {
        running_ = false;
        if (fetch_thread_.joinable()) {
            fetch_thread_.join();
        }
    }

    json::value get_veiculos() {
        std::lock_guard<std::mutex> lock(mutex_);
        json::array arr;
        for (const auto& v : veiculos_) {
            arr.push_back(v);
        }
        return arr;
    }

private:
    void fetch_data() {
        try {
            tcp::resolver resolver(ioc_);
            auto const results = resolver.resolve("dados.mobilidade.rio", "443");

            beast::tcp_stream stream(ioc_);
            stream.connect(results);

            ssl::stream<beast::tcp_stream&> ssl_stream(stream, ctx_);
            ssl_stream.set_verify_mode(ssl::verify_none);
            ssl_stream.handshake(ssl::stream_base::client);

            http::request<http::string_body> req{ http::verb::get, "/gps/brt", 11 };
            req.set(http::field::host, "dados.mobilidade.rio");
            req.set(http::field::user_agent,
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36");
            req.set(http::field::accept,
                "text/html,application/xhtml+xml,application/xml;q=0.9,"
                "image/avif,image/webp,image/apng,*/*;q=0.8");

            req.set(http::field::accept_encoding, "gzip, deflate");

            req.set("accept-language", "pt-BR,pt;q=0.7");
            req.set("sec-ch-ua",
                "\"Not:A-Brand\";v=\"99\", \"Brave\";v=\"145\", \"Chromium\";v=\"145\"");
            req.set("sec-ch-ua-mobile", "?0");
            req.set("sec-ch-ua-platform", "\"Windows\"");
            req.set("sec-fetch-dest", "document");
            req.set("sec-fetch-mode", "navigate");
            req.set("sec-fetch-site", "none");
            req.set("sec-fetch-user", "?1");
            req.set("sec-gpc", "1");
            req.set("upgrade-insecure-requests", "1");
            req.set(http::field::cache_control, "max-age=0");
            req.set(http::field::connection, "keep-alive");

            http::write(ssl_stream, req);

            beast::flat_buffer buffer;
            http::response<http::string_body> res;
            http::read(ssl_stream, buffer, res);

            if (res.result() == http::status::ok) {
                std::string body = res.body();
                std::string encoding;
                auto it = res.find(http::field::content_encoding);
                if (it != res.end()) {
                    encoding = std::string(it->value().data(), it->value().size());
                }

                bool is_compressed = false;
                if (!encoding.empty()) {
                    if (encoding == "gzip" || encoding == "deflate") {
                        is_compressed = true;
                        std::cout << "[INFO] Resposta comprimida com " << encoding << std::endl;
                    }
                }

                if (is_compressed) {
                    body = decompress_gzip(body);
                    if (body.empty()) {
                        std::cerr << "[ERRO] Falha na descompressão" << std::endl;
                        consecutive_errors_++;
                        return;
                    }
                }

                if (body.empty()) {
                    std::cerr << "[ERRO] Resposta vazia da API" << std::endl;
                    consecutive_errors_++;
                }
                else {
                    size_t start = body.find_first_not_of(" \t\n\r");
                    if (start == std::string::npos) {
                        std::cerr << "[ERRO] Resposta vazia após limpeza" << std::endl;
                        consecutive_errors_++;
                    }
                    else if (body[start] != '{' && body[start] != '[') {
                        std::cerr << "[ERRO] Resposta não é JSON (início: '"
                            << body.substr(0, std::min(body.size(), (size_t)30))
                            << "')" << std::endl;

                        std::cerr << "[DEBUG] Primeiros 50 bytes (hex): ";
                        for (size_t i = 0; i < std::min(body.size(), (size_t)50); ++i) {
                            std::cerr << std::hex << std::setw(2) << std::setfill('0')
                                << (int)(unsigned char)body[i] << " ";
                        }
                        std::cerr << std::dec << std::endl;

                        consecutive_errors_++;
                    }
                    else {
                        try {
                            // Verificar se é um array JSON diretamente
                            if (body[start] == '[') {
                                auto value = json::parse(body);
                                process_array_response(value);
                                consecutive_errors_ = 0;
                                std::cout << "[OK] Dados recebidos com sucesso!" << std::endl;
                            }
                            else {
                                auto value = json::parse(body);
                                process_response(value);
                                consecutive_errors_ = 0;
                                std::cout << "[OK] Dados recebidos com sucesso!" << std::endl;
                            }
                        }
                        catch (const std::exception& pe) {
                            std::cerr << "[ERRO] JSON parse: " << pe.what() << std::endl;
                            std::cerr << "[DEBUG] Tamanho da resposta: " << body.size() << " bytes" << std::endl;
                            std::cerr << "[DEBUG] Primeiros 200 caracteres: " << body.substr(0, 200) << std::endl;
                            consecutive_errors_++;
                        }
                    }
                }
            }
            else if (res.result_int() == 429) {
                std::cerr << "[AVISO] Rate limit (429). Aumentando intervalo..." << std::endl;
                consecutive_errors_++;
            }
            else if (res.result_int() == 304) {
                std::cout << "[INFO] Não modificado (304)" << std::endl;
                consecutive_errors_ = 0;
            }
            else {
                std::cerr << "[ERRO] HTTP " << res.result_int() << std::endl;
                consecutive_errors_++;
            }

            beast::error_code ec;
            ssl_stream.shutdown(ec);
            stream.socket().shutdown(tcp::socket::shutdown_both, ec);
        }
        catch (const std::exception& e) {
            std::cerr << "[ERRO] Conexão: " << e.what() << std::endl;
            consecutive_errors_++;
        }
    }

    void process_array_response(const json::value& data) {
        try {
            if (!data.is_array()) {
                std::cerr << "[ERRO] Resposta não é um array" << std::endl;
                return;
            }

            std::lock_guard<std::mutex> lock(mutex_);
            veiculos_.clear();

            for (const auto& item : data.as_array()) {
                if (!item.is_object()) continue;

                auto v = item.as_object();
                json::object veiculo;

                // Mapeamento dos campos
                veiculo["id"] = v.contains("codigo") ? v.at("codigo") :
                    (v.contains("id") ? v.at("id") : json::value(nullptr));
                veiculo["veiculo"] = v.contains("codigo") ? v.at("codigo") :
                    (v.contains("veiculo") ? v.at("veiculo") : json::value(nullptr));
                veiculo["linha"] = v.contains("linha") ? v.at("linha") : json::value(nullptr);
                veiculo["latitude"] = v.contains("latitude") ? v.at("latitude") : json::value(nullptr);
                veiculo["longitude"] = v.contains("longitude") ? v.at("longitude") : json::value(nullptr);
                veiculo["velocidade"] = v.contains("velocidade") ? v.at("velocidade") : json::value(nullptr);
                veiculo["sentido"] = v.contains("sentido") ? v.at("sentido") : json::value(nullptr);
                veiculo["datahora"] = v.contains("dataHora") ? v.at("dataHora") :
                    (v.contains("timestamp") ? v.at("timestamp") : json::value(nullptr));
                veiculo["trajeto"] = v.contains("trajeto") ? v.at("trajeto") : json::value(nullptr);
                veiculo["ignicao"] = v.contains("ignicao") ? v.at("ignicao") : json::value(nullptr);
                veiculo["direcao"] = v.contains("direcao") ? v.at("direcao") : json::value(nullptr);
                veiculo["placa"] = v.contains("placa") ? v.at("placa") : json::value(nullptr);

                auto now = std::chrono::system_clock::now();
                auto timestamp = std::chrono::duration_cast<std::chrono::seconds>(
                    now.time_since_epoch()).count();
                veiculo["timestamp"] = timestamp;

                veiculos_.push_back(veiculo);
            }

            std::cout << "[INFO] " << veiculos_.size() << " veículos atualizados" << std::endl;
        }
        catch (const std::exception& e) {
            std::cerr << "[ERRO] Processamento: " << e.what() << std::endl;
        }
    }

    void process_response(const json::value& data) {
        try {
            if (!data.is_object()) {
                process_array_response(data);
                return;
            }

            auto obj = data.as_object();

            if (obj.contains("veiculos")) {
                const auto& veiculos_array = obj.at("veiculos");
                if (!veiculos_array.is_array()) {
                    std::cerr << "[ERRO] Campo 'veiculos' não é um array" << std::endl;
                    return;
                }

                std::lock_guard<std::mutex> lock(mutex_);
                veiculos_.clear();

                for (const auto& item : veiculos_array.as_array()) {
                    if (!item.is_object()) continue;

                    auto v = item.as_object();
                    json::object veiculo;

                    veiculo["id"] = v.contains("codigo") ? v.at("codigo") : json::value(nullptr);
                    veiculo["veiculo"] = v.contains("codigo") ? v.at("codigo") : json::value(nullptr);
                    veiculo["linha"] = v.contains("linha") ? v.at("linha") : json::value(nullptr);
                    veiculo["latitude"] = v.contains("latitude") ? v.at("latitude") : json::value(nullptr);
                    veiculo["longitude"] = v.contains("longitude") ? v.at("longitude") : json::value(nullptr);
                    veiculo["velocidade"] = v.contains("velocidade") ? v.at("velocidade") : json::value(nullptr);
                    veiculo["sentido"] = v.contains("sentido") ? v.at("sentido") : json::value(nullptr);
                    veiculo["datahora"] = v.contains("dataHora") ? v.at("dataHora") : json::value(nullptr);
                    veiculo["trajeto"] = v.contains("trajeto") ? v.at("trajeto") : json::value(nullptr);
                    veiculo["ignicao"] = v.contains("ignicao") ? v.at("ignicao") : json::value(nullptr);
                    veiculo["direcao"] = v.contains("direcao") ? v.at("direcao") : json::value(nullptr);
                    veiculo["placa"] = v.contains("placa") ? v.at("placa") : json::value(nullptr);

                    auto now = std::chrono::system_clock::now();
                    auto timestamp = std::chrono::duration_cast<std::chrono::seconds>(
                        now.time_since_epoch()).count();
                    veiculo["timestamp"] = timestamp;

                    veiculos_.push_back(veiculo);
                }

                std::cout << "[INFO] " << veiculos_.size() << " veículos atualizados" << std::endl;
            }
            else {
                json::array arr;
                arr.push_back(obj);
                process_array_response(arr);
            }
        }
        catch (const std::exception& e) {
            std::cerr << "[ERRO] Processamento: " << e.what() << std::endl;
        }
    }
};



class BRTServer {
private:
    net::io_context& ioc_;
    tcp::acceptor acceptor_;
    BRTDataFetcher& fetcher_;
    std::atomic<bool> running = true;
    std::string frontend_status = "Desconhecido";

public:
    BRTServer(net::io_context& ioc, short port, BRTDataFetcher& fetcher)
        : ioc_(ioc), acceptor_(ioc, tcp::endpoint(tcp::v4(), port)), fetcher_(fetcher) {
        std::cout << "========================================" << std::endl;
        std::cout << " BRT Rio - Backend API (C++)" << std::endl;
        std::cout << " Porta: " << port << std::endl;
        std::cout << " Endpoint: http://localhost:" << port << "/api/veiculos" << std::endl;
        std::cout << "========================================" << std::endl;
    }

    void run() {
        fetcher_.start_fetching();
        std::thread([this]() {
            while (running) {
                verificar_frontend();
                std::this_thread::sleep_for(std::chrono::seconds(5));
            }
            }).detach();
        do_accept();
    }

private:
    void verificar_frontend() {
        boost::asio::io_context io;
        boost::asio::ip::tcp::resolver resolver(io);
        auto endpoints = resolver.resolve("localhost", "3000");
        boost::asio::ip::tcp::socket socket(io);
        boost::system::error_code error = boost::asio::error::host_not_found;
        try {
            boost::asio::connect(socket, endpoints, error);
            if (!error) {
                frontend_status = "Online";
            }
            else {
                frontend_status = "Offline";
            }
        }
        catch (std::exception& e) {
            frontend_status = "Offline";
        }
    }

    void do_accept() {
        acceptor_.async_accept([this](beast::error_code ec, tcp::socket socket) {
            if (!ec) {
                std::make_shared<http_connection>(std::move(socket), *this)->start();
            }
            do_accept();
            });
    }

    class http_connection : public std::enable_shared_from_this<http_connection> {
    private:
        tcp::socket socket_;
        BRTServer& server_;
        beast::flat_buffer buffer_;
        http::request<http::string_body> req_;

    public:
        http_connection(tcp::socket socket, BRTServer& server) : socket_(std::move(socket)), server_(server) {}

        void start() {
            read_request();
        }

    private:
        void read_request() {
            auto self = shared_from_this();
            http::async_read(socket_, buffer_, req_, [self](beast::error_code ec, std::size_t) {
                if (!ec) {
                    self->process_request();
                }
                });
        }

        void process_request() {
            http::response<http::string_body> res;
            res.version(req_.version());
            res.keep_alive(false);
            res.set(http::field::server, "BRT Monitor API");
            res.set(http::field::access_control_allow_origin, "*");
            res.set(http::field::access_control_allow_methods, "GET, OPTIONS");
            res.set(http::field::access_control_allow_headers, "Content-Type, Accept");
            res.set(http::field::cache_control, "no-cache");

            if (req_.method() == http::verb::options) {
                res.result(http::status::ok);
                res.body() = "";
                res.prepare_payload();
                write_response(std::move(res));
                return;
            }

            if (req_.method() == http::verb::get) {
                if (req_.target() == "/api/veiculos") {
                    res.result(http::status::ok);
                    res.set(http::field::content_type, "application/json; charset=utf-8");
                    res.body() = json::serialize(server_.fetcher_.get_veiculos());
                }
                else if (req_.target() == "/") {
                    res.result(http::status::ok);
                    res.set(http::field::content_type, "text/html; charset=utf-8");
                    std::string statusClass = (server_.frontend_status == "Online") ? "online" : "offline";
                    std::string html = R"(
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BRT API - KronosSystem</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            max-width: 900px;
            width: 100%;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            animation: slideIn 0.5s ease-out;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .header {
            background: linear-gradient(120deg, #2c3e50, #3498db);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 600;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }

        .header p {
            font-size: 1.1em;
            opacity: 0.95;
        }

        .content {
            padding: 30px;
        }

        .status-card {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
            border-left: 4px solid #3498db;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .status-info {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 15px;
        }

        .status-info p {
            font-size: 1.1em;
            color: #2c3e50;
        }

        .status-badge {
            padding: 8px 20px;
            border-radius: 50px;
            font-weight: 600;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .status-badge.online {
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: white;
        }

        .status-badge.offline {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
        }

        .section-title {
            font-size: 1.5em;
            color: #2c3e50;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #3498db;
            position: relative;
        }

        .section-title::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 50px;
            height: 2px;
            background: #2c3e50;
        }

        .endpoints-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .endpoint-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
            border: 1px solid #e0e0e0;
        }

        .endpoint-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(52, 152, 219, 0.2);
            border-color: #3498db;
        }

        .endpoint-method {
            display: inline-block;
            background: #3498db;
            color: white;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .endpoint-url {
            font-size: 1.2em;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 8px;
        }

        .endpoint-url a {
            color: #2c3e50;
            text-decoration: none;
            transition: color 0.3s ease;
        }

        .endpoint-url a:hover {
            color: #3498db;
        }

        .endpoint-desc {
            color: #7f8c8d;
            font-size: 0.95em;
            line-height: 1.5;
        }

        .endpoint-badge {
            display: inline-block;
            background: #f1c40f;
            color: #2c3e50;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.7em;
            font-weight: 600;
            margin-top: 8px;
        }

        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
        }

        .footer p {
            color: #7f8c8d;
            font-size: 1em;
        }

        .footer strong {
            color: #3498db;
            font-weight: 600;
        }

        .frontend-link {
            display: inline-block;
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            padding: 12px 25px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 15px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
        }

        .frontend-link:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
        }

        @media (max-width: 600px) {
            .header h1 {
                font-size: 1.8em;
            }
            
            .content {
                padding: 20px;
            }
            
            .endpoints-grid {
                grid-template-columns: 1fr;
            }
            
            .status-info {
                flex-direction: column;
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚍 BRT Rio API</h1>
            <p>Sistema de Monitoramento de Veículos</p>
        </div>

        <div class="content">
            <div class="status-card">
                <div class="status-info">
                    <p><strong>📡 Status do Frontend:</strong></p>
                    <span class="status-badge )" + statusClass + R"(">)" + server_.frontend_status + R"(</span>
                </div>
                <a href="http://localhost:3000" class="frontend-link" target="_blank">
                    🔗 Acessar Frontend Completo
                </a>
            </div>

            <h2 class="section-title">📋 Endpoints Disponíveis</h2>
            
            <div class="endpoints-grid">
                <div class="endpoint-card">
                    <span class="endpoint-method">GET</span>
                    <div class="endpoint-url">
                        <a href="/api/veiculos">/api/veiculos</a>
                    </div>
                    <p class="endpoint-desc">
                        📍 Retorna uma lista completa com todos os veículos em tempo real
                    </p>
                </div>

                <div class="endpoint-card">
                    <span class="endpoint-method">GET</span>
                    <div class="endpoint-url">
                        <a href="/api/veiculos/all">/api/veiculos/all</a>
                    </div>
                    <p class="endpoint-desc">
                        🚌 Acessa dados de todos os veículos públicos do estado
                    </p>
                    <span class="endpoint-badge">Em desenvolvimento</span>
                </div>
            </div>

            <div style="background: #e8f4f8; border-radius: 10px; padding: 15px; margin-top: 20px;">
                <p style="color: #2c3e50; margin: 0;">
                    <strong>💡 Dica:</strong> Os endpoints retornam dados em formato JSON, 
                    perfeitos para integração com aplicações web e mobile.
                </p>
            </div>
        </div>

        <div class="footer">
            <p>Desenvolvido com ❤️ por <strong>KronosSystem</strong> © 2026</p>
            <p style="font-size: 0.9em; margin-top: 5px;">Versão 1.0.0</p>
        </div>
    </div>
</body>
</html>
)";

                    res.body() = html;
                }
                else {
                    res.result(http::status::not_found);
                    res.set(http::field::content_type, "application/json");
                    res.body() = R"({"error":"Rota nao encontrada"})";
                }
            }
            else {
                res.result(http::status::method_not_allowed);
                res.set(http::field::content_type, "application/json");
                res.body() = R"({"error":"Metodo nao permitido"})";
            }

            if (req_.target() == "/api/veiculos/all") {
                res.result(http::status::ok);
                res.set(http::field::content_type, "application/json; charset=utf-8");
                res.body() = R"({"error": Rota Em Desenvolvimento...."})";
            }

            res.prepare_payload();
            write_response(std::move(res));
        }

        void write_response(http::response<http::string_body> res) {
            auto self = shared_from_this();
            auto res_ptr = std::make_shared<http::response<http::string_body>>(std::move(res));
            http::async_write(socket_, *res_ptr, [self, res_ptr](beast::error_code ec, std::size_t) {
                self->socket_.shutdown(tcp::socket::shutdown_send, ec);
                });
        }
    };
};

int main() {
    try {
        net::io_context ioc;
        BRTDataFetcher fetcher;
        BRTServer server(ioc, 8080, fetcher);
        std::cout << std::endl;
        std::cout << "Backend iniciado! Aguardando conexoes..." << std::endl;
        std::cout << "Frontend Deve rodar ser iniciado, por padrao ta na porta 3000: http://localhost:3000" << std::endl;
        std::cout << std::endl;
        server.run();
        ioc.run();
    }
    catch (const std::exception& e) {
        std::cerr << "[FATAL] " << e.what() << std::endl;
        return 1;
    }
    return 0;
}